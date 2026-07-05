import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues';

interface ReminderJob {
  bookingId: string;
  customerPhone: string;
  venueName: string;
  slotTime: string;
}

export const reminderWorker = new Worker<ReminderJob>(
  'reminders',
  async (job: Job<ReminderJob>) => {
    const { bookingId, customerPhone, venueName, slotTime } = job.data;

    console.log(`[ReminderWorker] Sending reminder for booking ${bookingId}`);

    const message = `🏏 TRUF GAMING Reminder: Your slot at ${venueName} is at ${slotTime}. Get ready to play!`;

    // In production: await twilioClient.messages.create({ to: customerPhone, body: message, ... });
    console.log(`[ReminderWorker] SMS → ${customerPhone}: "${message}"`);

    return { sent: true, bookingId };
  },
  {
    connection: redisConnection as any,
    concurrency: 20,
  }
);

reminderWorker.on('completed', (job) => {
  console.log(`[ReminderWorker] Reminder ${job.id} sent.`);
});

reminderWorker.on('failed', (job, err) => {
  console.error(`[ReminderWorker] Reminder ${job?.id} failed:`, err.message);
});
