import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string {
  let rawUrl = process.env.DATABASE_URL || '';
  if (!rawUrl) return '';

  // Ensure direct endpoint is used to prevent Neon pooler dropouts
  rawUrl = rawUrl.replace('-pooler', '');

  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('sslmode', 'require');
    parsed.searchParams.set('connection_limit', '20');
    parsed.searchParams.set('pool_timeout', '30');
    parsed.searchParams.set('connect_timeout', '20');
    return parsed.toString();
  } catch (e) {
    return rawUrl;
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
