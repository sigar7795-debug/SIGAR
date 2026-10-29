-- Alternativas de investimento e custo de oportunidade (RF26–RF31, RN07) — mesmo conteúdo de drizzle/0007_investment_alternatives.sql.
-- Guarda só os parâmetros de cada alternativa; retornos e comparações são recalculados pela aplicação.

create type public.investment_rate_period as enum ('mensal', 'anual');

create table public."investmentAlternatives" (
  id serial primary key,
  "propertyId" integer not null references public."ruralProperties"(id) on delete cascade,
  "createdById" integer not null references public.users(id) on delete cascade,
  name varchar(120) not null,
  description text,
  "initialAmount" numeric(14, 2) not null,
  "monthlyContribution" numeric(14, 2) not null default 0,
  "termMonths" integer not null,
  "returnRate" numeric(7, 4) not null,
  "ratePeriod" public.investment_rate_period not null default 'anual',
  "adminFeeRate" numeric(7, 4) not null default 0,
  "fixedCosts" numeric(14, 2) not null default 0,
  "incomeTaxRate" numeric(5, 2) not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint investment_alternatives_amounts_check check (
    "initialAmount" >= 0 and "monthlyContribution" >= 0 and "fixedCosts" >= 0
    and ("initialAmount" > 0 or "monthlyContribution" > 0)
  ),
  constraint investment_alternatives_term_check check ("termMonths" between 1 and 360),
  constraint investment_alternatives_rates_check check (
    "returnRate" between 0 and 100
    and "adminFeeRate" between 0 and 100
    and "incomeTaxRate" between 0 and 100
  )
);

create index investment_alternatives_property_idx on public."investmentAlternatives" ("propertyId");
create index investment_alternatives_creator_idx on public."investmentAlternatives" ("createdById");

create trigger investment_alternatives_set_updated_at
before update on public."investmentAlternatives"
for each row execute function public.set_updated_at();

alter table public."investmentAlternatives" enable row level security;
revoke all on table public."investmentAlternatives" from anon, authenticated;
