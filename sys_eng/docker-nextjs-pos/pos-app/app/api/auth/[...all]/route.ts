import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Mounts Better Auth at /api/auth/* so it can handle sign-in, sign-out, and sessions.
export const { GET, POST } = toNextJsHandler(auth);
