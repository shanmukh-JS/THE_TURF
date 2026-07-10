# ADR-007: Rating Engine and Loyalty Point System

## Context and Problem

We want to incentivize players to review their matches to keep ratings fresh and authentic. If the rating flow has high friction or no rewards, reviews will remain extremely low.

## Decision

We implement:

1. **Time-Delayed Requests**: Post-match rating notifications are queued with a 5-minute delay using BullMQ.
2. **Loyalty Rewards**: Users receive XP and coin updates directly in their Supabase profile upon successful rating submission.
3. **One-Time Token**: Review links contain a secure UUID token that is marked `used` immediately upon submission, preventing double-reviews.

## Consequences & Trade-offs

- **Pros**:
  - Gamification increases reviews.
  - One-time tokens prevent review-bombing.
- **Cons**:
  - Requires maintaining XP logic in the database profile fields.
