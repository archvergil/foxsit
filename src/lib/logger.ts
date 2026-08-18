type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const write = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  const safeContext = context ? { ...context } : undefined
  if (safeContext) {
    delete safeContext.token
    delete safeContext.password
    delete safeContext.email
  }

  const method = level === 'debug' ? 'debug' : level
  console[method](`[${level}] ${message}`, safeContext ?? '')
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    write('error', message, context),
}
