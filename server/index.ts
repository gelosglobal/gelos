import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth, getCorsOrigins, mongoClient } from "../api/lib/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../dist");

const app = express();
const port = Number(process.env.PORT ?? process.env.AUTH_PORT ?? 3005);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/**
 * better-call builds the Web Request URL from Host + proto. In dev, align with BETTER_AUTH_URL
 * (same Express port as the UI — no separate dev server).
 */
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    const raw = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3005";
    try {
      const u = new URL(raw);
      req.headers.host = u.host;
      req.headers["x-forwarded-proto"] = u.protocol.replace(":", "");
    } catch {
      /* keep incoming */
    }
    next();
    return;
  }
  const xf = req.headers["x-forwarded-host"];
  if (typeof xf === "string" && xf) {
    req.headers.host = xf.split(",")[0].trim();
  }
  const proto = req.headers["x-forwarded-proto"];
  if (typeof proto === "string" && proto) {
    req.headers["x-forwarded-proto"] = proto.split(",")[0].trim();
  }
  next();
});

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
  }),
);

const authHandler = toNodeHandler(auth);
app.use((req, res, next) => {
  const pathOnly = (req.originalUrl ?? req.url ?? "/").split("?")[0] ?? "/";
  if (!pathOnly.startsWith("/api/auth")) {
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
    const where = hasDist ? `+ static from dist/` : "(run pnpm run build, or pnpm dev for watch)";
    console.log(`[gelos] http://localhost:${port}  ${where}  MongoDB: connected`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
