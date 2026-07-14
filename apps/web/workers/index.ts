import { connection } from './queues'
import { settlementWorker } from './settlementWorker'
import { payoutBatchWorker } from './payoutBatchWorker'
import { reconciliationWorker } from './reconciliationWorker'
import { ownerPayableWorker } from './ownerPayableWorker'

import * as http from 'http'

console.log('🚀 Starting TRUF Gaming BullMQ Background Workers...')

// Create a dummy HTTP server so Render.com Free Tier doesn't kill the worker
const PORT = process.env.PORT || 8080
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Worker is running and healthy!\n')
  })
  .listen(PORT, () => {
    console.log(`✅ Dummy HTTP server listening on port ${PORT} to keep Render happy`)
  })

const workers = [settlementWorker, payoutBatchWorker, reconciliationWorker, ownerPayableWorker]

const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)

  try {
    // Stop accepting new jobs
    await Promise.all(workers.map((worker) => worker.close()))
    console.log('✅ All workers paused and stopped accepting new jobs.')

    // Close redis connection
    connection.disconnect()
    console.log('✅ Redis connection closed.')

    console.log('Shutdown complete.')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

console.log('✅ Workers are running and listening for jobs.')
