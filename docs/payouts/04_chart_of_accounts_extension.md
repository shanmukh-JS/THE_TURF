# Chart of Accounts Extension (Phase 3)

The following accounts are introduced to support the Payout Engine and extended lifecycle.

| Code  | Name             | Type      | Normal Balance | Purpose                                              |
| ----- | ---------------- | --------- | -------------- | ---------------------------------------------------- |
| 20100 | Owner Payables   | Liability | Credit         | Money owed to venue owners for completed bookings.   |
| 40000 | Platform Revenue | Revenue   | Credit         | Commission earned by TRUF Gaming.                    |
| 10000 | Bank Account     | Asset     | Debit          | Cash held in TRUF Gaming's operational bank account. |
| 20200 | Payout Clearing  | Liability | Credit         | Temporary account used while a payout is in transit. |
| 20300 | Refund Liability | Liability | Credit         | Future use: Liability for pending customer refunds.  |
