import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";

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

  // Username is our owner-distributed 6-digit employee login code.
  // The employee still uses a password, which Better Auth stores as a hash.
  plugins: [
    username({
      minUsernameLength: 6,
      maxUsernameLength: 6,
      usernameValidator: (value) => /^\d{6}$/.test(value),
      displayUsernameValidator: (value) => /^\d{6}$/.test(value),
      usernameNormalization: false,
      displayUsernameNormalization: false,
    }),
    nextCookies(),
  ],
});
