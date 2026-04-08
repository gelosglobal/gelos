import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Dev: Vite UI only; /api/auth is proxied to Express (pnpm dev runs both). */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/auth": {
        target: "http://127.0.0.1:3005",
        changeOrigin: false,
      },
    },
  },
});
