export class PayoutDomainError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'PayoutDomainError'
  }
}

export const translatePostgresError = (error: any): PayoutDomainError => {
  const message = error?.message || 'Unknown database error'

  // These string matches assume Postgres error strings from our RPCs
  if (message.includes('Concurrent')) {
    return new PayoutDomainError(
      'CONCURRENCY_ERROR',
      'A concurrent operation prevented this action. Please try again.'
    )
  }
  if (message.includes('already exists')) {
    return new PayoutDomainError(
      'DUPLICATE_ENTITY',
      'This entity already exists and cannot be duplicated.'
    )
  }
  if (message.includes('already settled')) {
    return new PayoutDomainError('ALREADY_SETTLED', 'This transfer has already been settled.')
  }
  if (message.includes('not in COMPLETED state')) {
    return new PayoutDomainError(
      'INVALID_BOOKING_STATE',
      'Booking is not in a valid state for payable creation.'
    )
  }
  if (message.includes('Invalid transition')) {
    return new PayoutDomainError(
      'INVALID_STATE_TRANSITION',
      'The requested state transition is not allowed from the current state.'
    )
  }
  if (message.includes('Batch is not')) {
    return new PayoutDomainError(
      'INVALID_BATCH_STATE',
      'The batch is in an invalid state for this operation.'
    )
  }

  return new PayoutDomainError('INTERNAL_DB_ERROR', message)
}
