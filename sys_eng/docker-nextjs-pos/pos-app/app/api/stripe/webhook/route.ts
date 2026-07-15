import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import {
  CheckoutStatus,
  OrderStatus,
  PaymentStatus,
  PaymentTransactionType,
  TableSessionStatus,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
}

// Stripe calls this endpoint asynchronously after hosted Checkout changes state.
// On completion, this is the source of truth that marks local orders as paid.
async function markCheckoutPaid(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    return;
  }

  const checkoutId = Number(session.metadata?.checkoutId ?? session.client_reference_id);

  if (!Number.isInteger(checkoutId)) {
    throw new Error("Stripe checkout session is missing checkout metadata.");
  }

  const paymentIntentId = getPaymentIntentId(session);
  const paidAt = new Date();
  const checkout = await prisma.checkout.findUnique({
    where: { id: checkoutId },
    include: {
      orders: {
        select: { id: true },
      },
    },
  });

  if (!checkout) {
    throw new Error(`Checkout ${checkoutId} was not found.`);
  }

  await prisma.$transaction([
    prisma.checkout.update({
      where: { id: checkout.id },
      data: {
        status: CheckoutStatus.PAID,
        paidAt,
        stripePaymentIntentId: paymentIntentId,
      },
    }),
    prisma.payment.updateMany({
      where: { checkoutId: checkout.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt,
        providerPaymentId: paymentIntentId ?? session.id,
      },
    }),
    prisma.order.updateMany({
      where: {
        id: {
          in: checkout.orders.map((order) => order.id),
        },
      },
      data: {
        status: OrderStatus.PAID,
        paidAt,
      },
    }),
    prisma.tableSession.update({
      where: { id: checkout.tableSessionId },
      data: {
        status: TableSessionStatus.CHECKED_OUT,
        closedAt: paidAt,
      },
    }),
  ]);
}

async function markTakeoutPaymentPaid(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    return;
  }

  const paymentIntentId = getPaymentIntentId(session);
  const paidAt = new Date();

  await prisma.payment.updateMany({
    where: {
      transactionType: PaymentTransactionType.TAKEOUT,
      providerPaymentId: {
        in: [paymentIntentId, session.id].filter((id): id is string => Boolean(id)),
      },
    },
    data: {
      status: PaymentStatus.PAID,
      paidAt,
      providerPaymentId: paymentIntentId ?? session.id,
    },
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { message: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeClient();
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret(),
    );

    switch (event.type) {
      case "checkout.session.completed":
        if (event.data.object.metadata?.checkoutType === "takeout") {
          await markTakeoutPaymentPaid(event.data.object as Stripe.Checkout.Session);
        } else {
          await markCheckoutPaid(event.data.object as Stripe.Checkout.Session);
        }
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not process Stripe webhook.",
      },
      { status: 400 },
    );
  }
}
