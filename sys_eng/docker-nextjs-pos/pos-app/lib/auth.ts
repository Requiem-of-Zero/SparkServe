import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const appleClientId = process.env.APPLE_CLIENT_ID;
const appleClientSecret = process.env.APPLE_CLIENT_SECRET;

// Server-side auth configuration for employee login and sessions.
export const auth = betterAuth({
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
