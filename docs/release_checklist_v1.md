# TRUF GAMING v1.0 — Final Release Checklist

This document serves as the ultimate Go/No-Go certification for the production launch. No deployment to `main` should occur until all checkboxes are verified.

## 1. Infrastructure & Configuration

- [ ] Production environment variables verified (No `localhost` or mock endpoints).
- [ ] All critical secrets (Supabase, Razorpay, Resend, Redis) validated in Vercel/Hosting dashboard.
- [ ] Custom domain (trufgaming.com) configured and SSL/TLS certificates active.
- [ ] Edge caching rules and ISR revalidation intervals confirmed.

## 2. Database & Data Integrity

- [ ] All SQL migrations successfully applied to the production database instance.
- [ ] `supabase_schema.sql` reflects exactly what is running in production.
- [ ] All 5 high-frequency performance indexes (`idx_slots_search`, etc.) verified active.
- [ ] Supabase Point-in-Time Recovery (PITR) enabled and tested.
- [ ] Row-Level Security (RLS) enabled on _all_ tables.

## 3. Security & Compliance

- [ ] Super Admin and Owner Role authorization constraints verified.
- [ ] API Rate Limiting configured (Protection against DoS on Booking/Auth routes).
- [ ] Security headers (CSP, HSTS, X-Frame-Options) implemented.
- [ ] Secret scanning and Dependency vulnerability scanning passed in CI.

## 4. Observability & Monitoring

- [ ] OpenTelemetry traces successfully forwarding to the APM dashboard (Datadog/NewRelic).
- [ ] Structured logging captures `trace_id`, `user_id`, and `booking_id`.
- [ ] Alerts configured for:
  - Error Rate > 1%
  - P95 Latency > 1000ms
  - Booking Failure Spikes
  - Database CPU > 70%

## 5. Quality & Performance Assurance

- [ ] CI/CD pipeline passing 100% (Typecheck, ESLint, Unit/Integration tests).
- [ ] Test coverage meets threshold (≥95% statements/functions, ≥90% branches).
- [ ] Load testing proves 1000 concurrent users capability without connection exhaustion.
- [ ] Post-Deployment Smoke Suite (`playwright/smoke.spec.ts`) runs successfully.

## 6. Disaster Recovery & Operations

- [ ] Disaster Recovery Runbook (`docs/disaster_recovery.md`) reviewed and acknowledged by On-Call engineers.
- [ ] Database restoration procedure practiced in a staging environment.
- [ ] Deployment Rollback procedure defined and understood.
- [ ] Dead Letter Queue (DLQ) alerts configured for BullMQ workers.

## 7. Business Approvals

- [ ] **QA Lead Sign-off**: Manual walkthrough of Player, Owner, and Admin workflows completed.
- [ ] **Security Lead Sign-off**: Vulnerability audit passed.
- [ ] **Principal Engineer Sign-off**: Architecture certification passed.

## 8. Staged Rollout Strategy

Even with all gates passed, the platform will be launched in the following controlled stages to minimize risk:

- **Stage 1 (Internal):** Team only. Verify real payments, notifications, and dashboards in production.
- **Stage 2 (Limited Beta):** 20–50 users. Monitor booking failures, payment failures, performance, and support requests.
- **Stage 3 (Soft Launch):** Restricted to a single city or region. Continue monitoring operational metrics.
- **Stage 4 (Full Production):** Open registration activated.

---

**Status**: 🟡 PENDING OBJECTIVE VERIFICATION & STAGE 1 LAUNCH
