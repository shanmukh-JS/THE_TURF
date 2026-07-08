// ============================================================================
// TRUF GAMING — Shared Domain Models
// All entity interfaces used across the application.
// Never use `any` — import from this file instead.
// ============================================================================

// ---- Core Auth & Users ----

export type UserRole = 'CUSTOMER' | 'OWNER' | 'ADMIN'

export interface User {
  id: string
  email: string
  phone?: string | null
  role: UserRole
  full_name?: string
  is_suspended: boolean
  created_at: string
  updated_at: string
}

export interface SessionUser {
  id: string
  email: string
  role: UserRole
  fullName?: string
  logoUrl?: string
}

export interface CustomerProfile {
  id: string
  user_id: string
  full_name: string
}

export interface OwnerProfile {
  id: string
  user_id: string
  full_name: string
  business_name: string
}

// ---- Locations ----

export interface City {
  id: string
  name: string
  state?: string | null
}

export interface Area {
  id: string
  name: string
  city_id: string
}

// ---- Venues ----

export type VerificationStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'

export interface Venue {
  id: string
  owner_id: string
  name: string
  description?: string | null
  address: string
  pincode?: string | null
  google_maps_link?: string | null
  city_id?: string | null
  area_id?: string | null
  verification_status: VerificationStatus
  pitches: number
  is_indoor: boolean
  turf_type?: string | null
  surface?: string | null
  size?: string | null
  max_players?: number | null
  amenities: string[]
  opening_time?: string | null
  closing_time?: string | null
  weekly_holidays: string[]
  slot_duration: number
  is_disabled: boolean
  is_active?: boolean
  // Verification checklist fields
  admin_notes?: string | null
  ai_verification_score?: number | null
  ai_verification_recommendation?: string | null
  identity_verified?: boolean
  phone_verified?: boolean
  govt_id_uploaded?: boolean
  turf_images_verified?: boolean
  location_verified?: boolean
  operating_hours_verified?: boolean
  documents_url?: string[]
}

export interface VenueImage {
  id: string
  venue_id: string
  url: string
  is_cover: boolean
}

export interface VenuePricing {
  id: string
  venue_id: string
  price: number
  weekend_price?: number | null
  peak_price?: number | null
  advance_limit: number
}

// ---- Slots ----

export type SlotStatus = 'Available' | 'Booked' | 'Blocked'

export interface Slot {
  id: string
  venue_id: string
  owner_id?: string | null
  date: string
  start_time: string
  end_time: string
  price: number
  is_booked: boolean
  is_locked: boolean
  lock_expires?: string | null
  sport_type?: string | null
  duration?: number | null
  max_players?: number | null
  booked_players: number
  status: SlotStatus
  created_at: string
  updated_at: string
}

// ---- Bookings ----

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'PENDING' | 'COMPLETED'

export interface Booking {
  id: string
  slot_id: string
  venue_id: string
  customer_id: string
  total_amount: number
  advance_paid: number
  status: BookingStatus
  payment_id?: string | null
  qr_code?: string | null
  // Joined relations (optional)
  slot?: Slot | null
  venue?: Venue | null
  customer?: User | null
}

// ---- Reviews ----

export interface Review {
  id: string
  venue_id: string
  customer_id: string
  rating: number
  comment?: string | null
  created_at: string
}

// ---- Payments & Settlements ----

export type SettlementStatus = 'PENDING' | 'COMPLETED'
export type CommissionStatus = 'PENDING' | 'SETTLED'

export interface Settlement {
  id: string
  owner_id: string
  amount: number
  status: SettlementStatus
  transfer_id?: string | null
}

export interface Commission {
  id: string
  booking_id: string
  owner_id: string
  amount: number
  status: CommissionStatus
  settlement_id?: string | null
}

// ---- Financial Ledger ----

export type LedgerEntryType =
  'BOOKING_PAYMENT' | 'PLATFORM_COMMISSION' | 'OWNER_CREDIT' | 'CUSTOMER_REFUND' | 'PAYOUT'

export interface LedgerEntry {
  id: string
  reference_id: string
  entry_type: LedgerEntryType
  debit: number
  credit: number
  balance_after: number
  actor_id: string
  description: string
  created_at: string
}

// ---- Notifications ----

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  link?: string | null
  created_at: string
}

// ---- Admin Settings ----

export interface AdminSettings {
  id: string
  platform_name: string
  support_email: string
  commission_percentage: number
  max_payout_limit: number
  mfa_required: boolean
  session_timeout_mins: number
  maintenance_mode: boolean
  notify_on_new_turf: boolean
  notify_on_new_booking: boolean
}

// ---- Owner Settings ----

export interface OwnerSettings {
  id: string
  owner_id: string
  business_logo_url?: string | null
  business_email?: string | null
  business_phone?: string | null
  business_address?: string | null
  auto_accept_bookings: boolean
  cancellation_policy: string
  booking_buffer_time: string
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_ifsc?: string | null
  bank_upi?: string | null
  notify_bookings: boolean
  notify_payments: boolean
  notify_email: boolean
  notify_sms: boolean
}

// ---- Audit Logs ----

export type AuditModule = 'AUTH' | 'BOOKING' | 'PAYMENT' | 'VENUE' | 'ADMIN' | 'OWNER' | 'SYSTEM'

export interface AuditLog {
  id: string
  actor_id: string
  module: AuditModule
  action: string
  target_id?: string | null
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  request_id?: string | null
  created_at: string
}

// ---- Dashboard Stats ----

export interface DashboardStats {
  totalRevenue: number
  totalBookings: number
  avgRating: number | null
  uniqueCustomers: number
  revenueChange: number
  bookingsChange: number
}

// ---- API Response Envelope ----

export interface ApiSuccessResponse<T = unknown> {
  success: true
  message: string
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse
