# TRUF GAMING — Disaster Recovery (DR) Runbook

**Version**: 1.0
**Target Operational Metrics:**

- **Recovery Time Objective (RTO)**: ≤ 60 minutes
- **Recovery Point Objective (RPO)**: ≤ 15 minutes

## 1. Database Outage & PITR Restoration

_Preconditions: Supabase Production Project is unreachable or data is corrupted._

### 1.1 Escalation

1. **On-Call Engineer** triggers `[P0] Database Outage` alert.
2. Alert CTO and Lead DevOps immediately.
3. Inform Customer Support to post "Scheduled Maintenance" on social channels.

### 1.2 Point-in-Time Recovery (PITR) Execution

1. Navigate to the **Supabase Dashboard** -> Project Settings -> Database -> Backups.
2. Identify the exact minute prior to the corruption event (within the 15-minute RPO window).
3. Select **Restore to timestamp**.
4. Confirm the operation. (Note: The project will be inaccessible for ~5-15 minutes depending on database size).

### 1.3 Post-Recovery Verification

- **Verify Integrity**: Run `SELECT count(*) FROM public.financial_ledger` to confirm record counts match pre-incident metrics.
- **Verify Connectors**: Confirm the Next.js API is successfully reading from the restored replica.
- **Run Smoke Tests**: Execute `npx playwright test apps/web/playwright/smoke.spec.ts`.

## 2. Payment Provider (Razorpay) Outage

_Preconditions: Razorpay is returning 500 errors, or webhook delivery is down._

### 2.1 Activation

1. Identify the outage via the Payment Circuit Breaker tripping (status `OPEN`).
2. The platform will automatically reject new checkouts safely.

### 2.2 Mitigation & Failover

1. If Razorpay is confirmed down globally, switch `PAYMENT_GATEWAY_ACTIVE` env variable (via Vercel dashboard) to fallback provider (if implemented) or enable Maintenance Mode for payments.
2. If webhooks are delayed, monitor the `webhook_logs` table. Razorpay will automatically retry up to 72 hours.
3. No manual ledger entry should be created. Idempotency guarantees will process the delayed webhooks when they arrive.

## 3. Redis / Queue Worker Outage

_Preconditions: BullMQ jobs are piling up; emails are not sending._

### 3.1 Mitigation

1. Redis disconnection triggers the `OfflineQueue` rejection logic in the app.
2. Restart the Redis managed instance via the provider console.
3. Restart the BullMQ Worker processes.
4. Unprocessed jobs are persisted in Redis. The workers will immediately drain the queue upon connection.

## 4. Failed Deployment Rollback

_Preconditions: A new release introduced a critical bug._

### 4.1 Execution

1. Open the Vercel (or hosting provider) dashboard.
2. Locate the last known stable production deployment.
3. Click **"Promote to Production"** or **"Rollback"**.
4. The DNS switch takes seconds.
5. If the deployment included a breaking database schema change, execute the `.down.sql` migration script from the corresponding PR before promoting the old build.

### 4.2 Verification

- Trigger the Production Smoke Tests.
- Monitor error logs in OpenTelemetry/Datadog for the next 15 minutes.
