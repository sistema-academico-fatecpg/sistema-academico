import { createLogger } from "@/lib/logger";

const logger = createLogger("db");

export async function withTransaction<T>(
  callback: (tx: Parameters<typeof db.$transaction>[0]) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    return callback(tx);
  });
}

export { db };
