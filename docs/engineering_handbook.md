# TRUF Gaming: Engineering Handbook

> **Engineering is the practice of making important properties impossible to violate by accident.**

## The Hierarchy of System Design

This project is built on the understanding that code is not the most important artifact. The durability of our platform comes from preserving the layers above it:

```text
Vision
    ↓
Domain Model
    ↓
Business Events
    ↓
Invariants
    ↓
Architecture
    ↓
Implementation
    ↓
Tests
    ↓
Operations
```

If we ever replace Next.js, migrate away from Supabase, or switch payment providers, the layers above the implementation must remain largely unchanged. Our core business concepts—bookings, payments, liabilities, payouts, settlements, and journals—are our durable assets.

## The Core Mandate

> **Every financial state must be explainable from immutable events, and every balance must be reproducible from the ledger alone.**

### Practical Implications

- If a balance cannot be reproduced from journal entries, something is wrong.
- If a payment cannot be traced back to its originating business event, something is missing.
- If a correction requires editing history instead of recording a new event, the model has been violated.

## Enduring Architectural Qualities

- **Bounded contexts remain independent.** Payments should not become payout logic; payouts should not become accounting logic. Each context owns its own responsibilities and communicates through well-defined business events.
- **Business events are the language of the platform.** Names like `BOOKING_COMPLETED`, `OWNER_PAYOUT_APPROVED`, and `OWNER_PAYOUT_SETTLED` are shared vocabulary across engineering, finance, support, and operations.
- **Documentation evolves alongside the code.** The Financial Event Catalog, ADRs, and Operational Playbook are first-class artifacts, reviewed and versioned with the implementation they describe.
- **Operational readiness is part of the design.** Monitoring, reconciliation, rollback procedures, and incident response are not post-launch concerns—they're part of the architecture.

## The Measure of the System

A mature financial platform is not measured by how many bookings it processes or how many microservices it contains. It is measured by whether, years later, an auditor, an engineer, or a customer can ask a simple question:

> **"Why does this balance exist?"**

And receive an answer that is complete, reproducible, mathematically consistent, and traceable back to immutable business events.

## A Final Maxim

> **Optimize for understanding first, performance second, and convenience last.**

Performance bottlenecks can be profiled. Infrastructure can be scaled. Frameworks can be replaced. But once a financial system becomes difficult to understand, every future change carries more risk than the last.

## Cross-Cutting Engineering Standards

Every new bounded context must satisfy these enduring standards before being considered production-ready:

| Standard            | Expectation                                     |
| :------------------ | :---------------------------------------------- |
| **Domain Model**    | Explicit entities and state transitions         |
| **Business Events** | Named, versioned, and documented                |
| **Accounting**      | Balanced journals for every financial movement  |
| **Idempotency**     | Safe retry behavior                             |
| **Concurrency**     | Deterministic handling of concurrent operations |
| **Auditability**    | Immutable event history                         |
| **Testing**         | Invariants and integration tests                |
| **Observability**   | Logs, metrics, and alerts                       |
| **Operations**      | Runbook and rollback procedure                  |
| **Documentation**   | ADRs and domain documentation updated           |

## The Responsibility of Every Engineer

When making a change to TRUF Gaming, ask these questions before writing code:

1. **What business event is happening?**
2. **What financial state is changing?**
3. **Does this require a journal entry?**
4. **Which invariant protects this operation?**
5. **Can this operation be retried safely?**
6. **Can an auditor explain this six months from now?**
7. **If this fails halfway through, what guarantees remain true?**

If those questions have clear answers, the implementation usually follows naturally.

## The Purpose of Abstractions

> **Every abstraction exists to protect an invariant. If an abstraction no longer protects one, simplify it. If an invariant is not protected by an abstraction, strengthen the design.**

- The accounting engine protects financial correctness.
- The webhook pipeline protects idempotency and consistency.
- The ledger protects history.
- The operational playbook protects production.
- The engineering handbook protects intent.
- The ADRs protect architectural memory.
- The Financial Event Catalog protects the domain language.

## The Single Source of Truth

> **A system becomes maintainable when every important decision has exactly one authoritative place to live.**

| Concern                | Authoritative Source                |
| :--------------------- | :---------------------------------- |
| Engineering philosophy | Engineering Handbook                |
| Financial rules        | Financial Constitution              |
| Business vocabulary    | Financial Event Catalog _(Phase 3)_ |
| Architecture decisions | ADRs                                |
| Operational procedures | Operational Playbook                |
| Financial history      | Immutable Ledger                    |
| Runtime behavior       | Source Code                         |
| Correctness            | Automated Tests                     |

Whenever tempted to duplicate knowledge, ask: **"Where is the one place this truth should live?"**

## The Legacy Principle

> **Build systems that remain understandable after the original authors are gone.**

Every schema, every journal, every business event, every ADR, every playbook, and every test should help the next engineer answer three questions:

1. **What happened?**
2. **Why did it happen?**
3. **How do I know it's correct?**

If the system can answer those questions without relying on institutional memory, then it has become larger than any individual contributor.

---

_Authored at the conclusion of Phase 2 – Financial Core._
