export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export function createLogger(prefix: string, level?: LogLevel): Logger {
  const minLevel = LOG_LEVELS[level ?? (process.env['AIDD_LOG_LEVEL'] as LogLevel) ?? 'info'];

  function log(msgLevel: LogLevel, message: string, data?: unknown): void {
    if (LOG_LEVELS[msgLevel] < minLevel) return;

    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${prefix}] [${msgLevel.toUpperCase()}] ${message}`;

    if (msgLevel === 'error') {
      console.error(entry, data !== undefined ? data : '');
    } else {
      console.error(entry, data !== undefined ? data : '');
    }
  }

  return {
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
  };
}
