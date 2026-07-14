export const getConfirmationEmailHTML = (data: {
  customerName: string
  bookingId: string
  venueName: string
  groundName: string
  venueAddress: string
  bookingDate: string
  startTime: string
  endTime: string
  duration: string
  players: string
  status: string
  paymentId: string
  transactionId: string
  paymentMethod: string
  amountPaid: string
  platformFee: string
  gst: string
  discount: string
  finalAmount: string
  paymentStatus: string
  receiptNumber: string
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
    .header img { max-width: 150px; }
    .title { color: #10b981; font-size: 24px; font-weight: bold; margin-top: 15px; }
    .content { padding: 20px 0; color: #334155; line-height: 1.6; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .card-title { font-weight: bold; color: #0f172a; margin-bottom: 10px; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .row .label { color: #64748b; font-weight: 500; }
    .row .value { color: #0f172a; font-weight: bold; text-align: right; }
    .instructions { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; color: #065f46; font-size: 14px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">✅ Booking Confirmed</h1>
    </div>
    
    <div class="content">
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Thank you for booking with TRUF GAMING. Your booking has been successfully confirmed!</p>
      
      <div class="card">
        <div class="card-title">Booking Details</div>
        <div class="row"><span class="label">Booking ID</span><span class="value">${data.bookingId}</span></div>
        <div class="row"><span class="label">Venue</span><span class="value">${data.venueName}</span></div>
        <div class="row"><span class="label">Ground</span><span class="value">${data.groundName}</span></div>
        <div class="row"><span class="label">Address</span><span class="value">${data.venueAddress}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${data.bookingDate}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">${data.startTime} - ${data.endTime}</span></div>
        <div class="row"><span class="label">Duration</span><span class="value">${data.duration}</span></div>
        <div class="row"><span class="label">Status</span><span class="value" style="color: #10b981;">${data.status}</span></div>
      </div>

      <div class="card">
        <div class="card-title">Payment Summary</div>
        <div class="row"><span class="label">Payment ID</span><span class="value">${data.paymentId}</span></div>
        <div class="row"><span class="label">Transaction ID</span><span class="value">${data.transactionId}</span></div>
        <div class="row"><span class="label">Method</span><span class="value">${data.paymentMethod}</span></div>
        <div class="row"><span class="label">Amount Paid</span><span class="value">₹${data.amountPaid}</span></div>
        <div class="row"><span class="label">Status</span><span class="value" style="color: #10b981;">${data.paymentStatus}</span></div>
      </div>

      <div class="instructions">
        <strong>Important Instructions:</strong>
        <ul style="margin-top: 5px; padding-left: 20px;">
          <li>Please arrive at least 10 minutes before your slot.</li>
          <li>Carry your booking confirmation (PDF attached).</li>
          <li>Show your Booking ID at the venue if requested.</li>
          <li>Follow all venue rules and guidelines.</li>
        </ul>
      </div>
      
      <p style="text-align: center; margin-top: 20px; font-weight: bold; color: #0f172a;">
        Your official PDF receipt is attached to this email.
      </p>
    </div>
    
    <div class="footer">
      <p>Need help? Contact us at support@trufgaming.com or call +91-9876543210</p>
      <p>&copy; ${new Date().getFullYear()} TRUF GAMING. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}

export const getReminderEmailHTML = (data: {
  customerName: string
  venueName: string
  venueAddress: string
  bookingDate: string
  startTime: string
  endTime: string
  bookingId: string
  groundName: string
  dashboardUrl: string
  mapsUrl: string
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Reminder</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
    .title { color: #f59e0b; font-size: 24px; font-weight: bold; margin-top: 15px; }
    .content { padding: 20px 0; color: #334155; line-height: 1.6; }
    .card { background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .row .label { color: #92400e; font-weight: 500; }
    .row .value { color: #78350f; font-weight: bold; text-align: right; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; text-align: center; }
    .btn-secondary { background-color: #3b82f6; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .btn-container { text-align: center; margin: 25px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">⏰ Your game starts in 10 minutes!</h1>
    </div>
    
    <div class="content">
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your cricket session at <strong>${data.venueName}</strong> is about to begin. Please get ready to head to the venue!</p>
      
      <div class="card">
        <div class="row"><span class="label">Date</span><span class="value">${data.bookingDate}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">${data.startTime} - ${data.endTime}</span></div>
        <div class="row"><span class="label">Ground</span><span class="value">${data.groundName}</span></div>
        <div class="row"><span class="label">Booking ID</span><span class="value">${data.bookingId}</span></div>
      </div>

      <p style="text-align: center; color: #d97706; font-weight: bold;">
        Please reach the venue a few minutes early for a smooth check-in. Have your Booking ID ready if required.
      </p>

      <div class="btn-container">
        <a href="${data.dashboardUrl}" class="btn" style="color: white;">View Booking</a>
        <br><br>
        <a href="${data.mapsUrl}" class="btn btn-secondary" style="color: white;">Open in Google Maps</a>
      </div>
      
    </div>
    
    <div class="footer">
      <p>Enjoy your game and have fun!</p>
      <p>Need help? Contact us at support@trufgaming.com</p>
    </div>
  </div>
</body>
</html>
  `
}
