-- Módulos por perfil — mesmo conteúdo de drizzle/0008_user_module_overrides.sql.
-- Guarda só o que o utilizador ligou/desligou face à predefinição do perfil (shared/modules.ts).
-- Coluna aditiva com default: pode ser aplicada antes de publicar o código que a lê.

alter table public."userProfiles"
  add column "moduleOverrides" jsonb not null default '{}'::jsonb,
  add constraint user_profiles_module_overrides_object_check
    check (jsonb_typeof("moduleOverrides") = 'object');
