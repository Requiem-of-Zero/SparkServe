export type CustomerSocialProvider = {
  id: "google" | "apple";
  label: string;
};

// These flags are public because they only control whether buttons are visible.
// OAuth client secrets stay server-side in GOOGLE_CLIENT_SECRET / APPLE_CLIENT_SECRET.
export const customerSocialProviders: CustomerSocialProvider[] = [
  ...(process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true"
    ? [{ id: "google" as const, label: "Continue with Google" }]
    : []),
  ...(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === "true"
    ? [{ id: "apple" as const, label: "Continue with Apple" }]
    : []),
];
