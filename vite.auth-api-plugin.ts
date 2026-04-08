import "dotenv/config";
import type { Connect } from "vite";
import type { Plugin } from "vite";
import { toNodeHandler } from "better-auth/node";
import { auth, mongoClient } from "./server/auth";

let connectPromise: Promise<void> | null = null;

function ensureMongo(): Promise<void> {
  if (!connectPromise) {
    connectPromise = mongoClient.connect().then(() => undefined);
  }
  return connectPromise;
}

/** Serves Better Auth at /api/auth on the same port as Vite (no separate process). */
export function authApiPlugin(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    const handler = toNodeHandler(auth);
    middlewares.use((req, res, next) => {
      const path = (req.url ?? "").split("?")[0] ?? "";
      if (!path.startsWith("/api/auth")) {
        next();
        return;
      }
      ensureMongo()
        .then(() => handler(req, res))
        .catch(next);
    });
  };

  return {
    name: "gelos-auth-api",
    configureServer(server) {
      mount(server.middlewares);
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
    },
  };
}
