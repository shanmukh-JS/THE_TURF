// ============================================================================
// TRUF GAMING — Authorization Policy Engine
// Centralized permission checks for all role-based and resource-based access.
// Instead of scattering `if (owner.id === venue.ownerId)` across the codebase,
// use these policy functions.
// ============================================================================

import type { UserRole } from '@/types/models'

interface AuthContext {
  userId: string
  role: UserRole
}

// ---- Admin Policies ----

export function canAccessAdminPanel(ctx: AuthContext): boolean {
  return ctx.role === 'ADMIN'
}

export function canApproveVenue(ctx: AuthContext): boolean {
  return ctx.role === 'ADMIN'
}

export function canSuspendUser(ctx: AuthContext): boolean {
  return ctx.role === 'ADMIN'
}

export function canManageCommission(ctx: AuthContext): boolean {
  return ctx.role === 'ADMIN'
}

export function canViewAuditLogs(ctx: AuthContext): boolean {
  return ctx.role === 'ADMIN'
}

export function canManageAdminSettings(ctx: AuthContext): boolean {
  return ctx.role === 'ADMIN'
}

// ---- Owner Policies ----

export function canEditVenue(ctx: AuthContext, venueOwnerId: string): boolean {
  if (ctx.role === 'ADMIN') return true
  return ctx.role === 'OWNER' && ctx.userId === venueOwnerId
}

export function canDeleteVenue(ctx: AuthContext, venueOwnerId: string): boolean {
  if (ctx.role === 'ADMIN') return true
  return ctx.role === 'OWNER' && ctx.userId === venueOwnerId
}

export function canManageSlots(ctx: AuthContext, slotOwnerId: string): boolean {
  if (ctx.role === 'ADMIN') return true
  return ctx.role === 'OWNER' && ctx.userId === slotOwnerId
}

export function canViewOwnerRevenue(ctx: AuthContext, ownerUserId: string): boolean {
  if (ctx.role === 'ADMIN') return true
  return ctx.role === 'OWNER' && ctx.userId === ownerUserId
}

// ---- Customer Policies ----

export function canCreateBooking(ctx: AuthContext): boolean {
  return ctx.role === 'CUSTOMER'
}

export function canCancelBooking(ctx: AuthContext, bookingCustomerId: string): boolean {
  if (ctx.role === 'ADMIN') return true
  return ctx.role === 'CUSTOMER' && ctx.userId === bookingCustomerId
}

export function canRequestRefund(ctx: AuthContext, bookingCustomerId: string): boolean {
  if (ctx.role === 'ADMIN') return true
  return ctx.role === 'CUSTOMER' && ctx.userId === bookingCustomerId
}

export function canWriteReview(ctx: AuthContext): boolean {
  return ctx.role === 'CUSTOMER'
}

// ---- Shared Policies ----

export function canViewOwnProfile(ctx: AuthContext, profileUserId: string): boolean {
  if (ctx.role === 'ADMIN') return true
  return ctx.userId === profileUserId
}

export function canEditOwnProfile(ctx: AuthContext, profileUserId: string): boolean {
  return ctx.userId === profileUserId
}

/**
 * Guard helper — throws an error if the policy check fails.
 * Use in API controllers for clean, consistent authorization.
 */
export function authorize(
  allowed: boolean,
  message = 'You do not have permission to perform this action.'
): void {
  if (!allowed) {
    throw new AuthorizationError(message)
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}
