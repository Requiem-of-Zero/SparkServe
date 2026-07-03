import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// Browser-side helper used by login/logout forms and session-aware components.
export const authClient = createAuthClient({
  // Exposes username sign-in methods for the 6-digit employee login code.
  plugins: [usernameClient()],
});
