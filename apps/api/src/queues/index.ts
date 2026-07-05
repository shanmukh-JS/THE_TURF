import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Shared Redis connection for all BullMQ queues
export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// ─── Queue Definitions ───────────────────────────────────────────────────────

/**
 * Notification Queue — handles Email and SMS dispatch
 * Triggered after: booking confirmed, cancellation, settlement
 */
export const notificationQueue = new Queue('notifications', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Reminder Queue — sends SMS/push 2 hours before a booking slot
 * Triggered by: booking confirmation worker (delayed job)
 */
export const reminderQueue = new Queue('reminders', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 50,
  },
});

/**
 * Payout Queue — calculates commission and initiates bank transfer
 * Triggered by: booking COMPLETED status
 */
export const payoutQueue = new Queue('payouts', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
});

/**
 * Analytics Queue — records business events for aggregation
 */
export const analyticsQueue = new Queue('analytics', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 1000,
  },
});
