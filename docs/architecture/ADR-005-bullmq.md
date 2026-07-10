# ADR-005: BullMQ with Priority Channels for Queueing

## Context and Problem

High-priority messages (login verification code alerts, check-out payment logs) could get blocked in the queue if we send a bulk marketing message blast to thousands of players at once.

## Decision

We implement **BullMQ** backed by Upstash Redis:

1. Define four separate priority channels: `CRITICAL` (login alerts, verify keys), `HIGH` (booking confirmations, reminders), `MEDIUM` (ratings), and `LOW` (promotions).
2. Set up horizontal worker scaling (multiple concurrency nodes) to scale low-priority campaigns separately.
3. Redirect repeated job failures to a Dead Letter Queue (DLQ) for admin investigation.

## Consequences & Trade-offs

- **Pros**:
  - Critical transactional flows are never delayed by bulk marketing.
  - Workers can fail/restart without losing jobs.
- **Cons**:
  - Increases hosting/Redis memory footprint.
