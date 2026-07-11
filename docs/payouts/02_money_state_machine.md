# Money State Machine

The lifecycle of a payment in TRUF Gaming follows this strict sequence:

```text
Customer
    │
    ▼
Payment Captured
    │
    ▼
Escrow Liability
    │
    ▼
Booking Completed
    │
    ▼
Owner Payable Created
    │
    ▼
Payout Approved
    │
    ▼
Payout Initiated
    │
    ▼
Bank Settlement
    │
    ▼
Owner Paid
```

## Transition Guarantees

Every transition within this state machine is guaranteed to have:

- An accompanying **Business Event**.
- Strict **Validation Rules**.
- An **Accounting Journal** (where money moves).
- An **Audit Record**.
- Verifiable **Integration Tests**.
