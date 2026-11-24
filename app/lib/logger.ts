type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: unknown) {
  const line = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta === undefined ? {} : { meta }),
  };

  const serialized = JSON.stringify(line, (_key, value) => {
    if (value instanceof Error) {
      return { name: value.name, message: value.message };
    }
    return value;
  });

  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
};

export function logInfo(message: string, meta?: unknown) {
  logger.info(message, meta);
}

export function logWarn(message: string, meta?: unknown) {
  logger.warn(message, meta);
}

export function logError(message: string, error?: unknown, meta?: unknown) {
  logger.error(message, { ...(typeof meta === "object" && meta ? meta : {}), error });
}
