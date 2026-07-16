// ============================================================================
// TRUF GAMING — Centralized Platform Configuration
// All business rules and platform constants live here.
// Never scatter magic numbers across the codebase.
// ============================================================================

export const PLATFORM = {
  name: 'TRUF GAMING',
  supportEmail: 'support@turfgaming.com',
  defaultCurrency: 'INR',
  currencySymbol: '₹',
} as const

export const COMMISSION = {
  /** Platform commission percentage (e.g. 10 = 10%) */
  defaultPercentage: 10,
  /** Minimum payout threshold for owner settlements */
  minPayoutThreshold: 500,
  /** Maximum single payout limit */
  maxPayoutLimit: 100_000,
} as const

export const BOOKING = {
  /** Slot lock duration in seconds (how long a slot is held during checkout) */
  lockDurationSeconds: 300,
  /** Maximum advance booking days */
  maxAdvanceDays: 15,
  /** Cancellation window in hours (before slot start) */
  cancellationWindowHours: 4,
  /** Maximum cancellations per user per month before fraud flag */
  maxCancellationsPerMonth: 5,
} as const

export const XP = {
  /** XP awarded on successful booking */
  bookingAward: 250,
  /** XP threshold per level */
  xpPerLevel: 1000,
  /** Max level player can reach */
  maxLevel: 50,
} as const

export const AUTH = {
  /** OTP expiry in minutes */
  otpExpiryMinutes: 10,
  /** Maximum OTP attempts before lockout */
  maxOtpAttempts: 5,
  /** Session timeout in minutes (default) */
  defaultSessionTimeoutMinutes: 60,
  /** Rate limit: max login attempts per 15 min window */
  maxLoginAttemptsPerWindow: 10,
  /** Rate limit window in minutes */
  rateLimitWindowMinutes: 15,
  /** Password minimum length */
  minPasswordLength: 12,
  /** Allowed email domains */
  allowedEmailDomains: ['gmail.com'],
} as const

export const UPLOAD = {
  /** Maximum file size in bytes (5 MB) */
  maxFileSizeBytes: 5 * 1024 * 1024,
  /** Allowed image MIME types */
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  /** Maximum turf images per venue */
  maxTurfImages: 2,
} as const

export const PAGINATION = {
  /** Default page size */
  defaultLimit: 20,
  /** Maximum page size */
  maxLimit: 100,
} as const

export const SEARCH = {
  /** Debounce delay in milliseconds for search inputs */
  debounceMs: 300,
} as const
