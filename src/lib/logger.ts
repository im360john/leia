type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  component?: string
  action?: string
  userId?: string
  [key: string]: any
}

class Logger {
  private isDevelopment = import.meta.env.DEV
  private logLevel: LogLevel = 'debug'

  private getTimestamp(): string {
    return new Date().toISOString()
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.getTimestamp()
    const contextStr = context ? JSON.stringify(context) : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, context)
    
    // In development, use console methods for better debugging
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, error)
          break
        case 'info':
          console.info(formattedMessage, error)
          break
        case 'warn':
          console.warn(formattedMessage, error)
          break
        case 'error':
          console.error(formattedMessage, error)
          break
      }
    }

    // In production, you would send to a logging service
    // For POC, we'll store in localStorage for debugging
    if (!this.isDevelopment) {
      try {
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]')
        logs.push({
          timestamp: this.getTimestamp(),
          level,
          message,
          context,
          error: error?.message,
          stack: error?.stack
        })
        // Keep only last 100 logs to prevent storage issues
        if (logs.length > 100) {
          logs.shift()
        }
        localStorage.setItem('app_logs', JSON.stringify(logs))
      } catch (e) {
        console.error('Failed to store log', e)
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error)
  }

  // Utility method to get logs from localStorage (useful for debugging)
  getLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]')
    } catch {
      return []
    }
  }

  // Clear logs
  clearLogs(): void {
    localStorage.removeItem('app_logs')
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for window access during debugging
if (import.meta.env.DEV) {
  (window as any).logger = logger
}