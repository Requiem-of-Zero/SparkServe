import Link from "next/link";

import { getCurrentSession } from "@/lib/employee-auth";
import { getTableSessionByToken } from "@/lib/table-sessions";
import { prisma } from "@/lib/prisma";
import { canTableAcceptOrders } from "@/lib/table-owner-verification";
import { TableIdentityProvider } from "./table-identity-context";
import { TableGuestWaitingPanel } from "./table-guest-waiting-panel";
import { TableLoginBar } from "./table-login-bar";
import { TableLiveClient } from "./table-live-client";
import { TableMenuSection } from "./table-menu-section";
import { TableOwnershipTransferPanel } from "./table-ownership-transfer-panel";
import { TableOwnerSetupPanel } from "./table-owner-setup-panel";
import { TableOrderSecurityPanel } from "./table-order-security-panel";
import { TableSessionItemQuantityControls } from "./table-session-item-quantity-controls";
import { SubmitCartToKitchenButton } from "./submit-cart-to-kitchen-button";
import { CheckoutButton } from "./checkout-button";

type TableSessionPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
      <path d="M3 4h2l2.4 11.5a2 2 0 0 0 2 1.5h7.7a2 2 0 0 0 1.9-1.4L21 8H6" />
    </svg>
  );
}

function getRemovedIngredientNames({
  ingredients,
  removedIngredientIds,
}: {
  ingredients: { ingredientId: number; ingredient: { name: string } }[];
  removedIngredientIds: number[];
}) {
  return ingredients
    .filter((entry) => removedIngredientIds.includes(entry.ingredientId))
    .map((entry) => entry.ingredient.name)
    .join(", ");
}

