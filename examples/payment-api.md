# Spec: Payment Processing API with Stripe Integration

**Created:** 2026-02-15T11:00:00Z
**Task:** Build a payment processing API with Stripe integration for subscription billing
**Status:** review-required
**Overall Confidence:** 0.72 🟡

---

## Context

The application currently has no payment processing capability. We need to integrate Stripe to handle subscription billing for premium features. The API must support:
- Creating payment intents for new subscriptions
- Handling Stripe webhooks for payment confirmations and failures
- Idempotency for retry scenarios
- Refunds for cancellations within the refund window

The existing codebase is a Node.js Express API with PostgreSQL. User authentication is handled via JWT. No payment-related tables exist in the database schema yet.

## Steps

### Step 1: Install Stripe SDK and configure API keys
- **What:** Install `stripe` npm package, add environment variables for Stripe secret key and webhook secret, create a Stripe client singleton in `src/lib/stripe.js`
- **Files:** `package.json` (modify), `.env.example` (modify), `src/lib/stripe.js` (new)
- **Dependencies:** Stripe account with API keys
- **Confidence:** 0.88 🟢
  - Requirement Clarity: 0.95
  - Implementation Certainty: 0.95
  - Risk Awareness: 0.75
  - Dependency Clarity: 0.90
- **Risks:** API keys must be kept secure. Webhook secret will be needed before Step 3. Risk of key leakage if not properly gitignored.
- **Verification:** Stripe client initializes without error. Environment variables load correctly. `.env` is in `.gitignore`.

### Step 2: Create payment intent endpoint
- **What:** Add POST `/api/payments/intents` endpoint that creates a Stripe PaymentIntent for a given subscription plan. Return client secret to frontend. Store intent ID in `payment_intents` table with user_id, amount, status.
- **Files:** `src/routes/payments.js` (new), `src/controllers/paymentsController.js` (new), `migrations/YYYYMMDD_create_payment_intents.sql` (new)
- **Dependencies:** Step 1, authenticated user context (JWT middleware)
- **Confidence:** 0.82 🟢
  - Requirement Clarity: 0.85
  - Implementation Certainty: 0.90
  - Risk Awareness: 0.75
  - Dependency Clarity: 0.80
- **Risks:** Database schema for `payment_intents` is not yet defined. Subscription plan pricing is not yet in the codebase — where does amount come from? Unclear if we support multiple currencies.
- **Verification:** Endpoint returns client secret. Database row created. Stripe dashboard shows pending PaymentIntent.

### Step 3: Implement webhook handler for payment events
- **What:** Add POST `/api/payments/webhook` endpoint that verifies Stripe webhook signature and handles `payment_intent.succeeded` and `payment_intent.payment_failed` events. Update `payment_intents` table status and trigger subscription activation/deactivation logic.
- **Files:** `src/routes/payments.js` (modify), `src/controllers/paymentsController.js` (modify), `src/services/subscriptionService.js` (new)
- **Dependencies:** Step 1 (webhook secret), Step 2 (payment_intents table)
- **Confidence:** 0.64 🟡
  - Requirement Clarity: 0.70
  - Implementation Certainty: 0.75
  - Risk Awareness: 0.55
  - Dependency Clarity: 0.60
- **Risks:** **HIGH RISK.** Webhook verification is critical for security. Signature verification failure modes are not well understood. Subscription activation logic does not exist yet — what does "activate subscription" mean in the current system? No user permissions table. Webhook replay attacks if we don't track processed events. Unclear if webhooks should be synchronous or queued.
- **Verification:** Webhook signature verification passes with valid events, rejects invalid signatures. Test events from Stripe CLI trigger correct database updates. **REQUIRES HUMAN REVIEW** — subscription activation side effects need design input.

### Step 4: Add idempotency handling
- **What:** Ensure payment intent creation is idempotent by using user_id + subscription_plan_id as an idempotency key. If a PaymentIntent already exists in `pending` status for this combination, return the existing intent instead of creating a new one.
- **Files:** `src/controllers/paymentsController.js` (modify)
- **Dependencies:** Step 2
- **Confidence:** 0.68 🟡
  - Requirement Clarity: 0.60
  - Implementation Certainty: 0.80
  - Risk Awareness: 0.65
  - Dependency Clarity: 0.70
- **Risks:** Idempotency key strategy is not confirmed. Should we use Stripe's built-in idempotency keys or implement our own? What happens if a user cancels and retries within the idempotency window? Unclear if this should apply to refunds as well.
- **Verification:** Multiple identical requests return the same PaymentIntent ID. Database shows only one row created. **REQUIRES HUMAN REVIEW** — idempotency strategy needs design decision.

### Step 5: Implement error handling and retry logic
- **What:** Add structured error responses for payment failures (card declined, insufficient funds, etc.). Log errors to monitoring service. For transient Stripe API failures (5xx), implement exponential backoff retry (max 3 attempts).
- **Files:** `src/controllers/paymentsController.js` (modify), `src/middleware/errorHandler.js` (modify), `src/lib/stripe.js` (modify)
- **Dependencies:** Step 2, Step 3
- **Confidence:** 0.85 🟢
  - Requirement Clarity: 0.85
  - Implementation Certainty: 0.90
  - Risk Awareness: 0.80
  - Dependency Clarity: 0.85
