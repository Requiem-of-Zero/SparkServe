import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import {
  calculateOrderTotals,
  calculatePlatformFeeCents,
} from "@/lib/checkout";
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentTransactionType,
  TakeoutSessionStatus,
} from "@/lib/generated/prisma/enums";
import { notifyKitchenQueueChanged } from "@/lib/kitchen-realtime";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

type TakeoutCheckoutItem = {
  menuItemId: number;
  quantity: number;
  note: string | null;
  removedIngredientIds: number[];
};

const allowedSpiceNotes = new Set(["Spice: Mild", "Spice: Medium", "Spice: Hot"]);

function toStripeCurrency(value: string | null | undefined) {
  return (value || "usd").toLowerCase();
}

function buildReturnUrl({
  origin,
  status,
}: {
  origin: string;
  status: "success" | "cancel";
}) {
  return `${origin}/takeout?checkout=${status}&session_id={CHECKOUT_SESSION_ID}`;
}

function parseTakeoutItems(body: unknown): TakeoutCheckoutItem[] {
  if (!body || typeof body !== "object" || !("items" in body)) {
    throw new Error("Takeout checkout requires items.");
  }

  const items = (body as { items: unknown }).items;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Takeout checkout requires at least one item.");
  }

  return items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid takeout item.");
    }

    const menuItemId = Number((item as { menuItemId?: unknown }).menuItemId);
    const quantity = Number((item as { quantity?: unknown }).quantity);
    const rawNote = (item as { note?: unknown }).note;
    const rawRemovedIngredientIds = (item as {
      removedIngredientIds?: unknown;
    }).removedIngredientIds;

    if (!Number.isInteger(menuItemId) || menuItemId < 1) {
      throw new Error("Invalid menu item.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error("Quantity must be between 1 and 20.");
    }

    return {
      menuItemId,
      quantity,
      note:
        typeof rawNote === "string" && rawNote.trim()
          ? rawNote.trim().slice(0, 160)
          : null,
      removedIngredientIds: Array.isArray(rawRemovedIngredientIds)
        ? Array.from(
            new Set(
              rawRemovedIngredientIds
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0),
            ),
          ).slice(0, 20)
        : [],
    };
  });
}

function createPublicToken() {
  return randomBytes(18).toString("base64url");
}

async function createUniqueTakeoutToken() {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const publicToken = createPublicToken();
    const existingSession = await prisma.takeoutSession.findUnique({
      where: { publicToken },
    });

    if (!existingSession) {
      return publicToken;
    }
  }

  throw new Error("Could not create a unique takeout session token.");
}

