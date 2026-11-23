import { createLogger } from "@/lib/logger";

export const logger = createLogger("app");

export function logInfo(message: string, meta?: Record<string, unknown>) {
  logger.info(message, meta);
}

export function logError(message: string, error?: unknown, meta?: Record<string, unknown>) {
  logger.error(message, error, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  logger.warn(message, meta);
}