- **Risks:** Retry logic for webhooks is dangerous — could cause duplicate subscription activations if not idempotent. Error messages must not leak sensitive payment details to client. Monitoring service integration is assumed to exist but not verified.
- **Verification:** Simulate card decline with Stripe test card `4000000000000002`. Verify error response is user-friendly. Simulate Stripe 500 error (via test mode) and confirm retries occur with exponential backoff.

### Step 6: Add refund endpoint
- **What:** Add POST `/api/payments/:intentId/refund` endpoint that creates a Stripe refund for a completed payment. Apply business rules: full refund within 7 days, no refunds after 30 days. Update `payment_intents` table with refund status.
- **Files:** `src/routes/payments.js` (modify), `src/controllers/paymentsController.js` (modify)
- **Dependencies:** Step 2, Step 3
- **Confidence:** 0.58 🟡
  - Requirement Clarity: 0.50
  - Implementation Certainty: 0.75
  - Risk Awareness: 0.55
  - Dependency Clarity: 0.60
- **Risks:** **HIGH RISK.** Refund business rules are not confirmed. "7 days full refund, none after 30 days" is placeholder — actual policy needs Flynn/product confirmation. What happens between 7-30 days? Partial refund? Unclear if refunds should deactivate subscriptions immediately or at period end. Fraud risk if refund endpoint is not properly authorized.
- **Verification:** Refund appears in Stripe dashboard. Database updated. **REQUIRES HUMAN REVIEW AND PRODUCT INPUT** — refund policy must be defined before implementation.

## Chain of Verification

### 1. Payment webhook spoofing (security failure)
**Verification:** Stripe webhooks include a signature header that must be verified using the webhook secret. The `stripe` SDK provides `stripe.webhooks.constructEvent(payload, signature, secret)` which throws on invalid signatures.
**Plan impact:** Step 3 must include signature verification before processing any webhook event. Anti-pattern: trusting webhook body without signature check.

### 2. Double-charging on retry (idempotency failure)
**Verification:** Stripe provides built-in idempotency keys via `Idempotency-Key` header. Our application-level idempotency (Step 4) should complement, not replace, Stripe's mechanism.
**Plan impact:** Step 4 confidence lowered to 0.68 (review) because idempotency strategy needs design decision. Should we use Stripe idempotency keys, database uniqueness constraints, or both?

### 3. Subscription activation when payment fails (business logic failure)
**Verification:** OPEN RISK. No code currently defines "subscription activation" — no `subscriptions` table, no user permissions, no feature flags. Step 3 assumes this exists.
**Plan impact:** Step 3 confidence lowered to 0.64 (review). Subscription service design must be completed before webhook handler can be implemented. Consider splitting into two steps: (a) webhook verification and event storage, (b) subscription activation logic after design is complete.

### 4. Refund policy inconsistency (product risk)
**Verification:** OPEN RISK. Refund rules in Step 6 are placeholder. No product spec exists for refund policy.
**Plan impact:** Step 6 confidence lowered to 0.58 (review). Cannot implement until Flynn/product confirms refund policy. Alternative: implement a feature flag to enable/disable refunds, hard-code conservative policy (no refunds), wait for product input.

### 5. Webhook replay attacks (security failure)
**Verification:** Stripe sends a unique `event.id` with each webhook. If we don't track processed events, a replayed webhook could trigger duplicate subscription activations.
**Plan impact:** Step 3 must include `processed_webhook_events` table or similar to track `event.id` and prevent replays. Adjust Step 3 files list to include migration.

### 6. Currency assumptions (internationalization risk)
**Verification:** Step 2 mentions "amount" but doesn't specify currency. Stripe supports multi-currency, but our database schema and frontend may not.
**Plan impact:** Accepted risk for v1 — assume USD only. Add `currency` column to `payment_intents` table set to 'usd'. Flag for future work: multi-currency support requires price localization and currency conversion.

## Scoring Summary

| Step | Score | RC | IC | RA | DC | Status |
|------|-------|----|----|----|-----|--------|
| Step 1 | 0.88 | 0.95 | 0.95 | 0.75 | 0.90 | proceed |
| Step 2 | 0.82 | 0.85 | 0.90 | 0.75 | 0.80 | proceed |
| Step 3 | 0.64 | 0.70 | 0.75 | 0.55 | 0.60 | review |
| Step 4 | 0.68 | 0.60 | 0.80 | 0.65 | 0.70 | review |
| Step 5 | 0.85 | 0.85 | 0.90 | 0.80 | 0.85 | proceed |
| Step 6 | 0.58 | 0.50 | 0.75 | 0.55 | 0.60 | review |

**Overall:** 0.72 (geometric mean)
**Steps requiring review:** 3 of 6 (Steps 3, 4, 6)
**Flagged dimensions:**
- Requirement Clarity: Steps 4 and 6 are below 0.7 — idempotency strategy and refund policy need product/design input
- Risk Awareness: Steps 3, 4, and 6 are below 0.7 — security and business logic risks are significant and not fully mitigated in the plan
- Dependency Clarity: Step 3 depends on non-existent subscription service — architectural dependency is unclear

---

**Recommendation:** Implement Steps 1, 2, and 5 autonomously. Pause before Step 3 for design review on subscription activation logic. Pause before Step 4 for idempotency strategy decision. Pause before Step 6 for product input on refund policy. Alternatively, consider splitting this into two phases: Phase 1 (Steps 1, 2, 5 — payment intent creation with error handling), Phase 2 (Steps 3, 4, 6 — webhooks, idempotency, refunds after design decisions are resolved).
