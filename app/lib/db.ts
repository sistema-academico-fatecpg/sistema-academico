import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const adapter = new PrismaPg(
    process.env.DATABASE_URL ?? "postgresql://localhost:5432/sistema_academico",
  );

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type DatabaseClient = PrismaClient;
export type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
export type DbExecutor = DatabaseClient | TransactionClient;

export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(callback, {
    maxWait: 5_000,
    timeout: 15_000,
    isolationLevel: "Serializable",
  });
}
