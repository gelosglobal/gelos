import "dotenv/config";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth, getCorsOrigins, mongoClient } from "./auth";

const app = express();
const port = Number(process.env.AUTH_PORT ?? 3005);

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
  }),
);

app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gelos-auth" });
});

async function main() {
  await mongoClient.connect();
  app.listen(port, () => {
    console.log(`[auth] http://localhost:${port}  (MongoDB: connected)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
