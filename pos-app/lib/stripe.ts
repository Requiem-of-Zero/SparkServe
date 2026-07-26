import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Stripe secret keys must only live on the server. Routes call this lazily so
// local development can still run non-payment pages without Stripe env vars.
export function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for checkout.");
  }

  stripeClient = new Stripe(secretKey);

  return stripeClient;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required for Stripe webhooks.");
  }

  return webhookSecret;
}
