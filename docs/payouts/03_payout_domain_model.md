# Payout Domain Model

The Payout Domain models the entities that track money owed to owners and the processes for disbursing it.

## Hierarchy

```text
Booking
  ↓
Owner Payable
  ↓
Payout Batch
  ↓
Payout
  ↓
Settlement
  ↓
Reconciliation
```

## Entities

### 1. Owner

Represents the recipient of payouts.

### 2. Owner Payable

Tracks money owed to an owner. This is the atomic unit of debt created by a `BOOKING_COMPLETED` event.

### 3. Payout Batch

Groups one or more payable items for disbursement. Payout approvals and operational flows happen at the batch level (e.g., Weekly Batch).

### 4. Payout

Represents an actual transfer attempt to the owner's bank account.

### 5. Settlement

Records confirmation from the bank or payout provider that the payout succeeded.

### 6. Reconciliation

Matches settlements back to accounting records to prove that the ledger and the bank are in perfect alignment.
