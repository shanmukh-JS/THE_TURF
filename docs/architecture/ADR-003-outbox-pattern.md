# ADR-003: Transactional Outbox Pattern

## Context and Problem

If a server crashes or a network request fails right after a booking is finalized but before the event is dispatched to BullMQ, the customer will not receive their confirmation, maps link, or QR code, resulting in support overhead.

## Decision

We implement the Transactional Outbox Pattern:

1. Every domain event is written to a `notification_outbox` table in the database within the _same database transaction_ as the business action.
2. A separate background worker (`OutboxProcessor`) reads `PENDING` outbox entries and routes them to the Redis/BullMQ processing queues.
3. Once queued, the outbox record is marked `PROCESSED`.

## Consequences & Trade-offs

- **Pros**:
  - Guaranteed Delivery: If Redis or workers crash, the outbox entries remain in the DB and will be processed upon restart.
- **Cons**:
  - Increases database write traffic slightly (requires writing the outbox row).
  - Needs a robust polling worker (`OutboxProcessor`) to prevent processing lags.
