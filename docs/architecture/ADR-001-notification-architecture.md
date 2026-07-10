# ADR-001: Notification Engine Architecture Specification

## Context and Problem

TRUF GAMING requires a production-ready, reliable, and secure notification system to communicate booking confirmations, reminders, and ratings via WhatsApp (Meta API). The system must scale to 100,000+ daily notifications, handle load spikes gracefully, and prevent any blocking behavior in user-facing booking API endpoints.

## Decision

We implement a highly decoupled, asynchronous architecture featuring a Transactional Outbox pipeline coupled with a queue-backed Event Bus:

1. **Asynchronous Processing**: All notification calls are pushed to queues, separating API request threads from third-party provider latencies.
2. **Provider Abstraction**: A standardized provider routing class handles delivery via multiple notification gateways (WhatsApp, SMS, Email).
3. **Queue Channel Partitioning**: Job priority tiers partition critical messages from bulk email campaigns.

## Consequences & Trade-offs

- **Pros**:
  - Eliminates request delay due to slow third-party Meta API handshakes.
  - Ensures robust retry mechanisms without duplicate sends (via idempotency).
- **Cons**:
  - Adds infrastructure overhead by requiring Redis + worker pools.
  - Introduces eventual consistency (messages might be sent a few seconds after the actual business transaction).
