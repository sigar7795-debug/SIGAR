-- Aplicada no Supabase em 2026-09-24 (apply_migration "property_members_invited_by_idx_and_activity_default").
-- Índice para a FK propertyMembers.invitedById (aviso "unindexed foreign keys" do Supabase)
-- e correção do default de financialEntries.activity, gravado com o "ã" corrompido.

CREATE INDEX IF NOT EXISTS "property_members_invited_by_idx" ON "propertyMembers" ("invitedById");
ALTER TABLE "financialEntries" ALTER COLUMN "activity" SET DEFAULT 'Não informada';
