-- PostgreSQL migration for per-profile module overrides.
-- Same content as supabase/migrations/20261113120000_user_module_overrides.sql.
-- Stores only what the user turned on/off relative to the profile preset (shared/modules.ts).

ALTER TABLE "userProfiles"
  ADD COLUMN "moduleOverrides" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT "user_profiles_module_overrides_object_check"
    CHECK (jsonb_typeof("moduleOverrides") = 'object');
