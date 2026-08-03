import type Stripe from "stripe";

export function toStripeCurrency(value: string | null | undefined) {
  return (value || "usd").toLowerCase();
}

export function getStripeConnectedAccountId(
  restaurantConnectedAccountId: string | null | undefined,
) {
  return restaurantConnectedAccountId ?? process.env.STRIPE_CONNECTED_ACCOUNT_ID;
}

// Stripe Connect transfers and platform fees are attached to the PaymentIntent,
// not the Checkout Session itself.
export function applyStripeConnectTransfer({
  connectedAccountId,
  paymentIntentData,
  platformFeeCents,
}: {
  connectedAccountId: string | null | undefined;
  paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData;
  platformFeeCents: number;
}) {
  if (!connectedAccountId) {
    return;
  }

  paymentIntentData.transfer_data = {
    destination: connectedAccountId,
  };

  if (platformFeeCents > 0) {
    paymentIntentData.application_fee_amount = platformFeeCents;
  }
}
