# ADR-002: Event Bus for Decoupled Modules

## Context and Problem

If business services (bookings, registration, check-ins) call the notification module directly, the code becomes tightly coupled and difficult to maintain. As new channels (like SMS, email) or logic (like analytics/rewards) are added, we run the risk of breaking core business workflows.

## Decision

We implement a typed, versioned Event Bus inside `lib/events/EventBus.ts`.

- Core services emit domain events (e.g. `booking.confirmed.v1`).
- The Event Bus routes these events to registered event handlers (`booking.events.ts`, etc.) asynchronously.
- Event schemas are typed and validated using Zod.

## Consequences & Trade-offs

- **Pros**:
  - Isolates core platform modules; bookings service does not need to know WhatsApp configuration.
  - Future features (loyalty coins, tracking) just register as new handlers on the Event Bus.
- **Cons**:
  - Requires more files and schemas.
  - Slightly harder to trace execution flow synchronously.
