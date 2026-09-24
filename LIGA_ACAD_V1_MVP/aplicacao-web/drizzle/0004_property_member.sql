-- PostgreSQL migration for property membership/access control (RF07, RF57, RN09, RNF09).
-- Apply manually against Supabase (SQL editor or psql) — see docs/membros-propriedade.md.
-- Written in PostgreSQL syntax to match drizzle/schema.ts and the real database,
-- unlike the stale MySQL-dialect files 0000-0003 in this folder.

CREATE TYPE "property_member_role" AS ENUM ('proprietario', 'editor', 'visualizador');
CREATE TYPE "property_member_status" AS ENUM ('pendente', 'ativo', 'revogado', 'recusado');

CREATE TABLE "propertyMembers" (
  "id" serial PRIMARY KEY,
  "propertyId" integer NOT NULL REFERENCES "ruralProperties"("id") ON DELETE CASCADE,
  "userId" integer REFERENCES "users"("id") ON DELETE CASCADE,
  "invitedEmail" varchar(320) NOT NULL,
  "role" "property_member_role" NOT NULL,
  "status" "property_member_status" NOT NULL DEFAULT 'pendente',
  "invitedById" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "property_members_property_email_unique" ON "propertyMembers" ("propertyId", "invitedEmail");
CREATE INDEX "property_members_property_idx" ON "propertyMembers" ("propertyId");
CREATE INDEX "property_members_user_idx" ON "propertyMembers" ("userId");