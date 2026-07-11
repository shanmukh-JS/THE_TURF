import { connection } from './queues'
import { settlementWorker } from './settlementWorker'
import { payoutBatchWorker } from './payoutBatchWorker'
import { reconciliationWorker } from './reconciliationWorker'
import { ownerPayableWorker } from './ownerPayableWorker'

console.log('🚀 Starting TRUF Gaming BullMQ Background Workers...')

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
