import type { Server, Socket } from "socket.io";
import { OrderStatus } from "../../lib/generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
  canCreateTableParticipant,
  resolveParticipantIdentity,
  type ParticipantIdentity,
} from "../../lib/table-participant-identity";
import { getSocketUser } from "./auth";
import { notifyFloor, notifyFloorCheckoutRequested } from "./floor-handlers";
import {
  getSafeGuestName,
  getSafeParticipantPublicId,
  getSafeUserId,
} from "./sanitizers";
import {
  type AddCartItemPayload,
  type AdjustCartItemPayload,
  type CartAckResponse,
  getMenuItemDisplayName,
  getOrderableTableSession,
  resolveRemovableIngredientIds,
  resolveStructuredKitchenNote,
} from "./table-cart";
import { createTableSessionParticipant } from "./table-participants";

type TableSessionHandlerContext = {
  io: Server;
  socket: Socket;
};

type CheckoutRequestAck = (
  response:
    | {
        ok: true;
        message: string;
      }
    | {
        ok: false;
        message: string;
      },
) => void;

const checkoutRequestOrderStatuses = [
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.READY_FOR_CHECKOUT,
];

// Registers table-session presence, shared cart, owner verification, and ownership-transfer events.
export function registerTableSessionHandlers({
  io,
  socket,
}: TableSessionHandlerContext) {
  socket.on(
    "table:join",
    async ({
      token,
      guestName,
      accountDisplayName: rawAccountDisplayName,
      isGuest,
      participantPublicId,
    }: {
      token: string;
      guestName?: string;
      accountDisplayName?: string;
      isGuest?: boolean;
      participantPublicId?: string;
    }) => {
      // Join is the identity handshake: it attaches this socket to a table room
      // and reconciles guest public id vs. optional loyalty account session.
      if (typeof token !== "string" || !token) {
        socket.emit("cart:error", {
          message: "Invalid table session.",
        });
        return;
      }

      const session = await prisma.tableSession.findUnique({
        where: { publicToken: token },
        include: { table: true },
      });

      if (!session || session.status !== "OPEN") {
        socket.emit("cart:error", {
          message: "Table session is not open.",
        });
        return;
      }

      const room = `table-session:${token}`;
      const tableLabel =
        session.table.label ?? `${session.table.row}${session.table.col}`;
      const safeGuestName = getSafeGuestName(guestName);
      const safeAccountDisplayName = getSafeGuestName(rawAccountDisplayName);
      const safeParticipantPublicId =
        getSafeParticipantPublicId(participantPublicId);
      const socketUser = await getSocketUser(socket);
      const safeUserId = getSafeUserId(socketUser?.id);
      const accountDisplayName =
        getSafeGuestName(socketUser?.name) ??
        getSafeGuestName(socketUser?.email) ??
        safeAccountDisplayName;
      const existingParticipants =
        await prisma.tableSessionParticipant.findMany({
          where: { tableSessionId: session.id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
      const identityDecision = resolveParticipantIdentity({
        tableSessionId: session.id,
        tableLabel,
        accountDisplayName,
        signedInUserId: safeUserId,
        savedParticipantPublicId: safeParticipantPublicId,
        existingParticipants: existingParticipants.map((participant) => ({
          id: participant.id,
          publicId: participant.publicId,
          tableSessionId: participant.tableSessionId,
          userId: participant.userId,
          displayName: participant.displayName,
          role: participant.role as ParticipantIdentity["role"],
        })),
      });

      if (
        identityDecision.action === "create" &&
        !canCreateTableParticipant({
          attendeeCount: session.attendeeCount,
          existingParticipantCount: existingParticipants.length,
        })
      ) {
        socket.emit("cart:error", {
          message:
            "This table session is at its attendee limit. Ask the owner or staff to update the party size.",
        });
        return;
      }

      const participant =
        identityDecision.action === "create"
          ? await createTableSessionParticipant({
              tableSessionId: session.id,
              displayNameBase:
                safeGuestName && identityDecision.isGuest
                  ? safeGuestName
                  : identityDecision.displayNameBase,
              isGuest: Boolean(isGuest) && identityDecision.isGuest,
              preferredPublicId: safeParticipantPublicId,
              userId: identityDecision.userId,
            })
          : identityDecision.action === "attach-account-to-device"
            ? await prisma.tableSessionParticipant.update({
                where: { id: identityDecision.participant.id },
                data: {
                  userId: identityDecision.userId,
                  displayName: identityDecision.displayName,
                },
              })
            : identityDecision.action === "refresh-account-name"
              ? await prisma.tableSessionParticipant.update({
                  where: { id: identityDecision.participant.id },
                  data: { displayName: identityDecision.displayName },
                })
              : identityDecision.action === "detach-account-from-device"
                ? await prisma.tableSessionParticipant.update({
                    where: { id: identityDecision.participant.id },
                    data: {
                      userId: null,
                      displayName: identityDecision.displayName,
                    },
                  })
                : identityDecision.action === "restore-guest-name"
                  ? await prisma.tableSessionParticipant.update({
                      where: { id: identityDecision.participant.id },
                      data: { displayName: identityDecision.displayName },
                    })
                  : (existingParticipants.find(
                      (participant) =>
                        participant.id === identityDecision.participant.id,
                    ) ?? identityDecision.participant);

      socket.join(room);

      socket.emit("table:joined", {
        room,
        socketId: socket.id,
        participantPublicId: participant.publicId,
        guestName: participant.displayName,
        participantRole: participant.role,
      });

      socket.to(room).emit("table:participant-joined", {
        guestName: participant.displayName,
      });
      notifyFloor(io, "participant-joined");

      console.log(`${participant.displayName} joined ${room}`);
    },
  );

  socket.on(
    "cart:add-item",
    async (
      {
        token,
        menuItemId,
        quantity,
        note: rawNote,
        removedIngredientIds: rawRemovedIngredientIds,
        guestName,
      }: AddCartItemPayload,
      ack?: (response: CartAckResponse) => void,
    ) => {
      try {
        // Adding an already-present menu item increments the shared cart row.
        const safeQuantity = quantity ?? 1;

        if (
          typeof token !== "string" ||
          !Number.isInteger(menuItemId) ||
          !Number.isInteger(safeQuantity) ||
          safeQuantity < 1 ||
          safeQuantity > 20
        ) {
          ack?.({ ok: false, message: "Invalid cart item request." });
          socket.emit("cart:error", {
            message: "Invalid cart item request.",
          });
          return;
        }

        const note = await resolveStructuredKitchenNote({
          menuItemId,
          rawNote,
        });
        const removedIngredientIds = await resolveRemovableIngredientIds({
          menuItemId,
          rawRemovedIngredientIds,
        });
        const orderableSession = await getOrderableTableSession(token);

        if (!orderableSession.ok) {
          ack?.({ ok: false, message: orderableSession.message });
          socket.emit("cart:error", {
            message: orderableSession.message,
          });
          return;
        }

        const { session } = orderableSession;

        const existingItem = await prisma.tableSessionItem.findFirst({
          where: {
            tableSessionId: session.id,
            menuItemId,
            note,
            removedIngredientIds: { equals: removedIngredientIds },
          },
        });

        const item = existingItem
          ? await prisma.tableSessionItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: Math.min(existingItem.quantity + safeQuantity, 99),
              },
              include: {
                menuItem: {
                  include: {
                    translations: {
                      where: { locale: "en" },
                    },
                  },
                },
              },
            })
          : await prisma.tableSessionItem.create({
              data: {
                tableSessionId: session.id,
                menuItemId,
                quantity: safeQuantity,
                note,
                removedIngredientIds,
              },
              include: {
                menuItem: {
                  include: {
                    translations: {
                      where: { locale: "en" },
                    },
                  },
                },
              },
            });

        const room = `table-session:${token}`;
        const name = getMenuItemDisplayName(item);

        if (existingItem) {
          io.to(room).emit("cart:item-updated", {
            itemId: item.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            name,
            guestName: getSafeGuestName(guestName),
          });
        } else {
          io.to(room).emit("cart:item-added", {
            itemId: item.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            name,
            guestName: getSafeGuestName(guestName),
          });
        }

        notifyFloor(io, "cart-changed");
        ack?.({ ok: true });
      } catch (error) {
        console.error("cart:add-item failed", error);

        ack?.({ ok: false, message: "Could not add item." });
        socket.emit("cart:error", {
          message: "Could not add item.",
        });
      }
    },
  );

  socket.on(
    "cart:increment-item",
    async (
      { token, itemId, guestName }: AdjustCartItemPayload,
      ack?: (response: CartAckResponse) => void,
    ) => {
      try {
        if (typeof token !== "string" || !Number.isInteger(itemId)) {
          ack?.({ ok: false, message: "Invalid cart item request." });
          socket.emit("cart:error", {
            message: "Invalid cart item request.",
          });
          return;
        }

        const orderableSession = await getOrderableTableSession(token);

        if (!orderableSession.ok) {
          ack?.({ ok: false, message: orderableSession.message });
          socket.emit("cart:error", {
            message: orderableSession.message,
          });
          return;
        }

        const { session } = orderableSession;

        const existingItem = await prisma.tableSessionItem.findUnique({
          where: { id: itemId },
        });

        if (!existingItem || existingItem.tableSessionId !== session.id) {
          ack?.({
            ok: false,
            message: "Cart item was not found for this table.",
          });
          socket.emit("cart:error", {
            message: "Cart item was not found for this table.",
          });
          return;
        }

        const item = await prisma.tableSessionItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: Math.min(existingItem.quantity + 1, 99),
          },
          include: {
            menuItem: {
              include: {
                translations: {
                  where: { locale: "en" },
                },
              },
            },
          },
        });

        io.to(`table-session:${token}`).emit("cart:item-updated", {
          itemId: item.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          name: getMenuItemDisplayName(item),
          guestName: getSafeGuestName(guestName),
        });
        notifyFloor(io, "cart-changed");
        ack?.({ ok: true });
      } catch (error) {
        console.error("cart:increment-item failed", error);

        ack?.({ ok: false, message: "Could not update item." });
        socket.emit("cart:error", {
          message: "Could not update item.",
        });
      }
    },
  );

  socket.on(
    "cart:decrement-item",
    async (
      { token, itemId, guestName }: AdjustCartItemPayload,
      ack?: (response: CartAckResponse) => void,
    ) => {
      try {
        if (typeof token !== "string" || !Number.isInteger(itemId)) {
          ack?.({ ok: false, message: "Invalid cart item request." });
          socket.emit("cart:error", {
            message: "Invalid cart item request.",
          });
          return;
        }

        const orderableSession = await getOrderableTableSession(token);

        if (!orderableSession.ok) {
          ack?.({ ok: false, message: orderableSession.message });
          socket.emit("cart:error", {
            message: orderableSession.message,
          });
          return;
        }

        const { session } = orderableSession;

        const existingItem = await prisma.tableSessionItem.findUnique({
          where: { id: itemId },
          include: {
            menuItem: {
              include: {
                translations: {
                  where: { locale: "en" },
                },
              },
            },
          },
        });

        if (!existingItem || existingItem.tableSessionId !== session.id) {
          ack?.({
            ok: false,
            message: "Cart item was not found for this table.",
          });
          socket.emit("cart:error", {
            message: "Cart item was not found for this table.",
          });
          return;
        }

        if (existingItem.quantity > 1) {
          const item = await prisma.tableSessionItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity - 1,
            },
            include: {
              menuItem: {
                include: {
                  translations: {
                    where: { locale: "en" },
                  },
                },
              },
            },
          });

          io.to(`table-session:${token}`).emit("cart:item-updated", {
            itemId: item.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            name: getMenuItemDisplayName(item),
            guestName: getSafeGuestName(guestName),
          });
          notifyFloor(io, "cart-changed");
          ack?.({ ok: true });
          return;
        }

        await prisma.tableSessionItem.delete({
          where: { id: existingItem.id },
        });

        io.to(`table-session:${token}`).emit("cart:item-removed", {
          itemId: existingItem.id,
          menuItemId: existingItem.menuItemId,
          name: getMenuItemDisplayName(existingItem),
          guestName: getSafeGuestName(guestName),
        });
        notifyFloor(io, "cart-changed");
        ack?.({ ok: true });
      } catch (error) {
        console.error("cart:decrement-item failed", error);

        ack?.({ ok: false, message: "Could not update item." });
        socket.emit("cart:error", {
          message: "Could not update item.",
        });
      }
    },
  );

  socket.on("table:owner-verified", ({ token }: { token?: string }) => {
    if (typeof token !== "string" || !token) {
      socket.emit("cart:error", {
        message: "Invalid table session.",
      });
      return;
    }

    io.to(`table-session:${token}`).emit("table:owner-verified");
    notifyFloor(io, "owner-verified");
  });

  socket.on("table:owner-claimed", ({ token }: { token?: string }) => {
    if (typeof token !== "string" || !token) {
      socket.emit("cart:error", {
        message: "Invalid table session.",
      });
      return;
    }

    io.to(`table-session:${token}`).emit("table:owner-claimed");
    notifyFloor(io, "participant-joined");
  });

  socket.on(
    "table:ownership-transfer-requested",
    ({ token }: { token?: string }) => {
      if (typeof token !== "string" || !token) {
        socket.emit("cart:error", {
          message: "Invalid table session.",
        });
        return;
      }

      io.to(`table-session:${token}`).emit(
        "table:ownership-transfer-requested",
      );
      notifyFloor(io, "participant-joined");
    },
  );

  socket.on(
    "table:ownership-transfer-responded",
    ({ token }: { token?: string }) => {
      if (typeof token !== "string" || !token) {
        socket.emit("cart:error", {
          message: "Invalid table session.",
        });
        return;
      }

      io.to(`table-session:${token}`).emit(
        "table:ownership-transfer-responded",
      );
      notifyFloor(io, "participant-joined");
    },
  );

  socket.on(
    "table:checkout-requested",
    async (
      {
        token,
        participantPublicId,
      }: {
        token?: unknown;
        participantPublicId?: unknown;
      },
      ack?: CheckoutRequestAck,
    ) => {
      if (typeof token !== "string" || !token) {
        ack?.({ ok: false, message: "Invalid table session." });
        socket.emit("cart:error", {
          message: "Invalid table session.",
        });
        return;
      }

      const safeParticipantPublicId =
        getSafeParticipantPublicId(participantPublicId);

      if (!safeParticipantPublicId) {
        ack?.({ ok: false, message: "Join this table before requesting checkout." });
        socket.emit("cart:error", {
          message: "Join this table before requesting checkout.",
        });
        return;
      }

      try {
        const session = await prisma.tableSession.findUnique({
          where: { publicToken: token },
          include: {
            orders: {
              where: {
                paidAt: null,
                cancelledAt: null,
                status: {
                  in: checkoutRequestOrderStatuses,
                },
              },
              select: {
                totalCents: true,
              },
            },
            table: true,
          },
        });

        if (!session || session.status !== "OPEN") {
          ack?.({ ok: false, message: "Table session is not open." });
          socket.emit("cart:error", {
            message: "Table session is not open.",
          });
          return;
        }

        const participant = await prisma.tableSessionParticipant.findUnique({
          where: { publicId: safeParticipantPublicId },
          select: {
            displayName: true,
            tableSessionId: true,
          },
        });

        if (!participant || participant.tableSessionId !== session.id) {
          ack?.({
            ok: false,
            message: "Join this table before requesting checkout.",
          });
          socket.emit("cart:error", {
            message: "Join this table before requesting checkout.",
          });
          return;
        }

        if (session.orders.length === 0) {
          ack?.({
            ok: false,
            message: "Send an order to the kitchen before requesting checkout.",
          });
          socket.emit("cart:error", {
            message: "Send an order to the kitchen before requesting checkout.",
          });
          return;
        }

        const tableLabel =
          session.table.label ?? `${session.table.row}${session.table.col}`;
        const unpaidTotalCents = session.orders.reduce(
          (sum, order) => sum + order.totalCents,
          0,
        );
        const requestedAt = new Date().toISOString();

        notifyFloorCheckoutRequested(io, {
          orderCount: session.orders.length,
          requestedAt,
          requestedBy: participant.displayName,
          tableLabel,
          tableSessionId: session.id,
          token,
          unpaidTotalCents,
        });

        io.to(`table-session:${token}`).emit("table:checkout-requested", {
          requestedBy: participant.displayName,
          tableLabel,
        });

        ack?.({
          ok: true,
          message: "A waiter has been notified for checkout.",
        });
      } catch (error) {
        console.error("Could not request table checkout", error);
        ack?.({
          ok: false,
          message: "Could not notify a waiter for checkout.",
        });
      }
    },
  );
}
