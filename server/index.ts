import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth, getCorsOrigins, mongoClient } from "./auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../dist");

const app = express();
const port = Number(process.env.PORT ?? process.env.AUTH_PORT ?? 3005);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
  }),
);

const authHandler = toNodeHandler(auth);
app.use((req, res, next) => {
  const p = (req.url ?? "/").split("?")[0] ?? "/";
  if (!p.startsWith("/api/auth")) {
    next();
    return;
  }
  Promise.resolve(authHandler(req, res)).catch(next);
});

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gelos-os" });
});

const hasDist = fs.existsSync(path.join(distDir, "index.html"));
if (hasDist) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

async function main() {
  await mongoClient.connect();
  app.listen(port, () => {
    const where = hasDist ? `+ static from dist/` : "(API only — run Vite separately or build first)";
    console.log(`[gelos] http://localhost:${port}  ${where}  MongoDB: connected`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
