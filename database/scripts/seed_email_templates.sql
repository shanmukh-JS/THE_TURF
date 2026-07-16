-- ========================================================================================
-- NOTIFICATION TEMPLATES SEED - PHASE 1
-- Dark Green, Black, and White premium sports aesthetic
-- ========================================================================================

INSERT INTO public.unified_notification_templates (event, subject, html_body, enabled) VALUES

-- 1. BOOKING CONFIRMED (PLAYER)
('BOOKING_CONFIRMED', '✅ Your Booking is Confirmed!', 
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Inter", sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 30px; }
    .venue-img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; border: 1px solid #333; }
    .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #222; padding-bottom: 8px; }
    .row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .label { color: #888888; }
    .value { color: #ffffff; font-weight: 600; text-align: right; }
    .btn { display: block; width: 100%; padding: 15px; background: linear-gradient(90deg, #10b981 0%, #059669 100%); color: #fff; text-align: center; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; font-size: 13px; color: #555555; padding: 20px; border-top: 1px solid #222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>✅ Booking Confirmed</h1></div>
    <div class="content">
      <img src="{{ venueImage }}" alt="Venue Image" class="venue-img" onerror="this.src=''https://via.placeholder.com/600x200/065f46/ffffff?text=TRUF+GAMING''">
      <p style="font-size: 16px;">Hi <strong>{{ playerName }}</strong>, you are officially booked for some action!</p>
      
      <div class="card">
        <div class="row"><span class="label">Booking ID</span><span class="value">{{ bookingId }}</span></div>
        <div class="row"><span class="label">Venue</span><span class="value">{{ venueName }}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">{{ date }}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">{{ timeSlot }}</span></div>
        <div class="row"><span class="label">Amount Paid</span><span class="value" style="color:#10b981;">₹{{ amount }}</span></div>
      </div>
      
      <a href="{{ mapsUrl }}" class="btn">Navigate to Venue</a>
    </div>
    <div class="footer">Thank you for choosing TRUF GAMING. See you on the field!</div>
  </div>
</body>
</html>', true),

-- 2. BOOKING CANCELLED (PLAYER)
('BOOKING_CANCELLED', '❌ Booking Cancelled', 
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Inter", sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; text-transform: uppercase; }
    .content { padding: 30px; }
    .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin-top: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }
    .label { color: #888888; }
    .value { color: #ffffff; font-weight: 600; text-align: right; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>❌ Booking Cancelled</h1></div>
    <div class="content">
      <p>Hi <strong>{{ playerName }}</strong>, your booking for <strong>{{ venueName }}</strong> has been cancelled.</p>
      <div class="card">
        <div class="row"><span class="label">Booking ID</span><span class="value">{{ bookingId }}</span></div>
        <div class="row"><span class="label">Cancelled By</span><span class="value">{{ cancelledBy }}</span></div>
        <div class="row"><span class="label">Reason</span><span class="value">{{ reason }}</span></div>
      </div>
    </div>
  </div>
</body>
</html>', true),

-- 3. BOOKING REMINDER 10 MIN (PLAYER)
('BOOKING_REMINDER_10_MIN', '🏏 Your Match Starts in 10 Minutes!', 
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Inter", sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; text-transform: uppercase; }
    .content { padding: 30px; }
    .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin-top: 20px; }
    .btn { display: block; width: 100%; padding: 15px; background: #10b981; color: #fff; text-align: center; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>⏰ Starting in 10 Minutes</h1></div>
    <div class="content">
      <p>Get ready <strong>{{ playerName }}</strong>, your session at <strong>{{ venueName }}</strong> is about to begin!</p>
      <div class="card">
        <p style="color:#d97706; font-weight:bold; text-align:center;">Please arrive early and have your QR code ready.</p>
      </div>
      <a href="{{ mapsUrl }}" class="btn">Navigate to Venue</a>
    </div>
  </div>
</body>
</html>', true),

-- 4. NEW BOOKING (OWNER)
('OWNER_NEW_BOOKING', '🎉 New Booking Received', 
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Inter", sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; text-transform: uppercase; }
    .content { padding: 30px; }
    .card { background-color: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #222; padding-bottom: 8px; }
    .label { color: #888888; }
    .value { color: #ffffff; font-weight: 600; text-align: right; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎉 New Booking</h1></div>
    <div class="content">
      <p>Congratulations, you have a new confirmed booking at <strong>{{ venueName }}</strong>.</p>
      <div class="card">
        <div class="row"><span class="label">Player</span><span class="value">{{ playerName }}</span></div>
        <div class="row"><span class="label">Phone</span><span class="value">{{ phone }}</span></div>
        <div class="row"><span class="label">Date & Time</span><span class="value">{{ date }} | {{ timeSlot }}</span></div>
        <div class="row"><span class="label">Amount Paid</span><span class="value" style="color:#10b981;">₹{{ paidAmount }}</span></div>
      </div>
    </div>
  </div>
</body>
</html>', true)

ON CONFLICT (event) DO UPDATE 
SET subject = EXCLUDED.subject, html_body = EXCLUDED.html_body;
