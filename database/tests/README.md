# TRUF Gaming - Phase 3A Payout Engine Tests

This directory contains the certification suite for the Payout Engine schema.
These tests use pure PostgreSQL `DO $$ ... END $$` blocks to ensure they can run everywhere without external dependencies.

## How to Run

Execute the SQL scripts directly against a development or testing database:

```bash
psql -U postgres -d truf_dev -f database/tests/phase3_payout_invariants.sql
psql -U postgres -d truf_dev -f database/tests/phase3_performance.sql
```

## Expected Output

The script will emit `NOTICE` logs for every passing test.
If any invariant is violated, the script will immediately abort with a `FATAL` or `EXCEPTION` state, indicating which test failed.

Example success output:

```
NOTICE:  Starting Phase 3A Schema Certification...
NOTICE:  TEST 1 PASS: Duplicate payable blocked.
NOTICE:  TEST 2 PASS: Booking state verification is present in RPC.
...
NOTICE:  Phase 3A Schema Certification Complete. All invariant tests passed.
```

## Certification Process

Before any application code (API, workers) is written or deployed to production, this schema **must** be certified.
Certification requires passing the 15 core financial invariant tests.

## Adding New Tests

To add a new test:

1. Open `phase3_payout_invariants.sql`
2. Add a new `BEGIN ... EXCEPTION ... END;` block.
3. Simulate the failure condition.
4. Catch the expected failure. If it succeeds when it shouldn't, `RAISE EXCEPTION 'TEST X FAILED: ...'`.
