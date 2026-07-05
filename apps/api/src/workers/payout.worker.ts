import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues';

interface PayoutJob {
  bookingId: string;
  ownerId: string;
  totalAmount: number;
  commissionPercent: number;
}

export const payoutWorker = new Worker<PayoutJob>(
  'payouts',
  async (job: Job<PayoutJob>) => {
    const { bookingId, ownerId, totalAmount, commissionPercent } = job.data;

    console.log(`[PayoutWorker] Processing payout for booking ${bookingId}`);

    const platformCut = (totalAmount * commissionPercent) / 100;
    const ownerReceivable = totalAmount - platformCut;

    // In production:
    // 1. Create Commission record in DB
    // await prisma.commission.create({ data: { bookingId, platformCut, ownerReceivable } });
    // 2. Add to owner's pending settlement
    // await prisma.ownerSettlement.create({ data: { ownerId, amount: ownerReceivable, status: 'PENDING' } });
    // 3. Trigger bank transfer via Razorpay X or similar

    console.log(`[PayoutWorker] Booking ${bookingId}: Platform ₹${platformCut} | Owner ₹${ownerReceivable}`);

    return { bookingId, platformCut, ownerReceivable };
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Financial jobs — low concurrency for safety
  }
);

payoutWorker.on('completed', (job) => {
  console.log(`[PayoutWorker] Payout job ${job.id} completed.`);
});

payoutWorker.on('failed', (job, err) => {
  console.error(`[PayoutWorker] Payout job ${job?.id} FAILED — requires manual review:`, err.message);
});
