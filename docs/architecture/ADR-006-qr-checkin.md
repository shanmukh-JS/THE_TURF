# ADR-006: Secure QR Code check-in workflow

## Context and Problem

Turf owners need an efficient, spoof-proof way to check in players when they arrive at the ground. Sending plain ticket links in WhatsApp is prone to forgery.

## Decision

We implement a QR-based check-in flow:

1. When a booking is paid, the backend generates a secure token (`bookingId + salt`).
2. We include a link to a QR code generator API (or static SVG) in the WhatsApp message.
3. The owner dashboard features a scanning page (`owner/checkin`) that calls a Server Action to validate the QR code against the Supabase database.
4. If valid, check-in status updates to `CHECKED_IN`, and the delayed "No-Show" alert queue job is aborted.

## Consequences & Trade-offs

- **Pros**:
  - Prevents player fraud and fake bookings.
  - Automatically handles no-show warnings without manual tracking.
- **Cons**:
  - Requires owners to have a mobile device with camera access.
