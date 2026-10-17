-- REVIEW ARTIFACT ONLY. Do not execute against production.
-- Prerequisites: approved baseline, preview replay, backup and grandfather backfill.
-- Apply after the schema additions. Validate legacy data separately before VALIDATE.
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "member_order_price_check"
  CHECK ("amount" > 0 AND "monthlyPrice" > 0 AND "currency" = 'KRW'
    AND "durationMonths" IN (1,3,6,9,12,24)
    AND "plan" IN ('PRO','PREMIUM')
    AND "amount"::bigint * 100 = "monthlyPrice"::bigint * "durationMonths" * (100 - "discountPercent")
    AND "discountPercent" IN (0,10,15,20,30)) NOT VALID;
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "member_order_payment_check"
  CHECK ("status" <> 'paid' OR ("providerTransactionId" IS NOT NULL
    AND "paidAt" IS NOT NULL AND "verificationEvidence" IS NOT NULL AND "nonceConsumedAt" IS NOT NULL)) NOT VALID;
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "member_order_application_check"
  CHECK ("appliedAt" IS NULL OR ("subscriptionId" IS NOT NULL
    AND "appliedPeriodStart" IS NOT NULL AND "appliedPeriodEnd" > "appliedPeriodStart")) NOT VALID;
ALTER TABLE "Subscription" ADD CONSTRAINT "member_subscription_period_check"
  CHECK ("policyVersion" IS NULL OR "endDate" > "startDate") NOT VALID;
-- A completed receipt + application is enforced in the same server transaction;
-- the Payment.subscriptionOrderId unique key prevents duplicate receipts.
CREATE UNIQUE INDEX "member_one_pending_order_per_user" ON "SubscriptionOrder" ("userId") WHERE "status" = 'pending';
