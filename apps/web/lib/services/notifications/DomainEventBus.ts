import { EventEmitter } from 'events'
import crypto from 'crypto'

export interface DomainEvent<T = any> {
  eventId: string
  eventType: string // e.g. 'BookingConfirmed.v1'
  correlationId: string
  causationId?: string
  timestamp: string
  payload: T
}

class DomainEventBus extends EventEmitter {
  publish<T>(
    eventType: string,
    payload: T,
    correlationId?: string,
    causationId?: string
  ): DomainEvent<T> {
    const event: DomainEvent<T> = {
      eventId: `evt_${crypto.randomUUID()}`,
      eventType,
      correlationId: correlationId || crypto.randomUUID(),
      causationId,
      timestamp: new Date().toISOString(),
      payload,
    }

    console.log(`[DomainEventBus] Publishing event: ${event.eventType}`, event)
    this.emit(eventType, event)
    this.emit('*', event)
    return event
  }
}

export const domainEventBus = new DomainEventBus()
export default domainEventBus
