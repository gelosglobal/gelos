import { createAuthClient } from "better-auth/react";

/** Empty baseURL = same origin as the page (Express serves UI + /api/auth). Set VITE_AUTH_URL only if API is on another host. */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? "",
});

export const { signIn, signUp, signOut, useSession } = authClient;
