// ============================================================================
// TRUF GAMING — Distributed Tracing (OpenTelemetry)
// Hooks into Next.js to trace API routes and database calls.
// ============================================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // We only load this heavily module on the Node.js runtime, not Edge
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
    // @ts-ignore - Dynamic import type mapping issue
    const { resourceFromAttributes } = await import('@opentelemetry/resources')
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions')
    const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http')

    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    })

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: 'trufgaming-web',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
      traceExporter,
      instrumentations: [
        new HttpInstrumentation(),
        // Add more instrumentations here (e.g. Postgres, Redis)
      ],
    })

    sdk.start()
    const { logger } = await import('@/lib/utils/logger')
    logger.info('[Telemetry] OpenTelemetry initialized')

    // Bootstrap Outbox Processor and Queue Workers
    const { outboxProcessor } = await import('@/lib/services/notifications/OutboxProcessor')
    const { startWorkers } = await import('@/lib/workers/whatsapp.worker')

    outboxProcessor.startPolling(5000)
    startWorkers()
    logger.info('[QueueManager] Outbox poller and worker listeners bootstrapped successfully.')
  }
}
