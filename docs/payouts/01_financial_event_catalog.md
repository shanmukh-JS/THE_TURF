# Financial Event Catalog (Phase 3)

This catalog defines the canonical business events that move money within the TRUF Gaming platform.

| Event                  | Trigger                   | Money Movement                            | Journal Required | Result            |
| ---------------------- | ------------------------- | ----------------------------------------- | ---------------- | ----------------- |
| BOOKING_PAID           | Customer payment captured | Customer → Escrow                         | ✅               | Booking funded    |
| BOOKING_COMPLETED      | Match completed           | Escrow → Owner Payable + Platform Revenue | ✅               | Liability created |
| OWNER_PAYOUT_APPROVED  | Finance/Admin approval    | None                                      | ❌               | Ready for payout  |
| OWNER_PAYOUT_INITIATED | Transfer requested        | None                                      | ❌               | Processing        |
| OWNER_PAYOUT_SETTLED   | Transfer successful       | Bank → Owner, Liability cleared           | ✅               | Payout completed  |
| OWNER_PAYOUT_FAILED    | Bank transfer failed      | None (or reversal if needed)              | Depends          | Retry             |
| REFUND_REQUESTED       | Cancellation              | Pending decision                          | ❌               | Await approval    |
| REFUND_COMPLETED       | Refund issued             | Reversal journal                          | ✅               | Customer refunded |
