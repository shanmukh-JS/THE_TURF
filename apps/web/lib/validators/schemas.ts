// ============================================================================
// TRUF GAMING — Zod Request Validators
// Server-side input validation schemas for all API endpoints.
// ============================================================================

import { z } from 'zod'

// ---- Auth Validators ----

export const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100),
  email: z
    .string()
    .email('Invalid email address.')
    .refine((v) => v.toLowerCase().endsWith('@gmail.com'), {
      message: 'Only @gmail.com addresses are allowed.',
    }),
  phone: z.string().min(10, 'Phone must be at least 10 digits.').max(15),
  password: z.string().min(12, 'Password must be at least 12 characters.'),
  role: z.enum(['CUSTOMER', 'OWNER'], { message: 'Role must be CUSTOMER or OWNER.' }),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address.')
    .refine((v) => v.toLowerCase().endsWith('@gmail.com'), {
      message: 'Only @gmail.com addresses are allowed.',
    }),
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits.'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters.'),
})

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits.'),
})

// ---- Booking Validators ----

export const createBookingSchema = z.object({
  slot_id: z.string().uuid('Invalid slot ID.'),
  venue_id: z.string().uuid('Invalid venue ID.'),
  total_amount: z.number().positive('Amount must be positive.'),
  advance_paid: z.number().min(0, 'Advance cannot be negative.'),
  payment_id: z.string().optional(),
})

// ---- Venue Validators ----

export const createVenueSchema = z.object({
  name: z.string().min(3, 'Venue name must be at least 3 characters.').max(150),
  description: z.string().max(2000).optional(),
  address: z.string().min(5, 'Address must be at least 5 characters.'),
  pincode: z.string().max(10).optional(),
  google_maps_link: z.string().url().optional().or(z.literal('')),
  city_id: z.string().uuid().optional(),
  area_id: z.string().uuid().optional(),
  pitches: z.number().int().min(1).max(20).default(1),
  is_indoor: z.boolean().default(false),
  turf_type: z.string().max(50).optional(),
  surface: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  max_players: z.number().int().min(1).max(100).optional(),
  amenities: z.array(z.string()).default([]),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
  weekly_holidays: z.array(z.string()).default([]),
  slot_duration: z.number().int().min(30).max(180).default(60),
})

// ---- Slot Validators ----

export const createSlotSchema = z.object({
  venue_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
  start_time: z.string(),
  end_time: z.string(),
  price: z.number().positive('Price must be positive.'),
  sport_type: z.string().optional(),
  duration: z.number().int().positive().optional(),
  max_players: z.number().int().positive().optional(),
})

// ---- Admin Settings Validator ----

export const adminSettingsSchema = z.object({
  platform_name: z.string().min(1).max(100),
  support_email: z.string().email(),
  commission_percentage: z.number().min(0).max(100),
  max_payout_limit: z.number().int().positive(),
  mfa_required: z.boolean(),
  session_timeout_mins: z.number().int().min(5).max(1440),
  maintenance_mode: z.boolean(),
  notify_on_new_turf: z.boolean(),
  notify_on_new_booking: z.boolean(),
})

// ---- Email Settings Validator ----

export const emailSettingsSchema = z.object({
  sender_name: z.string().min(1, 'Sender name is required.'),
  sender_email: z.string().email('Invalid sender email.'),
  reply_to_email: z.string().email().optional().or(z.literal('')),
  smtp_host: z.string().optional(),
  smtp_port: z.number().int().min(1).max(65535).optional().nullable(),
  smtp_username: z.string().optional(),
  smtp_password: z.string().optional(),
  encryption_type: z.enum(['TLS', 'SSL', 'NONE']).optional(),
  provider: z.enum(['smtp', 'sendgrid', 'ses']).default('smtp'),
  is_enabled: z.boolean().default(true),
})

// ---- Review Validator ----

export const createReviewSchema = z.object({
  venue_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

// ---- Generic Pagination ----

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

// ---- Utility: Parse or throw standard API error ----

export function parseOrError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    return { error: firstIssue?.message || 'Validation failed.' }
  }
  return { data: result.data }
}
