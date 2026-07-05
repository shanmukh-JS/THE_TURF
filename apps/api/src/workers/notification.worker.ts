import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues';

interface NotificationJob {
  type: 'EMAIL' | 'SMS';
  to: string;
  subject?: string;
  body: string;
  bookingId?: string;
}

export const notificationWorker = new Worker<NotificationJob>(
  'notifications',
  async (job: Job<NotificationJob>) => {
    const { type, to, subject, body, bookingId } = job.data;

    console.log(`[NotificationWorker] Processing job ${job.id}: ${type} → ${to}`);

    if (type === 'EMAIL') {
      // In production: use nodemailer/SendGrid
      // await sendEmail({ to, subject, body });
      console.log(`[EMAIL] To: ${to} | Subject: ${subject} | Body: ${body}`);
    }

    if (type === 'SMS') {
      // In production: use Twilio
      // await twilioClient.messages.create({ to, from: process.env.TWILIO_PHONE_NUMBER, body });
      console.log(`[SMS] To: ${to} | Body: ${body}`);
    }

    return { sent: true, type, to };
  },
  {
    connection: redisConnection as any,
    concurrency: 10, // Process 10 notifications simultaneously
  }
);

notificationWorker.on('completed', (job) => {
  console.log(`[NotificationWorker] Job ${job.id} completed.`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[NotificationWorker] Job ${job?.id} failed:`, err.message);
});
