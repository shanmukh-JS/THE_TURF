import { trace, context } from '@opentelemetry/api'

/**
 * Injects business attributes into the current active OpenTelemetry span.
 * Helps with trace correlation (User ID, Booking ID, etc.)
 */
export function addTraceAttributes(
  attributes: Record<string, string | number | boolean | null | undefined>
) {
  try {
    const activeSpan = trace.getSpan(context.active())
    if (activeSpan) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) {
          activeSpan.setAttribute(key, value)
        }
      }
    }
  } catch (err) {
    // Failsafe in case OpenTelemetry isn't loaded (e.g. edge runtime)
    console.warn('[Tracing] Could not add trace attributes:', err)
  }
}
