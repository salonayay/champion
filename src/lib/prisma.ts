import { PrismaClient } from "@prisma/client";

// Why this file exists:
//
// In development, Next.js reloads your code every time you save a file. If we
// wrote `new PrismaClient()` directly in each file that needed it, every reload
// would open a fresh set of database connections and never close the old ones.
// After twenty saves you'd hit Neon's connection limit and everything breaks.
//
// So we stash one client on `globalThis` — the one object that survives a
// reload — and reuse it. In production there are no reloads, so we just make
// one normally.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
