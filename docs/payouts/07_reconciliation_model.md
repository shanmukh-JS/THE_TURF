# Reconciliation Model (Phase 3)

The reconciliation process ensures that TRUF Gaming's internal ledger matches the immutable reality of the banking system and our payment/payout providers.

## Reconciliation Sources

- **Ledger**: Our internal double-entry accounting engine (`journals`, `journal_lines`).
- **Bank**: The actual bank account statements.
- **Razorpay**: Our inbound payment provider.
- **Payout Provider**: Our outbound payout provider (agnostic, e.g., RazorpayX, Cashfree).

## Matching Keys

To trace a transaction from end to end, the following keys are used for reconciliation:

- `booking_id`: Links the customer order to the financial event.
- `payment_id`: Links the inbound customer payment to the ledger and provider.
- `payout_transfer_id`: Links the outbound transfer attempt to the batch.
- `provider_settlement_id`: Links the provider's settlement record to our internal settlement entity.
- `journal_id`: Links the business event to the immutable accounting ledger.

## Daily Reconciliation

The morning checklist for the finance team. The system must automatically surface:

1. **Clearing Balance Check**: Do the total funds in the Payout Clearing account match the total value of `pending_payout_transfers`?
2. **Outstanding Liabilities**: Do the `outstanding_owner_liabilities` exactly match the balance of the `20100 Owner Payables` ledger account?
3. **Completed Payouts**: Does the sum of `completed_payouts` for the previous day match the total bank settlements received?
4. **Failed Payouts**: Have all failed payouts correctly reversed their associated clearing journals and reinstated the `owner_payables` liability?
5. **Bank Settlements**: Are there any unmapped bank settlements that don't correspond to an internal `payout_transfer`?

## Exception Handling

Protocols for handling discrepancies detected during daily reconciliation:

1. **Bank reports settlement, but journal missing?**
   - _Action_: System raises a critical alert. Indicates a failure in the `record_settlement` RPC or webhook processor. Manual intervention required to investigate the webhook logs and replay the settlement event.
2. **Journal exists, but settlement missing?**
   - _Action_: If the transfer is still pending within provider SLAs, do nothing. If SLAs are breached, initiate a status probe to the provider. The liability remains in the Payout Clearing account until resolved.
3. **Owner payable exists twice?**
   - _Action_: Impossible by schema constraint (Owner Payables should have a unique constraint against `booking_id`). If detected via a bug, halt batch approval until resolved.
4. **Duplicate settlement?**
   - _Action_: Prevented by idempotency keys (advisory locks on `provider_settlement_id`). If the provider sends a correction, the system must create an _additive_ adjusting settlement journal, never mutating the original.
