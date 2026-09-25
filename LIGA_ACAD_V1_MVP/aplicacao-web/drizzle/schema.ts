import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("createdAt", { withTimezone: true })
  .defaultNow()
  .notNull();
const updatedAt = timestamp("updatedAt", { withTimezone: true })
  .defaultNow()
  .notNull();

export const accountRole = pgEnum("account_role", ["user", "admin"]);

/** Conta autenticada pela plataforma. */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: accountRole("role").default("user").notNull(),
    createdAt,
    updatedAt,
    lastSignedIn: timestamp("lastSignedIn", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [uniqueIndex("users_open_id_unique").on(table.openId)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userProfileRole = pgEnum("user_profile_role", [
  "produtor",
  "gestor",
  "estudante",
  "consultor",
  "administrador",
]);

export const userProfiles = pgTable(
  "userProfiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    profileRole: userProfileRole("profileRole").notNull(),
    createdAt,
    updatedAt,
  },
  table => [index("user_profiles_role_idx").on(table.profileRole)]
);

/** Sexo informado para a entidade de domínio identificada por CPF. */
export const userSex = pgEnum("user_sex", [
  "feminino",
  "masculino",
  "outro",
  "nao_informar",
]);

/** Pessoa física proprietária, separada da conta técnica de autenticação. */
export const usuarios = pgTable(
  "usuarios",
  {
    cpf: varchar("cpf", { length: 11 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    sex: userSex("sex").notNull().default("nao_informar"),
    createdById: integer("createdById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  table => [index("usuarios_creator_idx").on(table.createdById)]
);

export const ruralProperties = pgTable(
  "ruralProperties",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 140 }).notNull(),
    municipality: varchar("municipality", { length: 100 }),
    state: varchar("state", { length: 2 }),
    totalArea: decimal("totalArea", { precision: 12, scale: 2 }),
    mainActivity: varchar("mainActivity", { length: 120 }),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  table => [index("rural_properties_owner_idx").on(table.ownerId)]
);

/** Relação muitos-para-muitos entre pessoas físicas e propriedades rurais. */
export const usuarioPropriedade = pgTable(
  "usuarioPropriedade",
  {
    userCpf: varchar("userCpf", { length: 11 })
      .notNull()
      .references(() => usuarios.cpf, { onDelete: "cascade" }),
    propertyId: integer("propertyId")
      .notNull()
      .references(() => ruralProperties.id, { onDelete: "cascade" }),
    createdAt,
  },
  table => [
    primaryKey({
      columns: [table.userCpf, table.propertyId],
      name: "usuario_propriedade_pk",
    }),
    index("usuario_propriedade_property_idx").on(table.propertyId),
  ]
);

/** Papel de acesso de uma conta autenticada a uma propriedade. */
export const propertyMemberRole = pgEnum("property_member_role", [
  "proprietario",
  "editor",
  "visualizador",
]);

/** Estado do vínculo/convite de uma conta autenticada a uma propriedade. */
export const propertyMemberStatus = pgEnum("property_member_status", [
  "pendente",
  "ativo",
  "revogado",
  "recusado",
]);

/**
 * Vínculo entre uma conta autenticada (`users`) e uma propriedade, com papel
 * de acesso. Distinto de `usuarioPropriedade`, que liga pessoas físicas por
 * CPF (`usuarios`) sem conceder acesso. O titular técnico
 * (`ruralProperties.ownerId`) é sempre proprietário implícito e não precisa
 * de linha aqui.
 */
export const propertyMembers = pgTable(
  "propertyMembers",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("propertyId")
      .notNull()
      .references(() => ruralProperties.id, { onDelete: "cascade" }),
    userId: integer("userId").references(() => users.id, {
      onDelete: "cascade",
    }),
    invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
    role: propertyMemberRole("role").notNull(),
    status: propertyMemberStatus("status").notNull().default("pendente"),
    invitedById: integer("invitedById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  table => [
    uniqueIndex("property_members_property_email_unique").on(
      table.propertyId,
      table.invitedEmail
    ),
    index("property_members_property_idx").on(table.propertyId),
    index("property_members_user_idx").on(table.userId),
    index("property_members_invited_by_idx").on(table.invitedById),
  ]
);

export const financialEntryType = pgEnum("financial_entry_type", [
  "receita",
  "custo_producao",
  "custo_fixo",
  "custo_variavel",
  "despesa_administrativa",
  "imposto",
  "deducao",
]);

export const financialSettlementStatus = pgEnum("financial_settlement_status", [
  "liquidado",
  "pendente",
]);

export const financialEntries = pgTable(
  "financialEntries",
  {
    id: serial("id").primaryKey(),
    propertyId: integer("propertyId")
      .notNull()
      .references(() => ruralProperties.id, { onDelete: "cascade" }),
    createdById: integer("createdById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryType: financialEntryType("entryType").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    activity: varchar("activity", { length: 120 })
      .notNull()
      .default("Não informada"),
    description: text("description").notNull(),
    occurredOn: date("occurredOn", { mode: "date" }).notNull(),
    dueOn: date("dueOn", { mode: "date" }),
    settlementStatus: financialSettlementStatus("settlementStatus")
      .notNull()
      .default("liquidado"),
    settledOn: date("settledOn", { mode: "date" }),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt,
    updatedAt,
  },
  table => [
    index("financial_entries_property_date_idx").on(
      table.propertyId,
      table.occurredOn
    ),
    index("financial_entries_property_activity_date_idx").on(
      table.propertyId,
      table.activity,
      table.occurredOn
    ),
    index("financial_entries_property_status_idx").on(
      table.propertyId,
      table.settlementStatus
    ),
    index("financial_entries_creator_idx").on(table.createdById),
  ]
);

export const securityEventType = pgEnum("security_event_type", [
  "password_reset_requested",
  "password_reset_completed",
  "password_reset_failed",
  "password_change_completed",
  "password_change_failed",
]);

/**
 * Trilha de eventos de segurança da conta (RF03). Nunca guarda senha, token
 * ou e-mail em claro: o e-mail vira HMAC para permitir correlação sem expor
 * quem pediu a redefinição.
 */
export const securityEvents = pgTable(
  "securityEvents",
  {
    id: serial("id").primaryKey(),
    eventType: securityEventType("eventType").notNull(),
    userId: integer("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    emailHash: varchar("emailHash", { length: 64 }),
    reason: varchar("reason", { length: 64 }),
    ipAddress: varchar("ipAddress", { length: 64 }),
    createdAt,
  },
  table => [
    index("security_events_user_idx").on(table.userId),
    index("security_events_type_created_idx").on(
      table.eventType,
      table.createdAt
    ),
  ]
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type UsuarioPropriedade = typeof usuarioPropriedade.$inferSelect;
export type PropertyMember = typeof propertyMembers.$inferSelect;
export type RuralProperty = typeof ruralProperties.$inferSelect;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type SecurityEventType = (typeof securityEventType.enumValues)[number];
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
