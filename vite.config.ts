import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async ({ command }) => {
  const plugins = [react()];
  // Avoid loading MongoDB / Better Auth during `vite build` (e.g. Vercel CI without DB env).
  if (command !== "build") {
    const { authApiPlugin } = await import("./vite.auth-api-plugin");
    plugins.push(authApiPlugin());
  }
  return { plugins };
});
