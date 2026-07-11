# Architecture Decision Records (Payouts)

The following ADRs establish the foundation for the Phase 3 Payout Engine.

## ADR-0006 — Owner Payables are Recognized on Booking Completion

- **Context**: We need to determine exactly when we legally owe an owner for a booking.
- **Decision**: An Owner Payable is instantiated strictly upon the `BOOKING_COMPLETED` business event.
- **Consequence**: This guarantees that we do not owe money for services not yet rendered, shielding us from payouts on bookings that are subsequently cancelled.

## ADR-0007 — Payouts are Batch-Oriented

- **Context**: We must handle hundreds or thousands of payables.
- **Decision**: Payouts are approved, processed, and tracked at the batch level (e.g., Weekly Batch).
- **Consequence**: Individual Owner Payables are aggregated into a Payout Batch. This greatly simplifies finance review, reconciliation, auditability, and rollback capability.

## ADR-0008 — Payout Approval is a Separate Business Event

- **Context**: We need strict controls over cash outflow.
- **Decision**: `OWNER_PAYOUT_APPROVED` is an explicit, recorded business event required before a batch can transition to `OWNER_PAYOUT_INITIATED`.
- **Consequence**: Enforces a Maker-Checker process and prevents accidental or automated disbursement without a verified gate.

## ADR-0009 — Settlements are Immutable Financial Events

- **Context**: We need to track when the bank actually transfers funds.
- **Decision**: A bank settlement is an immutable financial event (`OWNER_PAYOUT_SETTLED`).
- **Consequence**: The system state transitions strictly on verifiable truth from the bank, not internal assumptions.

## ADR-0010 — Reconciliation is Performed Against Settlements

- **Context**: We must prove every rupee was settled correctly.
- **Decision**: Reconciliation processes will match internal ledger records directly against immutable Settlement records.
- **Consequence**: Assures that the ledger balances accurately reflect true bank reality.

## ADR-0011 — Revenue is Recognized Only After Service Completion

- **Context**: We must define when TRUF Gaming earns its commission.
- **Decision**: Platform revenue is recognized simultaneously with the Owner Payable, during the `BOOKING_COMPLETED` event. It is explicitly NOT recognized during payment capture.
- **Consequence**: Prevents recognizing revenue on funds held in escrow for unfulfilled bookings. Ensures correct accounting for refunds and cancellations.

## ADR-0012 — Transfers and Settlements are Separate Financial Events

- **Context**: A transfer request to a bank or payout provider does not guarantee immediate funds delivery.
- **Decision**: We explicitly separate `payout_transfers` (the attempt) from `settlements` (the confirmation).
- **Consequence**: A transfer request does not mean money has arrived. This prevents us from clearing liabilities prematurely and ensures reconciliation is performed against immutable bank truth, not internal assumptions.
