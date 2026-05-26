const isDev = process.env.NODE_ENV !== "production";
const AUTH_DEBUG_STORAGE_KEY = "consejos.debug.auth";

function hasVerboseLoggingEnabled() {
  if (isDev || process.env.NEXT_PUBLIC_DEBUG_AUTH === "true") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storedValue = window.localStorage.getItem(AUTH_DEBUG_STORAGE_KEY)
      ?? window.sessionStorage.getItem(AUTH_DEBUG_STORAGE_KEY);

    return storedValue === "1" || storedValue === "true";
  } catch {
    return false;
  }
}

function emitLog(level: "error" | "warn" | "info", scope: string, message: string, details?: unknown) {
  if (level !== "error" && !hasVerboseLoggingEnabled()) {
    return;
  }

  const sink = (console[level] ?? console.log).bind(console) as (...args: unknown[]) => void;
  if (details === undefined) {
    sink(`[${scope}]`, message);
    return;
  }

  sink(`[${scope}]`, message, details);
}

export const logger = {
  error: (scope: string, message: string, details?: unknown) => {
    emitLog("error", scope, message, details);
  },
  warn: (scope: string, message: string, details?: unknown) => {
    emitLog("warn", scope, message, details);
  },
  info: (scope: string, message: string, details?: unknown) => {
    emitLog("info", scope, message, details);
  },
};
