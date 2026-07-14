import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import nodemailer from 'nodemailer'
import { EmailProvider } from './lib/services/notifications/providers/EmailProvider'

async function testEmail() {
  console.log('Generating Ethereal test account...')
  const testAccount = await nodemailer.createTestAccount()

  console.log('Test account created:', testAccount.user)

  // Override environment variables for the test
  process.env.SMTP_HOST = testAccount.smtp.host
  process.env.SMTP_PORT = testAccount.smtp.port.toString()
  process.env.SMTP_USER = testAccount.user
  process.env.SMTP_PASS = testAccount.pass

  const provider = new EmailProvider()

  console.log('Sending test confirmation email...')

  const response = await provider.send({
    recipient: 'test@example.com',
    type: 'booking.confirmed',
    templateName: 'booking_confirmation',
    variables: {
      Email: 'shanmukh@example.com', // The user's requested login mail would go here, we use a placeholder
      Player: 'Shanmukh Test',
      Venue: 'Test Turf',
      Ground: 'Ground 1',
      Address: '123 Test St',
      Date: '2026-07-20',
      StartTime: '18:00',
      EndTime: '19:00',
      Duration: '60 mins',
      AmountPaid: '1500',
      PlatformFee: '50',
      Gst: '270',
      Discount: '0',
      TotalPaid: '1500',
    },
    bookingId: 'test-booking-id-123',
  })

  console.log('Response:', response)

  if (response.success && response.messageId) {
    // Ethereal provides a URL to view the sent email
    console.log(
      'Preview URL: %s',
      nodemailer.getTestMessageUrl({ messageId: response.messageId } as any)
    )
  }
}

testEmail().catch(console.error)
