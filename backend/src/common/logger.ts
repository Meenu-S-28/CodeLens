type LogContext = Record<string, unknown>;

function write(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  context?: LogContext
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === "WARN") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}

export const logger = {
  info(message: string, context?: LogContext): void {
    write("INFO", message, context);
  },

  warn(message: string, context?: LogContext): void {
    write("WARN", message, context);
  },

  error(message: string, context?: LogContext): void {
    write("ERROR", message, context);
  },
};