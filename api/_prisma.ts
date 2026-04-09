import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prismaApi: PrismaClient | undefined;
}

export function getPrisma() {
  if (!globalThis.__prismaApi) {
    globalThis.__prismaApi = new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    });
  }
  return globalThis.__prismaApi;
}

