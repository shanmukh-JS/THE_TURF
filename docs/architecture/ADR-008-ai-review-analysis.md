# ADR-008: AI-Based Sentiment & Topic Analysis

## Context and Problem

Analyzing reviews manually at scale is impossible. Turf owners need automated insights on specific operational aspects (lighting, cleanliness) to improve their service.

## Decision

We implement a decoupled Sentiment Service:

1. **Rule-Based Pre-filter**: Performs immediate local checks using regex dictionary scoring to extract overall sentiment (Positive, Negative, Neutral) and categorize issues (e.g. "dirty washrooms" -> Cleanliness: Negative).
2. **OpenAI Connector Integration**: A background worker task connects to OpenAI to generate high-quality text summaries of multiple reviews for owners, running asynchronously to prevent blocking user actions.

## Consequences & Trade-offs

- **Pros**:
  - Provides actionable, detailed metrics for owners and admins.
- **Cons**:
  - Requires maintaining dictionary datasets and costs API credits if OpenAI is used in production.
