import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { calculateCheckoutTotals } from "@/lib/checkout";
import {
  CheckoutStatus,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentTransactionType,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

type StripeCheckoutRouteProps = {
  params: Promise<{
    token: string;
  }>;
};

function toStripeCurrency(value: string | null | undefined) {
  return (value || "usd").toLowerCase();
}

function buildReturnUrl({
  origin,
  token,
  status,
}: {
  origin: string;
  token: string;
  status: "success" | "cancel";
}) {
  return `${origin}/table/${token}?checkout=${status}&session_id={CHECKOUT_SESSION_ID}`;
}

// Creates one Stripe Checkout Session for all unpaid kitchen orders at a table.
export async function POST(request: NextRequest, { params }: StripeCheckoutRouteProps) {
  try {
    const { token } = await params;
    const tableSession = await prisma.tableSession.findUnique({
      where: { publicToken: token },
      select: { id: true, status: true },
    });

    if (!tableSession || tableSession.status !== "OPEN") {
      return NextResponse.json(
        { message: "Table session is not open." },
        { status: 400 },
      );
    }

    const existingCheckout = await prisma.checkout.findFirst({
      where: {
        tableSessionId: tableSession.id,
        status: CheckoutStatus.PENDING,
        stripeCheckoutUrl: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        stripeCheckoutUrl: true,
        stripeCheckoutSessionId: true,
      },
    });

    if (existingCheckout?.stripeCheckoutUrl) {
      return NextResponse.json({
        checkoutId: existingCheckout.id,
        stripeCheckoutSessionId: existingCheckout.stripeCheckoutSessionId,
        url: existingCheckout.stripeCheckoutUrl,
      });
    }

    const restaurantSettings = await prisma.restaurantSettings.findUnique({
      where: { id: 1 },
      include: { paymentSettings: true },
    });
    const currency = toStripeCurrency(restaurantSettings?.currency);
    const platformFeeBasisPoints =
      restaurantSettings?.paymentSettings?.platformFeeBasisPoints ?? 0;
    const connectedAccountId =
      restaurantSettings?.paymentSettings?.stripeConnectedAccountId ??
      process.env.STRIPE_CONNECTED_ACCOUNT_ID;
    const orders = await prisma.order.findMany({
      where: {
        tableSessionId: tableSession.id,
        checkoutId: null,
        paidAt: null,
        cancelledAt: null,
        status: {
          in: [OrderStatus.SENT_TO_KITCHEN, OrderStatus.READY_FOR_CHECKOUT],
        },
      },
      include: {
        items: true,
      },
      orderBy: { submittedAt: "asc" },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { message: "No submitted orders are ready for checkout." },
        { status: 400 },
      );
    }

    const totals = calculateCheckoutTotals({
      orders: orders.map((order) => ({
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        tipCents: order.tipCents,
        totalCents: order.totalCents,
      })),
      platformFeeBasisPoints,
    });
    const checkout = await prisma.checkout.create({
      data: {
        tableSessionId: tableSession.id,
        currency,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        tipCents: totals.tipCents,
        totalCents: totals.totalCents,
        platformFeeCents: totals.platformFeeCents,
        orders: {
          connect: orders.map((order) => ({ id: order.id })),
        },
      },
    });
    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData =
      {
        description: `SparkServe dine-in table checkout #${checkout.id}`,
        metadata: {
          checkoutType: "dine_in",
          checkoutId: String(checkout.id),
          tableSessionId: String(tableSession.id),
          orderIds: orders.map((order) => order.id).join(","),
        },
      };

    if (connectedAccountId) {
      paymentIntentData.transfer_data = {
        destination: connectedAccountId,
      };

      if (totals.platformFeeCents > 0) {
        paymentIntentData.application_fee_amount = totals.platformFeeCents;
      }
    }

    const stripe = getStripeClient();
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: String(checkout.id),
      success_url: buildReturnUrl({
        origin: request.nextUrl.origin,
        token,
        status: "success",
      }),
      cancel_url: buildReturnUrl({
        origin: request.nextUrl.origin,
        token,
        status: "cancel",
      }),
      line_items: orders.flatMap((order) =>
        order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency,
            unit_amount: item.unitPriceCents,
            product_data: {
              name: item.name,
              metadata: {
                orderId: String(order.id),
                orderItemId: String(item.id),
              },
            },
          },
        })),
      ),
      payment_intent_data: paymentIntentData,
      metadata: {
        checkoutType: "dine_in",
        checkoutId: String(checkout.id),
        tableSessionId: String(tableSession.id),
      },
    });

    await prisma.$transaction([
      prisma.checkout.update({
        where: { id: checkout.id },
        data: {
          stripeCheckoutSessionId: stripeSession.id,
          stripeCheckoutUrl: stripeSession.url,
          stripePaymentIntentId:
            typeof stripeSession.payment_intent === "string"
              ? stripeSession.payment_intent
              : null,
        },
      }),
      prisma.payment.create({
        data: {
          checkoutId: checkout.id,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.CUSTOMER_ONLINE_CARD,
          provider: PaymentProvider.STRIPE,
          transactionType: PaymentTransactionType.DINE_IN,
          amountCents: totals.totalCents,
          platformFeeCents: totals.platformFeeCents,
          providerPaymentId:
            typeof stripeSession.payment_intent === "string"
              ? stripeSession.payment_intent
              : stripeSession.id,
          providerAccountId: connectedAccountId,
        },
      }),
    ]);

    return NextResponse.json({
      checkoutId: checkout.id,
      stripeCheckoutSessionId: stripeSession.id,
      url: stripeSession.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not create Stripe checkout session.",
      },
      { status: 500 },
    );
  }
}
