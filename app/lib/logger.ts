export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }),
    );
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        ...meta,
      }),
    );
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }),
    );
  },
};

export function logInfo(message: string, meta?: Record<string, unknown>) {
  logger.info(message, meta);
}

export function logError(message: string, error?: unknown, meta?: Record<string, unknown>) {
  logger.error(message, error, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  logger.warn(message, meta);
}
