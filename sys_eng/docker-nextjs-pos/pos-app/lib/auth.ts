import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const appleClientId = process.env.APPLE_CLIENT_ID;
const appleClientSecret = process.env.APPLE_CLIENT_SECRET;
const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const fallbackAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const allowedAuthHosts = Array.from(
  new Set(
    [fallbackAuthUrl, ...(trustedOrigins ?? [])].map((origin) => {
      try {
        return new URL(origin).host;
      } catch {
        return origin;
      }
    }),
  ),
);
const authProtocol = fallbackAuthUrl.startsWith("https://") ? "https" : "http";

// Server-side auth configuration for employee login and sessions.
export const auth = betterAuth({
  // OAuth state cookies must be created and read on the same host.
  // Dynamic baseURL lets localhost and LAN testing both work.
  baseURL: {
    allowedHosts: allowedAuthHosts,
    fallback: fallbackAuthUrl,
    protocol: authProtocol,
  },

  // Better Auth rejects browser origins that are not explicitly trusted.
  // This lets local dev work from both localhost and LAN URLs.
  trustedOrigins,

  // Store Better Auth users, sessions, accounts, and verification rows in Postgres.
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Enables password login. Better Auth stores password hashes, never plaintext passwords.
  emailAndPassword: {
    enabled: true,
    // Owner-created employee accounts should not auto-login while being created.
    autoSignIn: false,
  },

  // Links trusted OAuth logins to an existing user with the same email.
  // Example: a customer signs up with password, then later uses Google with that email.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
      updateUserInfoOnLink: true,
    },
  },

  // Customer OAuth providers. They are enabled only when env credentials exist.
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
    ...(appleClientId && appleClientSecret
      ? {
          apple: {
            clientId: appleClientId,
            clientSecret: appleClientSecret,
          },
        }
      : {}),
  },

  // Optional public username support for customer/community features.
  // Private employee login codes live on EmployeeProfile.loginCode instead.
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 25,
      usernameValidator: (value) => /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{2,24}$/.test(value),
      displayUsernameValidator: (value) =>
        value.trim().length >= 2 && value.trim().length <= 40,
      usernameNormalization: false,
      displayUsernameNormalization: (value) => value.trim(),
    }),
    nextCookies(),
  ],
});
