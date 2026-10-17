-- PostgreSQL migration for investment alternatives and opportunity cost (RF26–RF31, RN07).
-- Same content as supabase/migrations/20261016120000_investment_alternatives.sql.
-- Stores only each alternative's parameters; returns and comparisons are recalculated by the app.

CREATE TYPE "investment_rate_period" AS ENUM ('mensal', 'anual');

CREATE TABLE "investmentAlternatives" (
  "id" serial PRIMARY KEY,
  "propertyId" integer NOT NULL REFERENCES "ruralProperties"("id") ON DELETE CASCADE,
  "createdById" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(120) NOT NULL,
  "description" text,
  "initialAmount" numeric(14, 2) NOT NULL,
  "monthlyContribution" numeric(14, 2) NOT NULL DEFAULT 0,
  "termMonths" integer NOT NULL,
  "returnRate" numeric(7, 4) NOT NULL,
  "ratePeriod" "investment_rate_period" NOT NULL DEFAULT 'anual',
  "adminFeeRate" numeric(7, 4) NOT NULL DEFAULT 0,
  "fixedCosts" numeric(14, 2) NOT NULL DEFAULT 0,
  "incomeTaxRate" numeric(5, 2) NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "investment_alternatives_amounts_check" CHECK (
    "initialAmount" >= 0 AND "monthlyContribution" >= 0 AND "fixedCosts" >= 0
    AND ("initialAmount" > 0 OR "monthlyContribution" > 0)
  ),
  CONSTRAINT "investment_alternatives_term_check" CHECK ("termMonths" BETWEEN 1 AND 360),
  CONSTRAINT "investment_alternatives_rates_check" CHECK (
    "returnRate" BETWEEN 0 AND 100
    AND "adminFeeRate" BETWEEN 0 AND 100
    AND "incomeTaxRate" BETWEEN 0 AND 100
  )
);

CREATE INDEX "investment_alternatives_property_idx" ON "investmentAlternatives" ("propertyId");
CREATE INDEX "investment_alternatives_creator_idx" ON "investmentAlternatives" ("createdById");

CREATE TRIGGER "investment_alternatives_set_updated_at"
BEFORE UPDATE ON "investmentAlternatives"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

ALTER TABLE "investmentAlternatives" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "investmentAlternatives" FROM anon, authenticated;
