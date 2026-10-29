CREATE INDEX IF NOT EXISTS "property_members_invited_by_idx" ON "propertyMembers" ("invitedById");
ALTER TABLE "financialEntries" ALTER COLUMN "activity" SET DEFAULT 'Não informada';
