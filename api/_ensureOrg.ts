import type { PrismaClient } from "@prisma/client";

/**
 * Ensure the app has an Organization to attach data to.
 * If none exists (fresh DB), auto-create a default org so the UI can work without manual setup.
 */
export async function ensureOrg(prisma: PrismaClient, orgIdFromQuery?: string) {
  if (orgIdFromQuery) {
    const org = await prisma.organization.findUnique({ where: { id: orgIdFromQuery }, select: { id: true, name: true } });
    if (org) return org;
  }

  const first = await prisma.organization.findFirst({ select: { id: true, name: true } });
  if (first) return first;

  // default org (idempotent)
  return await prisma.organization.upsert({
    where: { slug: "gelos" },
    create: { slug: "gelos", name: "Gelos" },
    update: {},
    select: { id: true, name: true },
  });
}

