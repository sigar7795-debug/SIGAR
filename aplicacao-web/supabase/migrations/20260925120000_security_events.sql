-- Eventos de segurança de senha (RF03) — mesmo conteúdo de drizzle/0006_security_events.sql.
-- Não guarda senha, token nem e-mail em claro (apenas HMAC do e-mail).

create type public.security_event_type as enum (
  'password_reset_requested',
  'password_reset_completed',
  'password_reset_failed',
  'password_change_completed',
  'password_change_failed'
);

create table public."securityEvents" (
  id serial primary key,
  "eventType" public.security_event_type not null,
  "userId" integer references public.users(id) on delete set null,
  "emailHash" varchar(64),
  reason varchar(64),
  "ipAddress" varchar(64),
  "createdAt" timestamptz not null default now()
);

create index security_events_user_idx on public."securityEvents" ("userId");
create index security_events_type_created_idx on public."securityEvents" ("eventType", "createdAt");

alter table public."securityEvents" enable row level security;
revoke all on table public."securityEvents" from anon, authenticated;
