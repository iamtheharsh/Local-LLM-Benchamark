// Logging utility for the application

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
};

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000;
    this.currentLevel = LOG_LEVELS.INFO;
  }

  log(level, category, message, data = null) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    this.logs.push(logEntry);

    // Keep logs within max limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[${level}] ${category}: ${message}`, data || "");
    }

    return logEntry;
  }

  debug(category, message, data) {
    return this.log("DEBUG", category, message, data);
  }

  info(category, message, data) {
    return this.log("INFO", category, message, data);
  }

  warning(category, message, data) {
    return this.log("WARNING", category, message, data);
  }

  error(category, message, data) {
    return this.log("ERROR", category, message, data);
  }

  critical(category, message, data) {
    return this.log("CRITICAL", category, message, data);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  setLogLevel(level) {
    this.currentLevel = level;
  }
}

export const logger = new Logger();
