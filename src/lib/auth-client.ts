import { createAuthClient } from "better-auth/react";

/** Dev: empty baseURL → same origin (Vite :5173, /api/auth proxied to Express). Prod: set VITE_AUTH_URL only if API is on another host. */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? "",
});

export const { signIn, signUp, signOut, useSession } = authClient;
