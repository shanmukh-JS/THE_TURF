function getBaseLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      background-color: #060d06;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0a0f0a;
      border: 1px solid #142814;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #142814;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .logo {
      color: #22c55e;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-decoration: none;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content {
      line-height: 1.6;
      font-size: 15px;
      color: #cbd5e1;
    }
    .otp-code {
      font-size: 32px;
      font-weight: 800;
      color: #22c55e;
      letter-spacing: 4px;
      text-align: center;
      padding: 16px;
      background-color: #0e1a0e;
      border: 1px solid #1c351c;
      border-radius: 12px;
      margin: 24px 0;
      font-family: monospace;
    }
    .btn {
      display: inline-block;
      background-color: #22c55e;
      color: #060d06 !important;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      margin: 20px 0;
      text-align: center;
    }
    .btn:hover {
      background-color: #4ade80;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #142814;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer a {
      color: #22c55e;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://trufgaming.com" class="logo">⚡ TURF GAMING</a>
    </div>
    <div class="content">
      <h2 class="title">${title}</h2>
      ${bodyContent}
    </div>
    <div class="footer">
      <p>This is an automated email from TURF GAMING.</p>
      <p>Need help? Contact our support at <a href="mailto:support@trufgaming.com">support@trufgaming.com</a></p>
      <p>&copy; 2026 TURF GAMING. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

export const templates = {
  registration_otp: (name: string, otp: string) =>
    getBaseLayout(
      'Verify Your Account',
      `<p>Hello ${name},</p>
       <p>Welcome to TURF GAMING! Please use the following 6-digit OTP verification code to complete your registration:</p>
       <div class="otp-code">${otp}</div>
       <p>This code expires in 5 minutes. If you did not request this verification code, please ignore this email.</p>`
    ),

  login_otp: (name: string, otp: string) =>
    getBaseLayout(
      'Login Verification Code',
      `<p>Hello ${name},</p>
       <p>Use the following verification code to sign in to your account:</p>
       <div class="otp-code">${otp}</div>
       <p>This code is valid for 5 minutes. Protect this code; do not share it with anyone.</p>`
    ),

  email_verification: (name: string, link: string) =>
    getBaseLayout(
      'Verify Your Email Address',
      `<p>Hello ${name},</p>
       <p>Please click the button below to verify your email address and secure your account:</p>
       <div style="text-align: center;">
         <a href="${link}" class="btn">Verify Email Address</a>
       </div>
       <p>If the button doesn't work, copy and paste this link in your browser:</p>
       <p style="word-break: break-all;"><a href="${link}">${link}</a></p>`
    ),

  forgot_password_otp: (name: string, otp: string) =>
    getBaseLayout(
      'Reset Your Password',
      `<p>Hello ${name},</p>
       <p>You requested to reset your password. Use the following 6-digit verification code to proceed:</p>
       <div class="otp-code">${otp}</div>
       <p>This code is valid for 5 minutes. If you did not request a password reset, please ignore this email.</p>`
    ),

  password_changed: (name: string) =>
    getBaseLayout(
      'Password Changed Successfully',
      `<p>Hello ${name},</p>
       <p>Your password was changed successfully. All other active sessions have been logged out to keep your account secure.</p>
       <p>If you did not make this change, please contact support immediately to lock your account.</p>`
    ),

  welcome: (name: string) =>
    getBaseLayout(
      'Welcome to TURF GAMING!',
      `<p>Hello ${name},</p>
       <p>Your account has been verified and created successfully! We are excited to have you on our platform.</p>
       <p>Start listing your box venues or browsing top rated boxes near you instantly.</p>
       <div style="text-align: center;">
         <a href="https://trufgaming.com" class="btn">Go to Dashboard</a>
       </div>`
    ),

  booking_confirmed: (
    name: string,
    details: { venueName: string; date: string; time: string; amount: string }
  ) =>
    getBaseLayout(
      'Booking Confirmed! 🏏',
      `<p>Hello ${name},</p>
       <p>Your slot booking has been confirmed successfully. Here are the booking details:</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Venue:</strong> ${details.venueName}</p>
         <p style="margin: 4px 0;"><strong>Date:</strong> ${details.date}</p>
         <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${details.time}</p>
         <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${details.amount}</p>
       </div>
       <p>Make sure to reach the venue 10 minutes before your slot. Have a great game!</p>`
    ),

  booking_cancelled: (
    name: string,
    details: { venueName: string; date: string; time: string; refundAmount: string }
  ) =>
    getBaseLayout(
      'Booking Cancelled',
      `<p>Hello ${name},</p>
       <p>Your slot booking has been cancelled. Below are the details:</p>
       <div style="background-color: #1a0e0e; border: 1px solid #351c1c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Venue:</strong> ${details.venueName}</p>
         <p style="margin: 4px 0;"><strong>Date:</strong> ${details.date}</p>
         <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${details.time}</p>
         <p style="margin: 4px 0;"><strong>Refund Initiated:</strong> ₹${details.refundAmount}</p>
       </div>
       <p>Your refund is being processed and will be credited to your original payment method shortly.</p>`
    ),

  payment_successful: (name: string, details: { paymentId: string; amount: string }) =>
    getBaseLayout(
      'Payment Successful',
      `<p>Hello ${name},</p>
       <p>We received your payment of ₹${details.amount}. Below is the receipt details:</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Payment ID:</strong> ${details.paymentId}</p>
         <p style="margin: 4px 0;"><strong>Amount:</strong> ₹${details.amount}</p>
       </div>`
    ),

  payment_failed: (name: string, details: { orderId: string; amount: string; reason?: string }) =>
    getBaseLayout(
      'Payment Failed',
      `<p>Hello ${name},</p>
       <p>Your payment attempt of ₹${details.amount} has failed.</p>
       <div style="background-color: #1a0e0e; border: 1px solid #351c1c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Order ID:</strong> ${details.orderId}</p>
         <p style="margin: 4px 0;"><strong>Amount:</strong> ₹${details.amount}</p>
         ${details.reason ? `<p style="margin: 4px 0;"><strong>Reason:</strong> ${details.reason}</p>` : ''}
       </div>
       <p>If money was deducted from your account, it will be automatically refunded within 5-7 business days.</p>`
    ),

  refund_initiated: (name: string, details: { bookingId: string; amount: string }) =>
    getBaseLayout(
      'Refund Initiated',
      `<p>Hello ${name},</p>
       <p>We have initiated a refund of ₹${details.amount} for your booking.</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Booking ID:</strong> ${details.bookingId}</p>
         <p style="margin: 4px 0;"><strong>Refund Amount:</strong> ₹${details.amount}</p>
       </div>
       <p>The amount will be credited back to your original payment mode within 5-7 banking days.</p>`
    ),

  refund_completed: (name: string, details: { refundId: string; amount: string }) =>
    getBaseLayout(
      'Refund Completed',
      `<p>Hello ${name},</p>
       <p>Your refund of ₹${details.amount} has been successfully processed and completed.</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Refund ID:</strong> ${details.refundId}</p>
         <p style="margin: 4px 0;"><strong>Amount:</strong> ₹${details.amount}</p>
       </div>`
    ),

  venue_approved: (name: string, venueName: string) =>
    getBaseLayout(
      'Venue Approved! 🎉',
      `<p>Hello ${name},</p>
       <p>Congratulations! Your box venue <strong>${venueName}</strong> has been approved by the admin team.</p>
       <p>It is now live on the marketplace and available for player bookings.</p>`
    ),

  venue_rejected: (name: string, venueName: string, reason: string) =>
    getBaseLayout(
      'Venue Submission Rejected',
      `<p>Hello ${name},</p>
       <p>We reviewed your venue submission for <strong>${venueName}</strong>, but unfortunately, it could not be approved at this time.</p>
       <div style="background-color: #1a0e0e; border: 1px solid #351c1c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>
       </div>
       <p>Please update your details or contact admin support to re-verify.</p>`
    ),

  venue_update_requested: (name: string, venueName: string, notes: string) =>
    getBaseLayout(
      'Venue Updates Requested',
      `<p>Hello ${name},</p>
       <p>The admin team has requested some changes to your venue listing for <strong>${venueName}</strong> before approval:</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 0;"><strong>Notes:</strong> ${notes}</p>
       </div>
       <p>Please edit the details from your Owner console and re-submit.</p>`
    ),

  match_scheduled: (
    name: string,
    details: { matchName: string; opponentName: string; time: string }
  ) =>
    getBaseLayout(
      'Match Scheduled',
      `<p>Hello ${name},</p>
       <p>Your match has been scheduled successfully:</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Match:</strong> ${details.matchName}</p>
         <p style="margin: 4px 0;"><strong>Opponent:</strong> ${details.opponentName}</p>
         <p style="margin: 4px 0;"><strong>Scheduled Time:</strong> ${details.time}</p>
       </div>`
    ),

  match_cancelled: (name: string, details: { matchName: string; reason?: string }) =>
    getBaseLayout(
      'Match Cancelled',
      `<p>Hello ${name},</p>
       <p>Your match <strong>${details.matchName}</strong> has been cancelled.</p>
       ${details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ''}`
    ),

  tournament_started: (name: string, tournamentName: string) =>
    getBaseLayout(
      'Tournament Started! 🏆',
      `<p>Hello ${name},</p>
       <p>The tournament <strong>${tournamentName}</strong> has officially started! Check your brackets and fixture timings in the dashboard.</p>`
    ),

  tournament_winner: (name: string, tournamentName: string, winnerName: string) =>
    getBaseLayout(
      'Tournament Finished',
      `<p>Hello ${name},</p>
       <p>The tournament <strong>${tournamentName}</strong> has concluded. Congratulations to the champions <strong>${winnerName}</strong>!</p>`
    ),

  new_message: (name: string, senderName: string, message: string) =>
    getBaseLayout(
      'New Message Received',
      `<p>Hello ${name},</p>
       <p>You received a new message from <strong>${senderName}</strong>:</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 0; font-style: italic;">"${message}"</p>
       </div>`
    ),

  support_ticket: (name: string, ticketId: string, subject: string) =>
    getBaseLayout(
      'Support Ticket Created',
      `<p>Hello ${name},</p>
       <p>Your support ticket has been created successfully. Our team will review and reply shortly.</p>
       <div style="background-color: #0e1a0e; border: 1px solid #1c351c; border-radius: 12px; padding: 16px; margin: 20px 0;">
         <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
         <p style="margin: 4px 0;"><strong>Subject:</strong> ${subject}</p>
       </div>`
    ),

  account_locked: (name: string) =>
    getBaseLayout(
      'Account Locked ⚠️',
      `<p>Hello ${name},</p>
       <p>Your account has been temporarily locked due to multiple failed login attempts. This is a security precaution.</p>
       <p>To unlock or recover your account, please click below or contact support:</p>
       <div style="text-align: center;">
         <a href="https://trufgaming.com/auth/recover" class="btn">Recover Account</a>
       </div>`
    ),

  account_recovered: (name: string) =>
    getBaseLayout(
      'Account Recovered',
      `<p>Hello ${name},</p>
       <p>Your account has been successfully unlocked and recovered. You can now log back in normally.</p>`
    ),

  email_change_otp: (name: string, otp: string) =>
    getBaseLayout(
      'Verify Your New Email Address',
      `<p>Hello ${name},</p>
       <p>Please use the following 6-digit OTP verification code to confirm and change your email address:</p>
       <div class="otp-code">${otp}</div>
       <p>This code expires in 5 minutes. Protect this code; do not share it with anyone.</p>`
    ),

  login_verification_otp: (name: string, otp: string) =>
    getBaseLayout(
      'Two-Factor Authentication Code 🔐',
      `<p>Hello ${name},</p>
       <p>You requested a Two-Factor Authentication verification code. Use the OTP below to verify your identity:</p>
       <div class="otp-code">${otp}</div>
       <p>This code expires in 5 minutes. If you did not request this, please secure your account immediately.</p>`
    ),
  login_magic_link: (name: string, link: string) =>
    getBaseLayout(
      'Two-Factor Authentication Link 🔐',
      `<p>Hello ${name},</p>
       <p>You requested a Two-Factor Authentication magic link. Click the button below to verify your identity:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="${link}" style="background-color: #22c55e; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Identity</a>
       </div>
       <p>If the button doesn't work, copy and paste this link into your browser:</p>
       <p style="word-break: break-all; color: #888; font-size: 12px;">${link}</p>
       <p>This link expires in 5 minutes. If you did not request this, please secure your account immediately.</p>`
    ),
}
