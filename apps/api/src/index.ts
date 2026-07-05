import * as dotenv from 'dotenv';
import app from './app';

// Bootstrap BullMQ workers — must be imported to register them
import './workers/notification.worker';
import './workers/payout.worker';
import './workers/reminder.worker';

dotenv.config();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[server]: TRUF GAMING API running at http://localhost:${PORT}`);
  console.log(`[workers]: BullMQ workers active (notifications, payouts, reminders)`);
});
