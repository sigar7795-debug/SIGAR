import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  financialEntries,
  InsertUser,
  propertyMembers,
  ruralProperties,
  usuarioPropriedade,
  usuarios,
  userProfiles,
  users,
} from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connectionString = process.env.DATABASE_URL;
      const isSupabaseConnection = connectionString.includes("supabase.co");
      let normalizedConnectionString = connectionString;

      if (isSupabaseConnection) {
        const databaseUrl = new URL(connectionString);
        databaseUrl.searchParams.delete("sslmode");
        databaseUrl.searchParams.delete("uselibpqcompat");
        normalizedConnectionString = databaseUrl.toString();
      }

      _pool = new Pool({
        connectionString: normalizedConnectionString,
        max: 1,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
        ssl: isSupabaseConnection
          ? { rejectUnauthorized: false }
          : undefined,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: { ...updateSet, updatedAt: new Date() },
      });
  } catch (error) {
    const databaseError = error as {
      code?: string;
      cause?: { code?: string };
    };
    console.error("[Database] Failed to upsert user", {
      code: databaseError.cause?.code ?? databaseError.code ?? "UNKNOWN",
    });
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("A ligação ao banco de dados não está disponível.");
  return db;
}

export async function getUserProfile(userId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function saveUserProfile(
  userId: number,
  profileRole: (typeof userProfiles.$inferInsert)["profileRole"]
) {
  const db = await requireDb();
  await db
    .insert(userProfiles)
    .values({ userId, profileRole })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { profileRole, updatedAt: new Date() },
    });
  return getUserProfile(userId);
}

export async function listDomainUsersByCreator(createdById: number) {
  const db = await requireDb();
  return db
    .select()
    .from(usuarios)
    .where(eq(usuarios.createdById, createdById))
    .orderBy(desc(usuarios.createdAt));
}

export async function getDomainUserByCpf(cpf: string, createdById: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.cpf, cpf), eq(usuarios.createdById, createdById)))
    .limit(1);
  return result[0] ?? null;
}

export async function createDomainUser(
  values: Omit<typeof usuarios.$inferInsert, "createdAt" | "updatedAt">
) {
  const db = await requireDb();
  await db.insert(usuarios).values(values);
  return getDomainUserByCpf(values.cpf, values.createdById);
}

export async function listPropertyDomainUsers(propertyId: number) {
  const db = await requireDb();
  return db
    .select({ cpf: usuarios.cpf, name: usuarios.name, sex: usuarios.sex })
    .from(usuarioPropriedade)
    .innerJoin(usuarios, eq(usuarioPropriedade.userCpf, usuarios.cpf))
    .where(eq(usuarioPropriedade.propertyId, propertyId))
    .orderBy(usuarios.name);
}

async function assertDomainUsersInTransaction(
  tx: any,
  userCpfs: string[],
  createdById: number
) {
  const selectedUsers = await tx
    .select({ cpf: usuarios.cpf })
    .from(usuarios)
    .where(
      and(
        inArray(usuarios.cpf, userCpfs),
        eq(usuarios.createdById, createdById)
      )
    );
  if (selectedUsers.length !== userCpfs.length) {
    throw new Error(
      "Um ou mais utilizadores selecionados não estão disponíveis para esta conta."
    );
  }
}

export async function listPropertiesByOwner(ownerId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(ruralProperties)
    .where(
      and(
        eq(ruralProperties.ownerId, ownerId),
        eq(ruralProperties.isActive, true)
      )
    )
    .orderBy(desc(ruralProperties.createdAt));
}

