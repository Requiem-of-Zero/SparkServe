import "dotenv/config";

import { randomBytes } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { auth } from "../lib/auth";
import { TableSessionParticipantRole } from "../lib/generated/prisma/enums";
import { prisma } from "../lib/prisma";
import {
  resolveParticipantIdentity,
  type ParticipantIdentity,
} from "../lib/table-participant-identity";
import { canTableAcceptOrders } from "../lib/table-owner-verification";

const io = new Server(3001, {
  cors: {
    origin: ["http://localhost:3000", "http://192.168.1.58:3000"],
    credentials: true,
  },
});

// Sanitize any client-provided display value before it touches logs or the DB.
function getSafeGuestName(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const guestName = value.trim();

  if (!guestName) {
    return undefined;
  }

  return guestName.slice(0, 30);
}

// User ids come from Better Auth session cookies, not from browser payloads.
function getSafeUserId(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const userId = value.trim();

  if (!userId) {
    return undefined;
  }

  return userId.slice(0, 128);
}

// Socket.IO exposes raw handshake headers; Better Auth expects a Headers object.
function getSocketHeaders(headers: Record<string, string | string[] | undefined>) {
  const socketHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      socketHeaders.set(key, value.join(", "));
    } else if (value) {
      socketHeaders.set(key, value);
    }
  }

  return socketHeaders;
}

// Reads the logged-in customer account for this socket when cookies are present.
async function getSocketUser(socket: Socket) {
  const session = await auth.api.getSession({
    headers: getSocketHeaders(socket.handshake.headers),
  });

  return session?.user;
}

// Gives a new guest the next numbered label for the table session.
async function assignTableGuestName(
  tableSessionId: number,
  guestLabelBase: string,
) {
  const existingParticipantCount = await prisma.tableSessionParticipant.count({
    where: {
      tableSessionId,
    },
  });
  const nextGuestNumber = existingParticipantCount + 1;

  return `${guestLabelBase} ${nextGuestNumber}`;
}

// Public participant ids are stored in the browser and identify one table device.
function createParticipantPublicId() {
  return randomBytes(18).toString("base64url");
}

// Avoid rare collisions so public ids can be safely used as table participant handles.
async function createUniqueParticipantPublicId() {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const publicId = createParticipantPublicId();
    const existingParticipant = await prisma.tableSessionParticipant.findUnique({
      where: { publicId },
    });

    if (!existingParticipant) {
      return publicId;
    }
  }

  throw new Error("Could not create a unique participant id.");
}

// Creates a participant for a new browser/device joining the table session.
async function createTableSessionParticipant({
  tableSessionId,
  displayNameBase,
  isGuest,
  userId,
}: {
  tableSessionId: number;
  displayNameBase: string;
  isGuest: boolean;
  userId?: string;
}) {
  const existingParticipantCount = await prisma.tableSessionParticipant.count({
    where: { tableSessionId },
  });
  const role =
    existingParticipantCount === 0
      ? TableSessionParticipantRole.OWNER
      : TableSessionParticipantRole.GUEST;
  const displayName = isGuest
    ? await assignTableGuestName(tableSessionId, displayNameBase)
    : displayNameBase;

  return prisma.tableSessionParticipant.create({
    data: {
      tableSessionId,
      userId,
      publicId: await createUniqueParticipantPublicId(),
      displayName,
      role,
    },
  });
}

// The realtime payloads use the translated menu name for notifications.
function getMenuItemDisplayName(item: {
  menuItemId: number;
  menuItem: {
    translations: {
      name: string;
    }[];
  };
}) {
  return item.menuItem.translations[0]?.name ?? `Menu item #${item.menuItemId}`;
}

// Server-side order gate. This prevents a custom Socket.IO client from adding
// items before the table owner has verified the session phone/code.
async function getOrderableTableSession(token: string) {
  const session = await prisma.tableSession.findUnique({
    where: { publicToken: token },
    include: {
      participants: {
        where: { role: TableSessionParticipantRole.OWNER },
        select: { phoneVerifiedAt: true },
        take: 1,
      },
    },
  });

  if (!session || session.status !== "OPEN") {
    return {
      ok: false,
      message: "Table session is not open.",
    } as const;
  }

  if (
    !canTableAcceptOrders({
      sessionStatus: session.status,
      ownerPhoneVerifiedAt: session.participants[0]?.phoneVerifiedAt,
    })
  ) {
    return {
      ok: false,
      message: "Table owner must verify this session before ordering.",
    } as const;
  }

  return {
    ok: true,
    session,
  } as const;
}

type CartAckResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

type AddCartItemPayload = {
  token: string;
  menuItemId: number;
  quantity?: number;
  guestName?: string;
};

type AdjustCartItemPayload = {
  token: string;
  itemId: number;
  guestName?: string;
};

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("kitchen:join", () => {
    socket.join("kitchen");
    socket.emit("kitchen:joined");
    console.log(`${socket.id} joined kitchen queue`);
  });

  socket.on(
    "kitchen:notify",
    ({ reason }: { reason?: string } = {}) => {
      // This is an invalidation event, not source-of-truth order data.
      // Kitchen browsers refresh their server page and re-read Postgres.
      io.to("kitchen").emit("kitchen:refresh", {
        reason: typeof reason === "string" ? reason : "queue-updated",
      });
    },
  );

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
      const socketUser = await getSocketUser(socket);
      const safeUserId = getSafeUserId(socketUser?.id);
      const accountDisplayName =
        getSafeGuestName(socketUser?.name) ??
        getSafeGuestName(socketUser?.email) ??
        safeAccountDisplayName;
      const existingParticipants = await prisma.tableSessionParticipant.findMany({
        where: { tableSessionId: session.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const identityDecision = resolveParticipantIdentity({
        tableSessionId: session.id,
        tableLabel,
        accountDisplayName,
        signedInUserId: safeUserId,
        savedParticipantPublicId: getSafeGuestName(participantPublicId),
        existingParticipants: existingParticipants.map((participant) => ({
          id: participant.id,
          publicId: participant.publicId,
          tableSessionId: participant.tableSessionId,
          userId: participant.userId,
          displayName: participant.displayName,
          role: participant.role as ParticipantIdentity["role"],
        })),
      });

      const participant =
        identityDecision.action === "create"
          ? await createTableSessionParticipant({
              tableSessionId: session.id,
              displayNameBase:
                safeGuestName && identityDecision.isGuest
                  ? safeGuestName
                  : identityDecision.displayNameBase,
              isGuest: Boolean(isGuest) && identityDecision.isGuest,
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
                : existingParticipants.find(
                    (participant) =>
                      participant.id === identityDecision.participant.id,
                  ) ?? identityDecision.participant;

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

      console.log(`${participant.displayName} joined ${room}`);
    },
  );

  socket.on(
    "cart:add-item",
    async (
      { token, menuItemId, quantity, guestName }: AddCartItemPayload,
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
            note: null,
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
  });

  socket.on("table:owner-claimed", ({ token }: { token?: string }) => {
    if (typeof token !== "string" || !token) {
      socket.emit("cart:error", {
        message: "Invalid table session.",
      });
      return;
    }

    io.to(`table-session:${token}`).emit("table:owner-claimed");
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
    },
  );

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

console.log("Realtime server listening on http://192.168.1.58:3001");
