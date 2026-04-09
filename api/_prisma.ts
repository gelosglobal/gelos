import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prismaApi: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prismaApi ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prismaApi = prisma;

