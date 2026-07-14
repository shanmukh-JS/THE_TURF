import PDFDocument from 'pdfkit'

export interface ReceiptData {
  receiptNumber: string
  bookingId: string
  customerName: string
  venueName: string
  venueAddress: string
  bookingDate: string
  startTime: string
  endTime: string
  duration: string
  paymentDate: string
  paymentMethod: string
  transactionId: string
  amountBreakdown: {
    baseAmount: number
    gst: number
    platformFee: number
    discount: number
    totalPaid: number
  }
  paymentStatus: string
  supportEmail: string
}

export const generatePDFReceipt = async (data: ReceiptData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        resolve(Buffer.concat(buffers))
      })

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('TRUF GAMING', { align: 'center' })
      doc.moveDown()
      doc.fontSize(16).text('Booking Receipt', { align: 'center' })
      doc.moveDown(2)

      // Receipt Details
      doc.fontSize(12).font('Helvetica')
      const startY = doc.y

      // Left Column
      doc.text(`Receipt Number: ${data.receiptNumber}`, 50, startY)
      doc.text(`Booking ID: ${data.bookingId}`, 50, startY + 15)
      doc.text(`Date: ${data.paymentDate}`, 50, startY + 30)

      // Right Column
      doc.text(`Status: ${data.paymentStatus}`, 350, startY)
      doc.text(`Method: ${data.paymentMethod}`, 350, startY + 15)
      doc.text(`Txn ID: ${data.transactionId}`, 350, startY + 30)

      doc.moveDown(3)

      // Customer & Venue Details
      doc.font('Helvetica-Bold').text('Customer Details', 50)
      doc.font('Helvetica').text(`Name: ${data.customerName}`)
      doc.moveDown()

      doc.font('Helvetica-Bold').text('Venue Details')
      doc.font('Helvetica').text(`Venue: ${data.venueName}`)
      doc.text(`Address: ${data.venueAddress}`)
      doc.text(`Slot: ${data.bookingDate} | ${data.startTime} - ${data.endTime} (${data.duration})`)

      doc.moveDown(2)

      // Payment Breakdown Table
      doc.font('Helvetica-Bold').text('Payment Breakdown')
      doc.moveDown(0.5)

      const tableTop = doc.y

      doc.font('Helvetica').text('Base Amount:', 50, tableTop)
      doc.text(`Rs. ${data.amountBreakdown.baseAmount.toFixed(2)}`, 400, tableTop, {
        align: 'right',
      })

      doc.text('Platform Fee:', 50, tableTop + 20)
      doc.text(`Rs. ${data.amountBreakdown.platformFee.toFixed(2)}`, 400, tableTop + 20, {
        align: 'right',
      })

      doc.text('GST (18%):', 50, tableTop + 40)
      doc.text(`Rs. ${data.amountBreakdown.gst.toFixed(2)}`, 400, tableTop + 40, { align: 'right' })

      doc.text('Discount:', 50, tableTop + 60)
      doc.text(`- Rs. ${data.amountBreakdown.discount.toFixed(2)}`, 400, tableTop + 60, {
        align: 'right',
      })

      // Divider
      doc
        .moveTo(50, tableTop + 80)
        .lineTo(450, tableTop + 80)
        .stroke()

      // Total
      doc.font('Helvetica-Bold').text('Total Paid:', 50, tableTop + 90)
      doc.text(`Rs. ${data.amountBreakdown.totalPaid.toFixed(2)}`, 400, tableTop + 90, {
        align: 'right',
      })

      doc.moveDown(4)

      // Footer
      doc.fontSize(10).font('Helvetica').fillColor('gray')
      doc.text('Terms & Conditions:', 50)
      doc.text('1. Please carry this receipt to the venue.')
      doc.text('2. Cancellations are subject to venue policy.')
      doc.text(`For support, contact: ${data.supportEmail}`)

      doc.moveDown(2)
      doc.text('Thank you for booking with TRUF GAMING!', { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
