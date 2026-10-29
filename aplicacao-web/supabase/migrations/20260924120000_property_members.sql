-- Membros de propriedade (RF07, RF57, RN09, RNF09) — mesmo conteúdo de drizzle/0004_property_members.sql.
-- Já aplicada em produção manualmente; registrada no histórico em 2026-09-24.

create type public.property_member_role as enum ('proprietario', 'editor', 'visualizador');
create type public.property_member_status as enum ('pendente', 'ativo', 'revogado', 'recusado');

create table public."propertyMembers" (
  id serial primary key,
  "propertyId" integer not null references public."ruralProperties"(id) on delete cascade,
  "userId" integer references public.users(id) on delete cascade,
  "invitedEmail" varchar(320) not null,
  role public.property_member_role not null,
  status public.property_member_status not null default 'pendente',
  "invitedById" integer not null references public.users(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index property_members_property_email_unique on public."propertyMembers" ("propertyId", "invitedEmail");
create index property_members_property_idx on public."propertyMembers" ("propertyId");
create index property_members_user_idx on public."propertyMembers" ("userId");

alter table public."propertyMembers" enable row level security;
revoke all on table public."propertyMembers" from anon, authenticated;
