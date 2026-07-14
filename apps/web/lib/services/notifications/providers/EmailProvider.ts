import nodemailer from 'nodemailer'
import { NotificationProvider, NotificationPayload, ProviderResponse } from './NotificationProvider'
import { getConfirmationEmailHTML, getReminderEmailHTML } from '../templates/EmailTemplates'
import { generatePDFReceipt, ReceiptData } from '../../pdf/ReceiptGenerator'
import { createAdminClient } from '@/lib/supabase/admin'

export class EmailProvider implements NotificationProvider {
  private transporter: nodemailer.Transporter

  constructor() {
    // Note: In production, configure SMTP host/port correctly in environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    const supabase = createAdminClient()
    const isConfirmation = payload.templateName === 'booking_confirmation'
    const isReminder = payload.templateName === 'match_reminder'

    // We expect the email address to be passed in payload.variables.Email or we fetch it
    const emailTo = payload.variables.Email

    if (!emailTo) {
      return { success: false, error: 'Recipient email address is missing', provider: 'email' }
    }

    try {
      let htmlContent = ''
      let subject = ''
      let attachments: any[] = []

      if (isConfirmation) {
        subject = '✅ Booking Confirmed – Your Cricket Box is Reserved!'
        htmlContent = getConfirmationEmailHTML({
          customerName: payload.variables.Player || 'Customer',
          bookingId: payload.bookingId || 'N/A',
          venueName: payload.variables.Venue || 'Truf Gaming Venue',
          groundName: payload.variables.Ground || 'Main Ground',
          venueAddress: payload.variables.Address || 'N/A',
          bookingDate: payload.variables.Date || 'N/A',
          startTime: payload.variables.StartTime || 'N/A',
          endTime: payload.variables.EndTime || 'N/A',
          duration: payload.variables.Duration || '1 Hour',
          players: payload.variables.Players || '14',
          status: 'Confirmed',
          paymentId: payload.variables.PaymentId || 'N/A',
          transactionId: payload.variables.TransactionId || 'N/A',
          paymentMethod: payload.variables.PaymentMethod || 'Razorpay',
          amountPaid: payload.variables.AmountPaid || '0',
          platformFee: payload.variables.PlatformFee || '0',
          gst: payload.variables.Gst || '0',
          discount: payload.variables.Discount || '0',
          finalAmount: payload.variables.TotalPaid || '0',
          paymentStatus: 'Successful',
          receiptNumber:
            payload.variables.ReceiptNumber ||
            `TRUF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        })

        // Generate PDF
        const pdfBuffer = await generatePDFReceipt({
          receiptNumber:
            payload.variables.ReceiptNumber ||
            `TRUF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          bookingId: payload.bookingId || 'N/A',
          customerName: payload.variables.Player || 'Customer',
          venueName: payload.variables.Venue || 'Truf Gaming Venue',
          venueAddress: payload.variables.Address || 'N/A',
          bookingDate: payload.variables.Date || 'N/A',
          startTime: payload.variables.StartTime || 'N/A',
          endTime: payload.variables.EndTime || 'N/A',
          duration: payload.variables.Duration || '1 Hour',
          paymentDate: new Date().toLocaleDateString(),
          paymentMethod: payload.variables.PaymentMethod || 'Razorpay',
          transactionId: payload.variables.TransactionId || 'N/A',
          amountBreakdown: {
            baseAmount:
              Number(payload.variables.AmountPaid || 0) -
              Number(payload.variables.Gst || 0) -
              Number(payload.variables.PlatformFee || 0),
            gst: Number(payload.variables.Gst || 0),
            platformFee: Number(payload.variables.PlatformFee || 0),
            discount: Number(payload.variables.Discount || 0),
            totalPaid: Number(payload.variables.TotalPaid || 0),
          },
          paymentStatus: 'Successful',
          supportEmail: 'support@trufgaming.com',
        })

        attachments.push({
          filename: `Receipt-${payload.bookingId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        })
      } else if (isReminder) {
        subject = '⏰ Reminder: Your Cricket Box Booking Starts in 10 Minutes'
        htmlContent = getReminderEmailHTML({
          customerName: payload.variables.Player || 'Customer',
          venueName: payload.variables.Venue || 'Truf Gaming Venue',
          venueAddress: payload.variables.Address || 'N/A',
          bookingDate: payload.variables.Date || 'N/A',
          startTime: payload.variables.StartTime || 'N/A',
          endTime: payload.variables.EndTime || 'N/A',
          bookingId: payload.bookingId || 'N/A',
          groundName: payload.variables.Ground || 'Main Ground',
          dashboardUrl: 'https://trufgaming.com/player/bookings',
          mapsUrl: 'https://maps.google.com',
        })
      } else {
        return { success: false, error: 'Unknown email template', provider: 'email' }
      }

      const info = await this.transporter.sendMail({
        from: '"TRUF GAMING" <noreply@trufgaming.com>',
        to: emailTo,
        subject: subject,
        html: htmlContent,
        attachments: attachments,
      })

      // Log success in DB
      await supabase.from('email_notifications').insert({
        booking_id: payload.bookingId || null,
        user_id: payload.userId || null,
        email: emailTo,
        notification_type: isConfirmation ? 'BOOKING_CONFIRMATION' : 'BOOKING_REMINDER',
        subject: subject,
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })

      console.log(
        `[EmailProvider] Email sent successfully to ${emailTo}. Message ID: ${info.messageId}`
      )
      return { success: true, messageId: info.messageId, provider: 'email' }
    } catch (error: any) {
      console.error(`[EmailProvider] Failed to send email to ${emailTo}:`, error)

      // Log failure in DB
      await supabase.from('email_notifications').insert({
        booking_id: payload.bookingId || null,
        user_id: payload.userId || null,
        email: emailTo,
        notification_type: isConfirmation ? 'BOOKING_CONFIRMATION' : 'BOOKING_REMINDER',
        subject: isConfirmation ? '✅ Booking Confirmed' : '⏰ Reminder',
        status: 'FAILED',
        error_message: error.message,
      })

      return { success: false, error: error.message, provider: 'email' }
    }
  }
}
