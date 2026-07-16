# Release Checklist: v2-financial-core

This document serves as the operational baseline for deploying the **Phase 2 Financial Core** into a production or staging environment.

## 0. Release Approval

| Role        | Name | Date | Status |
| ----------- | ---- | ---- | ------ |
| Engineering |      |      |        |
| QA          |      |      |        |
| Product     |      |      |        |
| Operations  |      |      |        |

## 1. Version Information

- **Milestone:** Phase 2 Financial Core
- **Git Tag:** `v2-financial-core`
- **Release Scope:** Immutable ledger, Double-entry accounting RPCs, Webhook idempotency, Razorpay webhook mapping.

## 2. Backup Verification

Before running migrations, confirm the following:

- [ ] PostgreSQL backup completed
- [ ] Backup restoration tested
- [ ] Restore point recorded

## 3. Database Migrations

Run these in exactly this sequence. Ensure `pg_try_advisory_xact_lock` and PL/pgSQL triggers successfully apply.

- [ ] `database/20260712_financial_ledger.sql`
- [ ] `database/20260713_payment_events.sql`

## 4. Environment Variable Requirements

Ensure the production environment possesses the following secrets:

- [ ] `RAZORPAY_WEBHOOK_SECRET` (Must be configured in both the Razorpay Dashboard and `.env` / Vercel secrets)
- [ ] `RAZORPAY_KEY_ID` (For API requests if capturing payments server-side)
- [ ] `RAZORPAY_KEY_SECRET`

> [!WARNING]
> Webhook secrets must never be logged. Verify that no middleware or error boundary accidentally dumps the `x-razorpay-signature` or secret to Datadog / Sentry.

## 5. Deployment Steps

1. Push `v2-financial-core` to the deployment branch (e.g. `main` or `staging`).
2. Run database migrations on the target Supabase instance.
3. Validate Edge/Serverless deployment finishes successfully (Vercel/AWS).
4. Point the Razorpay Dashboard webhook URL to the newly deployed `/api/webhooks/razorpay` endpoint.

## 6. Smoke Test Checklist

- [ ] **Auth Check**: Execute a malformed webhook signature (e.g. via Postman) and verify it receives a `401 Unauthorized`.
- [ ] **Idempotency Check**: Replay a successful webhook payload with the identical `x-razorpay-event-id`. Verify it returns `200 OK` (ALREADY_PROCESSED) and does _not_ create a duplicate `payment_events` row.
- [ ] **E2E Transaction**: Complete a live test booking via Razorpay Test Mode and verify accounting invariants:
  - [ ] Journal debits = credits
  - [ ] Exactly one journal exists
  - [ ] Ledger remains append-only
  - [ ] Booking status = CONFIRMED
  - [ ] `payment_events` contains raw payload
  - [ ] Audit log written
  - [ ] Notification queued
  - [ ] No duplicate journals after replay

## 7. Monitoring Checklist

Immediately after deployment, observe:

- [ ] Webhook success rate & latency
- [ ] SQL errors & RPC failures
- [ ] Retry count & Duplicate event count
- [ ] Database CPU & Lock wait time
- [ ] Failed journal postings

## 8. Financial Health Checks

Within the first day after deployment, verify:

- [ ] Trial balance remains balanced
- [ ] Clearing account matches captured payments
- [ ] Escrow liability reflects expected balances
- [ ] No orphaned payment events
- [ ] No journals without ledger entries
- [ ] No ledger entries without journals

## 9. Rollback Procedure & Incident Runbook

If severe accounting anomalies are detected immediately post-deployment:

1. **Who is notified?** Notify the Engineering Lead and Finance Ops immediately.
2. **Sever Webhook**: Disable the webhook endpoint in the Razorpay Dashboard to halt incoming traffic.
3. **Revert Tag**: Rollback the application deployment to the pre-v2 git commit.
4. **Quarantine Data**: **DO NOT delete rows from the ledger.** (This is never allowed). If incorrect entries were created, they must be offset with reversing journals (to be handled by manual DBA intervention).
5. **Replaying Events**: If events failed during the outage, extract them from the Razorpay dashboard and replay them against the webhook endpoint once stable.

## 10. Known Limitations

- Side effects (WhatsApp/Email) inside the webhook are currently decoupled but represent dummy asynchronous functions. Real implementation will be added in a future phase or via external queues (e.g. Inngest/QStash).
- The system currently only handles `order.paid` / `payment.captured` comprehensively. Refunds and failures are mapped but lack full domain logic (slated for Phase 3).

## 11. Next Milestone

**Phase 3: Payout Engine.** This phase will introduce liability generation for owners, approval workflows, settlement journals, and financial reporting.