export async function getOwnedProperty(propertyId: number, ownerId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(ruralProperties)
    .where(
      and(
        eq(ruralProperties.id, propertyId),
        eq(ruralProperties.ownerId, ownerId),
        eq(ruralProperties.isActive, true)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function getActivePropertyById(propertyId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(ruralProperties)
    .where(
      and(
        eq(ruralProperties.id, propertyId),
        eq(ruralProperties.isActive, true)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function createProperty(
  ownerId: number,
  values: Omit<
    typeof ruralProperties.$inferInsert,
    "id" | "ownerId" | "createdAt" | "updatedAt"
  >
) {
  const db = await requireDb();
  const [created] = await db
    .insert(ruralProperties)
    .values({ ownerId, ...values })
    .returning({ id: ruralProperties.id });
  const createdId = created.id;
  return getOwnedProperty(createdId, ownerId);
}

export async function createPropertyWithUsers(
  ownerId: number,
  values: Omit<
    typeof ruralProperties.$inferInsert,
    "id" | "ownerId" | "createdAt" | "updatedAt"
  >,
  userCpfs: string[]
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await assertDomainUsersInTransaction(tx, userCpfs, ownerId);
    const [created] = await tx
      .insert(ruralProperties)
      .values({ ownerId, ...values })
      .returning({ id: ruralProperties.id });
    const propertyId = created.id;
    await tx
      .insert(usuarioPropriedade)
      .values(userCpfs.map(userCpf => ({ userCpf, propertyId })));
    const property = await tx
      .select()
      .from(ruralProperties)
      .where(eq(ruralProperties.id, propertyId))
      .limit(1);
    return property[0] ?? null;
  });
}

export async function addUsersToProperty(
  propertyId: number,
  ownerId: number,
  userCpfs: string[]
) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await assertDomainUsersInTransaction(tx, userCpfs, ownerId);
    for (const userCpf of userCpfs) {
      const existing = await tx
        .select({ userCpf: usuarioPropriedade.userCpf })
        .from(usuarioPropriedade)
        .where(
          and(
            eq(usuarioPropriedade.userCpf, userCpf),
            eq(usuarioPropriedade.propertyId, propertyId)
          )
        )
        .limit(1);
      if (!existing.length) {
        await tx
          .insert(usuarioPropriedade)
          .values({ userCpf, propertyId })
          .onConflictDoNothing();
      }
    }
  });
  return listPropertyDomainUsers(propertyId);
}

export type EffectiveRole = "proprietario" | "editor" | "visualizador";
export type PropertyWithRole = RuralPropertyRow & { effectiveRole: EffectiveRole };
type RuralPropertyRow = typeof ruralProperties.$inferSelect;

const roleRank: Record<EffectiveRole, number> = {
  visualizador: 0,
  editor: 1,
  proprietario: 2,
};

export function roleMeets(role: EffectiveRole | null, minRole: EffectiveRole) {
  return role !== null && roleRank[role] >= roleRank[minRole];
}

export async function getEffectiveRole(
  propertyId: number,
  userId: number
): Promise<EffectiveRole | null> {
  const db = await requireDb();
  const property = await db
    .select({ ownerId: ruralProperties.ownerId })
    .from(ruralProperties)
    .where(
      and(
        eq(ruralProperties.id, propertyId),
        eq(ruralProperties.isActive, true)
      )
    )
    .limit(1);
  if (!property.length) return null;
  if (property[0].ownerId === userId) return "proprietario";

  const membership = await db
    .select({ role: propertyMembers.role })
    .from(propertyMembers)
    .where(
      and(
        eq(propertyMembers.propertyId, propertyId),
        eq(propertyMembers.userId, userId),
        eq(propertyMembers.status, "ativo")
      )
    )
    .limit(1);
  return membership[0]?.role ?? null;
}

export async function listPropertiesForUser(
  userId: number
): Promise<PropertyWithRole[]> {
  const db = await requireDb();
  const owned = await db
    .select()
    .from(ruralProperties)
    .where(
      and(
        eq(ruralProperties.ownerId, userId),
        eq(ruralProperties.isActive, true)
      )
    );
  const memberRows = await db
    .select({ property: ruralProperties, role: propertyMembers.role })
    .from(propertyMembers)
    .innerJoin(
      ruralProperties,
      eq(propertyMembers.propertyId, ruralProperties.id)
    )
    .where(
      and(
        eq(propertyMembers.userId, userId),
        eq(propertyMembers.status, "ativo"),
        eq(ruralProperties.isActive, true)
      )
    );

  const byId = new Map<number, PropertyWithRole>();
  for (const property of owned) {
    byId.set(property.id, { ...property, effectiveRole: "proprietario" });
  }
  for (const { property, role } of memberRows) {
    if (!byId.has(property.id)) {
      byId.set(property.id, { ...property, effectiveRole: role });
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function listPropertyMembers(propertyId: number) {
  const db = await requireDb();
  return db
    .select({
      id: propertyMembers.id,
      role: propertyMembers.role,
      status: propertyMembers.status,
      invitedEmail: propertyMembers.invitedEmail,
      userId: propertyMembers.userId,
      name: users.name,
      createdAt: propertyMembers.createdAt,
      updatedAt: propertyMembers.updatedAt,
    })
    .from(propertyMembers)
    .leftJoin(users, eq(propertyMembers.userId, users.id))
    .where(eq(propertyMembers.propertyId, propertyId))
    .orderBy(desc(propertyMembers.createdAt));
}

export async function createOrRefreshInvite(
  propertyId: number,
  invitedEmail: string,
  role: EffectiveRole,
  invitedById: number
) {
  const db = await requireDb();
  const matchedUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, invitedEmail))
    .limit(1);
  const userId = matchedUser[0]?.id ?? null;

  const existing = await db
    .select({ id: propertyMembers.id, status: propertyMembers.status })
    .from(propertyMembers)
    .where(
      and(
        eq(propertyMembers.propertyId, propertyId),
        eq(propertyMembers.invitedEmail, invitedEmail)
      )
    )
    .limit(1);

  if (existing.length) {
    const nextStatus = existing[0].status === "ativo" ? "ativo" : "pendente";
    await db
      .update(propertyMembers)
      .set({ role, status: nextStatus, userId, updatedAt: new Date() })
      .where(eq(propertyMembers.id, existing[0].id));
  } else {
    await db.insert(propertyMembers).values({
      propertyId,
      invitedEmail,
      role,
      userId,
      invitedById,
      status: "pendente",
    });
  }

  return listPropertyMembers(propertyId);
}

export async function listPendingInvitesForEmail(email: string) {
  const db = await requireDb();
  return db
    .select({
      id: propertyMembers.id,
      role: propertyMembers.role,
      propertyId: propertyMembers.propertyId,
      propertyName: ruralProperties.name,
      createdAt: propertyMembers.createdAt,
    })
    .from(propertyMembers)
    .innerJoin(
      ruralProperties,
      eq(propertyMembers.propertyId, ruralProperties.id)
    )
    .where(
      and(
        eq(propertyMembers.invitedEmail, email),
        eq(propertyMembers.status, "pendente"),
        eq(ruralProperties.isActive, true)
      )
    )
    .orderBy(desc(propertyMembers.createdAt));
}

export async function acceptInvite(
  memberId: number,
  userId: number,
  email: string
) {
  const db = await requireDb();
  const result = await db
    .update(propertyMembers)
    .set({ userId, status: "ativo", updatedAt: new Date() })
    .where(
      and(
        eq(propertyMembers.id, memberId),
        eq(propertyMembers.invitedEmail, email),
        eq(propertyMembers.status, "pendente")
      )
    )
    .returning({ id: propertyMembers.id });
  return result[0] ?? null;
}

export async function declineInvite(
  memberId: number,
  userId: number,
  email: string
) {
  const db = await requireDb();
  const result = await db
    .update(propertyMembers)
    .set({ status: "recusado", updatedAt: new Date() })
    .where(
      and(
        eq(propertyMembers.id, memberId),
        eq(propertyMembers.invitedEmail, email),
        eq(propertyMembers.status, "pendente")
      )
    )
    .returning({ id: propertyMembers.id });
  return result[0] ?? null;
}

export async function updateMemberRole(
  propertyId: number,
  memberId: number,
  role: EffectiveRole
) {
  const db = await requireDb();
  const result = await db
    .update(propertyMembers)
    .set({ role, updatedAt: new Date() })
    .where(
      and(
        eq(propertyMembers.id, memberId),
        eq(propertyMembers.propertyId, propertyId)
      )
    )
    .returning({ id: propertyMembers.id });
  return result[0] ?? null;
}

export async function revokeMember(propertyId: number, memberId: number) {
  const db = await requireDb();
  const result = await db
    .update(propertyMembers)
    .set({ status: "revogado", updatedAt: new Date() })
    .where(
      and(
        eq(propertyMembers.id, memberId),
        eq(propertyMembers.propertyId, propertyId)
      )
    )
    .returning({ id: propertyMembers.id });
  return result[0] ?? null;
}

type PropertyDeactivationDatabase = {
  update: (table: typeof ruralProperties) => {
    set: (values: { isActive: false; updatedAt: Date }) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
};

export async function deactivatePropertyWithDb(
  db: PropertyDeactivationDatabase,
  propertyId: number,
  updatedAt = new Date()
) {
  await db
    .update(ruralProperties)
    .set({ isActive: false, updatedAt })
    .where(eq(ruralProperties.id, propertyId));
}

export async function deactivateProperty(propertyId: number) {
  const db = await requireDb();
  await deactivatePropertyWithDb(
    db as unknown as PropertyDeactivationDatabase,
    propertyId
  );
  return getActivePropertyById(propertyId);
}

export async function listPropertyEntries(
  propertyId: number,
  startDate: string,
  endDate: string
) {
  const db = await requireDb();
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);
  return db
    .select()
    .from(financialEntries)
    .where(
      and(
        eq(financialEntries.propertyId, propertyId),
        gte(financialEntries.occurredOn, start),
        lte(financialEntries.occurredOn, end)
      )
    )
    .orderBy(desc(financialEntries.occurredOn), desc(financialEntries.id));
}

export async function createFinancialEntry(
  values: Omit<
    typeof financialEntries.$inferInsert,
    "id" | "createdAt" | "updatedAt"
  >
) {
  const db = await requireDb();
  const [createdIdResult] = await db
    .insert(financialEntries)
    .values(values)
    .returning({ id: financialEntries.id });
  const createdId = createdIdResult.id;
  const created = await db
    .select()
    .from(financialEntries)
    .where(eq(financialEntries.id, createdId))
    .limit(1);
  return created[0] ?? null;
}

export async function getPropertyEntry(entryId: number, propertyId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(financialEntries)
    .where(
      and(
        eq(financialEntries.id, entryId),
        eq(financialEntries.propertyId, propertyId)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function updateFinancialEntry(
  entryId: number,
  values: Partial<
    Omit<
      typeof financialEntries.$inferInsert,
      "id" | "propertyId" | "createdById" | "createdAt" | "updatedAt"
    >
  >
) {
  const db = await requireDb();
  await db
    .update(financialEntries)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(financialEntries.id, entryId));

  const result = await db
    .select()
    .from(financialEntries)
    .where(eq(financialEntries.id, entryId))
    .limit(1);
  return result[0] ?? null;
}

export async function deleteFinancialEntry(entryId: number) {
  const db = await requireDb();
  await db.delete(financialEntries).where(eq(financialEntries.id, entryId));
}