// Creates a Stripe Checkout Session for a private takeout cart. Prices are
// rebuilt from the menu database so the browser can only request item IDs.
export async function POST(request: NextRequest) {
  try {
    const items = parseTakeoutItems(await request.json());
    const menuItemIds = Array.from(new Set(items.map((item) => item.menuItemId)));

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        active: true,
      },
      include: {
        translations: {
          where: { locale: "en" },
        },
        ingredients: {
          include: { ingredient: true },
        },
      },
    });
    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { message: "One or more menu items are no longer available." },
        { status: 400 },
      );
    }

    const checkoutLines = items.map((item) => {
      const menuItem = menuItemById.get(item.menuItemId);

      if (!menuItem) {
        throw new Error("One or more menu items are no longer available.");
      }

      const removedIngredientNames = menuItem.ingredients
        .filter(
          (entry) =>
            entry.removable &&
            entry.ingredient.commonAllergen &&
            item.removedIngredientIds.includes(entry.ingredientId),
        )
        .map((entry) => entry.ingredient.name);
      const removedIngredientIds = menuItem.ingredients
        .filter(
          (entry) =>
            entry.removable &&
            entry.ingredient.commonAllergen &&
            item.removedIngredientIds.includes(entry.ingredientId),
        )
        .map((entry) => entry.ingredientId);

      return {
        ...item,
        note:
          menuItem.spicy && item.note && allowedSpiceNotes.has(item.note)
            ? item.note
            : null,
        menuItem,
        removedIngredientIds,
        removedIngredientNames:
          removedIngredientNames.length > 0
            ? removedIngredientNames.join(", ")
            : null,
      };
    });

    const restaurantSettings = await prisma.restaurantSettings.findUnique({
      where: { id: 1 },
      include: { paymentSettings: true },
    });
    const currency = toStripeCurrency(restaurantSettings?.currency);
    const taxRate = Number(restaurantSettings?.taxRate ?? 0);
    const totals = calculateOrderTotals({
      lines: checkoutLines.map((line) => ({
        quantity: line.quantity,
        unitPriceCents: line.menuItem.priceCents,
      })),
      taxRate,
    });
    const platformFeeBasisPoints =
      restaurantSettings?.paymentSettings?.platformFeeBasisPoints ?? 0;
    const platformFeeCents = calculatePlatformFeeCents({
      totalCents: totals.totalCents,
      basisPoints: platformFeeBasisPoints,
    });
    const connectedAccountId =
      restaurantSettings?.paymentSettings?.stripeConnectedAccountId ??
      process.env.STRIPE_CONNECTED_ACCOUNT_ID;
    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData =
      {
        description: "Ablaze takeout order",
        metadata: {
          checkoutType: "takeout",
          menuItemIds: menuItemIds.join(","),
        },
      };
    const submittedAt = new Date();
    const takeoutSession = await prisma.takeoutSession.create({
      data: {
        publicToken: await createUniqueTakeoutToken(),
        status: TakeoutSessionStatus.SUBMITTED,
        submittedAt,
        items: {
          createMany: {
            data: checkoutLines.map((line) => ({
              menuItemId: line.menuItemId,
              quantity: line.quantity,
              note: line.note,
              removedIngredientIds: line.removedIngredientIds,
            })),
          },
        },
      },
    });

    paymentIntentData.metadata = {
      ...paymentIntentData.metadata,
      takeoutSessionId: String(takeoutSession.id),
    };

    if (connectedAccountId) {
      paymentIntentData.transfer_data = {
        destination: connectedAccountId,
      };

      if (platformFeeCents > 0) {
        paymentIntentData.application_fee_amount = platformFeeCents;
      }
    }

    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      checkoutLines.map((line) => {
        const translation = line.menuItem.translations[0];
        const description = [
          line.removedIngredientNames
            ? `No ${line.removedIngredientNames}`
            : null,
          line.note ? `Note: ${line.note}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return {
          quantity: line.quantity,
          price_data: {
            currency,
            unit_amount: line.menuItem.priceCents,
            product_data: {
              name: translation?.name ?? `Menu item #${line.menuItemId}`,
              description: description || undefined,
              metadata: {
                menuItemId: String(line.menuItemId),
                checkoutType: "takeout",
              },
            },
          },
        };
      });

    if (totals.taxCents > 0) {
      stripeLineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: totals.taxCents,
          product_data: {
            name: "Estimated tax",
            metadata: {
              checkoutType: "takeout",
              lineType: "tax",
            },
          },
        },
      });
    }

    const stripe = getStripeClient();
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: buildReturnUrl({
        origin: request.nextUrl.origin,
        status: "success",
      }),
      cancel_url: buildReturnUrl({
        origin: request.nextUrl.origin,
        status: "cancel",
      }),
      line_items: stripeLineItems,
      payment_intent_data: paymentIntentData,
      metadata: {
        checkoutType: "takeout",
        takeoutSessionId: String(takeoutSession.id),
        subtotalCents: String(totals.subtotalCents),
        taxCents: String(totals.taxCents),
        totalCents: String(totals.totalCents),
        platformFeeCents: String(platformFeeCents),
      },
    });
    const providerPaymentId =
      typeof stripeSession.payment_intent === "string"
        ? stripeSession.payment_intent
        : stripeSession.id;

    await prisma.payment.create({
      data: {
        status: PaymentStatus.PENDING,
        method: PaymentMethod.CUSTOMER_ONLINE_CARD,
        provider: PaymentProvider.STRIPE,
        transactionType: PaymentTransactionType.TAKEOUT,
        amountCents: totals.totalCents,
        platformFeeCents,
        providerPaymentId,
        providerAccountId: connectedAccountId,
      },
    });

    await notifyKitchenQueueChanged("takeout-submitted");

    return NextResponse.json({
      stripeCheckoutSessionId: stripeSession.id,
      url: stripeSession.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not create takeout checkout session.",
      },
      { status: 500 },
    );
  }
}
