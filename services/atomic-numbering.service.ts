import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma } from "@prisma/client";

export class AtomicNumberingService {
  /**
   * Generates a sequential, concurrency-safe voucher or entry number.
   * Utilizes MongoDB atomic increment via Prisma's upsert + increment operator.
   * 
   * Example: prefix = "JV-202627", returns "JV-202627-0001"
   */
  static async getNextSequence(
    dbOrTx: PrismaClient | Prisma.TransactionClient,
    prefix: string,
    padding: number = 4
  ): Promise<{ sequence: number; formattedNumber: string }> {
    if (!prefix || typeof prefix !== "string" || !prefix.trim()) {
      throw new Error("AtomicNumberingError: Counter prefix cannot be empty.");
    }

    const cleanPrefix = prefix.trim();

    // Prisma's upsert on MongoDB compiles to findAndModify / update with $inc and upsert: true.
    // This is strictly atomic in MongoDB and guarantees no duplicate sequence numbers under concurrency.
    const counter = await (dbOrTx as any).counter.upsert({
      where: { id: cleanPrefix },
      update: { sequence: { increment: 1 } },
      create: { id: cleanPrefix, sequence: 1 },
    });

    const seq: number = counter.sequence;
    const formattedNumber = `${cleanPrefix}-${seq.toString().padStart(padding, "0")}`;

    return { sequence: seq, formattedNumber };
  }

  /**
   * Returns current sequence without incrementing (read-only inspection).
   */
  static async peekCurrentSequence(
    db: PrismaClient | Prisma.TransactionClient = prisma,
    prefix: string
  ): Promise<number> {
    const counter = await (db as any).counter.findUnique({
      where: { id: prefix.trim() },
    });
    return counter ? counter.sequence : 0;
  }
}
