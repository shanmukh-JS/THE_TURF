# Payout Invariants (Phase 3 Constitution)

These are the non-negotiable rules governing the Payout Domain.

## The Core Invariants

1. **Owner payable is immutable after creation.**
   An Owner Payable represents a historical fact of debt. Once created by a `BOOKING_COMPLETED` event, it cannot be modified or deleted.

2. **Every payout settles existing liabilities only.**
   A payout cannot be generated out of thin air. It must strictly trace back to and settle explicitly recorded Owner Payable entities.

3. **A liability cannot be settled twice.**
   Once an Owner Payable has been successfully settled, it must be durably marked as such, preventing any duplicate payout attempts.

4. **Every payout settlement has a balanced journal.**
   A settlement is a financial event that must strictly adhere to the double-entry accounting invariants established in Phase 2.

5. **Every settlement references a payout batch.**
   Settlements are aggregated and processed through batches. A settlement without an associated batch is invalid.

6. **Every payout batch is reproducible from its underlying liabilities.**
   The total value and state of a batch must always be a perfect, reproducible summation of its constituent Owner Payables.

7. **Revenue is recognized only after booking completion.**
   TRUF Gaming does not earn revenue until the service is delivered (ADR-0011).

8. **Every payout can be reconciled to a bank settlement.**
   The system must possess a perfect audit trail from internal payout records directly to immutable bank settlement data.
