import { createAuthClient } from "better-auth/react";

/** Proxied via Vite to the auth server — use same origin */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? "",
});

export const { signIn, signUp, signOut, useSession } = authClient;
