-- PostgreSQL migration for password security events (RF03).
-- Same content as supabase/migrations/20260925120000_security_events.sql.
-- Stores no password, token or plain e-mail (only an HMAC of the e-mail).

CREATE TYPE "security_event_type" AS ENUM (
  'password_reset_requested',
  'password_reset_completed',
  'password_reset_failed',
  'password_change_completed',
  'password_change_failed'
);

CREATE TABLE "securityEvents" (
  "id" serial PRIMARY KEY,
  "eventType" "security_event_type" NOT NULL,
  "userId" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "emailHash" varchar(64),
  "reason" varchar(64),
  "ipAddress" varchar(64),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "security_events_user_idx" ON "securityEvents" ("userId");
CREATE INDEX "security_events_type_created_idx" ON "securityEvents" ("eventType", "createdAt");

ALTER TABLE "securityEvents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "securityEvents" FROM anon, authenticated;
