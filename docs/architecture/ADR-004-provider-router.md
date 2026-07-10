# ADR-004: Provider Router and Failover Abstraction

## Context and Problem

Depending directly on the Meta WhatsApp Business API introduces vendor lock-in. If the Meta API is down, or if we need to switch channels (to SMS/Email) for certain users, refactoring would require modifying code in dozens of places.

## Decision

We create a unified `NotificationProvider` interface.

- Implement specialized providers: `WhatsAppProvider` (Meta), `TwilioProvider` (Backup), `EmailProvider`, and `InAppProvider`.
- Inject a `ProviderRouter` that processes delivery. If the primary Meta API fails after 5 retries, the router automatically fails over to the backup SMS provider (Twilio), logs the warning, and notifies support.

## Consequences & Trade-offs

- **Pros**:
  - Decouples core logic from Meta's API payload structures.
  - Failover keeps communication channels active during outages.
- **Cons**:
  - Restricts use of channel-specific features unless wrapped in complex dynamic adapters.