export default async function TableSessionPage({
  params,
}: TableSessionPageProps) {
  // Server-render the current table session snapshot, then client components
  // subscribe to Socket.IO updates and refresh this data when the cart changes.
  const { token } = await params;
  const session = await getTableSessionByToken(token);
  const authSession = await getCurrentSession();
  const user = authSession?.user;
  const tableLabel =
    session.table.label ?? `${session.table.row}${session.table.col}`;
  const accountDisplayName = user?.name || user?.email || undefined;
  const displayName = accountDisplayName || `${tableLabel} Guest`;
  const identityStorageKey = user?.id
    ? `samwo-table-identity:${token}:user:${user.id}`
    : `samwo-table-identity:${token}:guest`;
  const guestIdentityStorageKey = `samwo-table-identity:${token}:guest`;
  const verifiedOwner = await prisma.tableSessionParticipant.findFirst({
    where: {
      tableSessionId: session.id,
      role: "OWNER",
      phoneVerifiedAt: {
        not: null,
      },
    },
    select: { phoneVerifiedAt: true },
  });
  const canOrder = canTableAcceptOrders({
    sessionStatus: session.status,
    ownerPhoneVerifiedAt: verifiedOwner?.phoneVerifiedAt,
  });
  const participants = await prisma.tableSessionParticipant.findMany({
    where: { tableSessionId: session.id },
    orderBy: { createdAt: "asc" },
    select: {
      publicId: true,
      displayName: true,
      role: true,
    },
  });
  const pendingTransfers = await prisma.tableSessionOwnershipTransfer.findMany({
    where: {
      tableSessionId: session.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      targetParticipant: {
        select: { publicId: true },
      },
      requestedByParticipant: {
        select: { displayName: true },
      },
    },
  });

  const menuItems = await prisma.menuItem.findMany({
    where: {
      active: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
    include: {
      translations: {
        where: {
          locale: "en",
        },
      },
      ingredients: {
        orderBy: [{ sortOrder: "asc" }, { ingredient: { name: "asc" } }],
        include: { ingredient: true },
      },
    },
  });
  const unpaidOrders = session.orders.filter(
    (order) => order.status === "SENT_TO_KITCHEN" || order.status === "READY_FOR_CHECKOUT",
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <TableIdentityProvider
        initialDisplayName={displayName}
        accountDisplayName={accountDisplayName}
        initialCanOrder={canOrder}
        isSignedIn={Boolean(user)}
        storageKey={identityStorageKey}
        fallbackStorageKey={user?.id ? guestIdentityStorageKey : undefined}
      >
        <section className="mx-auto max-w-3xl">
          <Link
            href="/dev/table-qr"
            className="mb-4 inline-flex rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Back to table QR
          </Link>

          <TableLoginBar />

          <h1 className="text-3xl font-bold">
            Table {tableLabel}
          </h1>

          <p className="mt-2 text-zinc-400">Session status: {session.status}</p>
          <TableLiveClient token={token} />
          <TableOwnerSetupPanel token={token} />
          <TableOrderSecurityPanel
            token={token}
            orderVerificationRequired={session.orderVerificationRequired}
          />
          <TableOwnershipTransferPanel
            token={token}
            participants={participants}
            pendingTransfers={pendingTransfers.map((transfer) => ({
              id: transfer.id,
              targetParticipantPublicId: transfer.targetParticipant.publicId,
              requestedByDisplayName:
                transfer.requestedByParticipant.displayName,
            }))}
          />
          <TableGuestWaitingPanel />
          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <CartIcon />
              <span>Shared cart</span>
            </h2>

            {session.items.length === 0 ? (
              <p className="mt-3 text-zinc-400">No items added yet.</p>
            ) : (
              <>
              <ul className="mt-3 space-y-2">
                {session.items.map((item) => {
                  const translation = item.menuItem.translations.find(
                    (menuTranslation) => menuTranslation.locale === "en",
                  );
                  const name =
                    translation?.name ?? `Menu item #${item.menuItemId}`;
                  const removedIngredients = getRemovedIngredientNames({
                    ingredients: item.menuItem.ingredients,
                    removedIngredientIds: item.removedIngredientIds,
                  });

                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"
                    >
                      <span>
                        {name}
                        {removedIngredients ? (
                          <span className="mt-1 block text-xs text-amber-200">
                            No {removedIngredients}
                          </span>
                        ) : null}
                        {item.note ? (
                          <span className="mt-1 block text-xs text-zinc-400">
                            Note: {item.note}
                          </span>
                        ) : null}
                      </span>
                      <TableSessionItemQuantityControls
                        token={token}
                        itemId={item.id}
                        quantity={item.quantity}
                      />
                    </li>
                  );
                })}
              </ul>
              <SubmitCartToKitchenButton
                token={token}
                orderVerificationRequired={session.orderVerificationRequired}
              />
              </>
            )}
          </div>

          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-xl font-semibold">Submitted orders</h2>
            {unpaidOrders.length === 0 ? (
              <p className="mt-3 text-zinc-400">
                Send the cart to the kitchen before checkout.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {unpaidOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-md border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-zinc-300">
                        ${(order.totalCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                      {order.items.map((item) => (
                        <li key={item.id} className="space-y-1">
                          <div>
                            {item.quantity}x {item.name}
                          </div>
                          {item.removedIngredientIds.length > 0 &&
                          item.menuItem ? (
                            <div className="text-xs text-amber-200">
                              No{" "}
                              {getRemovedIngredientNames({
                                ingredients: item.menuItem.ingredients,
                                removedIngredientIds: item.removedIngredientIds,
                              })}
                            </div>
                          ) : null}
                          {item.note ? (
                            <div className="text-xs text-zinc-500">
                              Note: {item.note}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <CheckoutButton token={token} />
              </div>
            )}
          </div>
        </section>
        <TableMenuSection
          token={token}
          menuItems={menuItems.map((item) => {
            const translation = item.translations[0];

            return {
              id: item.id,
              priceCents: item.priceCents,
              categoryKey: item.categoryKey,
              imageUrl: item.imageUrl,
              spicy: item.spicy,
              name: translation?.name ?? `Menu item #${item.id}`,
              description: translation?.description ?? null,
              category: translation?.category ?? item.categoryKey ?? "Menu",
              ingredients: item.ingredients.map((entry) => ({
                id: entry.ingredient.id,
                name: entry.ingredient.name,
                commonAllergen: entry.ingredient.commonAllergen,
                allergenNote: entry.ingredient.allergenNote,
                removable: entry.removable,
              })),
            };
          })}
        />
      </TableIdentityProvider>
    </main>
  );
}
