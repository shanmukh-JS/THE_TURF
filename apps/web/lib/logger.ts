import * as Sentry from '@sentry/nextjs'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  trace_id?: string
  booking_id?: string
  owner_id?: string
  payment_id?: string
  queue_name?: string
  worker_name?: string
  scheduler_job?: string
  [key: string]: any
}

export const logger = {
  log: (level: LogLevel, message: string, context?: LogContext) => {
    const timestamp = new Date().toISOString()

    // Structured JSON Logging for standard output
    console.log(
      JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        message,
        ...context,
      })
    )

    // Sentry Capture for errors and warnings
    if (level === 'error' || level === 'warn') {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setExtras(context)
          if (context.trace_id) scope.setTag('trace_id', context.trace_id)
          if (context.queue_name) scope.setTag('queue_name', context.queue_name)
        }

        if (level === 'error') {
          Sentry.captureMessage(message, 'error')
        } else {
          Sentry.captureMessage(message, 'warning')
        }
      })
    }
  },

  info: (msg: string, ctx?: LogContext) => logger.log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => logger.log('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => logger.log('error', msg, ctx),
  debug: (msg: string, ctx?: LogContext) => logger.log('debug', msg, ctx),
}
