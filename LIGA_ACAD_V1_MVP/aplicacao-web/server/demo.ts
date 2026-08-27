import type {
  FinancialEntry,
  RuralProperty,
  User,
  UserProfile,
  Usuario,
} from "../drizzle/schema";

export const DEMO_OPEN_ID_PREFIX = "sigar-demo:";

const now = new Date();
const demoOwnerId = -1;

function currentMonthDate(day: number) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 12));
}

function previousMonthDate(day: number) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, 12));
}

export function createDemoOpenId(email: string) {
  return `${DEMO_OPEN_ID_PREFIX}${Buffer.from(email.toLowerCase()).toString("base64url")}`;
}

export function isDemoOpenId(openId: string) {
  return openId.startsWith(DEMO_OPEN_ID_PREFIX);
}

export function buildDemoUser(openId: string, name: string): User {
  const encodedEmail = openId.slice(DEMO_OPEN_ID_PREFIX.length);
  let email = "demo@sigar.local";
  try {
    email = Buffer.from(encodedEmail, "base64url").toString("utf8") || email;
  } catch {}

  return {
    id: demoOwnerId,
    openId,
    name,
    email,
    loginMethod: "demonstracao",
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export function getDemoName(email: string) {
  const localPart = email.split("@")[0] ?? "usuario";
  const words = localPart.split(/[._-]+/).filter(Boolean);
  const formatted = words
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
  return formatted || "Usuario de demonstracao";
}

export let demoProfile: UserProfile = {
  id: 1,
  userId: demoOwnerId,
  profileRole: "gestor",
  createdAt: now,
  updatedAt: now,
};

export const demoDomainUsers: Usuario[] = [
  {
    cpf: "52998224725",
    name: "Maria Aparecida Silva",
    sex: "feminino",
    createdById: demoOwnerId,
    createdAt: now,
    updatedAt: now,
  },
  {
    cpf: "11144477735",
    name: "Joao Carlos Ferreira",
    sex: "masculino",
    createdById: demoOwnerId,
    createdAt: now,
    updatedAt: now,
  },
];

export const demoProperties: RuralProperty[] = [
  {
    id: 1,
    ownerId: demoOwnerId,
    name: "Fazenda Santa Luzia",
    municipality: "Araguaina",
    state: "TO",
    totalArea: "482.50",
    mainActivity: "Pecuaria de corte",
    description: "Unidade demonstrativa principal do SIGAR.",
    isActive: true,
    createdAt: previousMonthDate(3),
    updatedAt: currentMonthDate(18),
  },
  {
    id: 2,
    ownerId: demoOwnerId,
    name: "Sitio Boa Esperanca",
    municipality: "Wanderlandia",
    state: "TO",
    totalArea: "96.00",
    mainActivity: "Graos e horticultura",
    description: "Operacao de menor escala para comparacao de resultados.",
    isActive: true,
    createdAt: previousMonthDate(8),
    updatedAt: currentMonthDate(12),
  },
];

export const demoPropertyUsers = new Map<number, string[]>([
  [1, ["52998224725", "11144477735"]],
  [2, ["52998224725"]],
]);

export const demoEntries: FinancialEntry[] = [
  {
    id: 1,
    propertyId: 1,
    createdById: demoOwnerId,
    entryType: "receita",
    category: "Venda de gado",
    activity: "Pecuaria de corte",
    description: "Venda de lote terminado",
    occurredOn: currentMonthDate(5),
    dueOn: currentMonthDate(5),
    settlementStatus: "liquidado",
    settledOn: currentMonthDate(5),
    amount: "96400.00",
    createdAt: currentMonthDate(5),
    updatedAt: currentMonthDate(5),
  },
  {
    id: 2,
    propertyId: 1,
    createdById: demoOwnerId,
    entryType: "custo_producao",
    category: "Nutricao animal",
    activity: "Pecuaria de corte",
    description: "Suplementacao mineral e proteica",
    occurredOn: currentMonthDate(9),
    dueOn: currentMonthDate(20),
    settlementStatus: "liquidado",
    settledOn: currentMonthDate(9),
    amount: "28750.00",
    createdAt: currentMonthDate(9),
    updatedAt: currentMonthDate(9),
  },
  {
    id: 3,
    propertyId: 1,
    createdById: demoOwnerId,
    entryType: "custo_fixo",
    category: "Equipe",
    activity: "Administracao",
    description: "Folha e encargos da propriedade",
    occurredOn: currentMonthDate(14),
    dueOn: currentMonthDate(28),
    settlementStatus: "pendente",
    settledOn: null,
    amount: "14320.00",
    createdAt: currentMonthDate(14),
    updatedAt: currentMonthDate(14),
  },
  {
    id: 4,
    propertyId: 1,
    createdById: demoOwnerId,
    entryType: "imposto",
    category: "Tributos",
    activity: "Administracao",
    description: "Impostos e taxas do periodo",
    occurredOn: currentMonthDate(18),
    dueOn: currentMonthDate(25),
    settlementStatus: "liquidado",
    settledOn: currentMonthDate(18),
    amount: "8100.00",
    createdAt: currentMonthDate(18),
    updatedAt: currentMonthDate(18),
  },
  {
    id: 5,
    propertyId: 1,
    createdById: demoOwnerId,
    entryType: "receita",
    category: "Venda de gado",
    activity: "Pecuaria de corte",
    description: "Venda do periodo anterior",
    occurredOn: previousMonthDate(8),
    dueOn: previousMonthDate(8),
    settlementStatus: "liquidado",
    settledOn: previousMonthDate(8),
    amount: "85700.00",
    createdAt: previousMonthDate(8),
    updatedAt: previousMonthDate(8),
  },
  {
    id: 6,
    propertyId: 1,
    createdById: demoOwnerId,
    entryType: "custo_producao",
    category: "Nutricao animal",
    activity: "Pecuaria de corte",
    description: "Custos do periodo anterior",
    occurredOn: previousMonthDate(13),
    dueOn: previousMonthDate(13),
    settlementStatus: "liquidado",
    settledOn: previousMonthDate(13),
    amount: "48200.00",
    createdAt: previousMonthDate(13),
    updatedAt: previousMonthDate(13),
  },
  {
    id: 7,
    propertyId: 2,
    createdById: demoOwnerId,
    entryType: "receita",
    category: "Graos",
    activity: "Soja",
    description: "Venda parcial da colheita",
    occurredOn: currentMonthDate(7),
    dueOn: currentMonthDate(7),
    settlementStatus: "liquidado",
    settledOn: currentMonthDate(7),
    amount: "38600.00",
    createdAt: currentMonthDate(7),
    updatedAt: currentMonthDate(7),
  },
];

export function getDemoPropertyUsers(propertyId: number) {
  const cpfs = demoPropertyUsers.get(propertyId) ?? [];
  return demoDomainUsers
    .filter(user => cpfs.includes(user.cpf))
    .map(({ cpf, name, sex }) => ({ cpf, name, sex }));
}

export function listDemoEntries(propertyId: number, startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T23:59:59.999Z`).getTime();
  return demoEntries
    .filter(entry => entry.propertyId === propertyId)
    .filter(entry => {
      const occurredAt = entry.occurredOn.getTime();
      return occurredAt >= start && occurredAt <= end;
    })
    .sort((a, b) => b.occurredOn.getTime() - a.occurredOn.getTime());
}

export function saveDemoProfile(profileRole: UserProfile["profileRole"]) {
  demoProfile = { ...demoProfile, profileRole, updatedAt: new Date() };
  return demoProfile;
}

export function createDemoDomainUser(
  values: Pick<Usuario, "cpf" | "name" | "sex">,
) {
  const created: Usuario = {
    ...values,
    createdById: demoOwnerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  demoDomainUsers.unshift(created);
  return created;
}

export function createDemoProperty(values: {
  name: string;
  municipality?: string;
  state?: string;
  totalArea?: number;
  mainActivity?: string;
  description?: string;
  userCpfs: string[];
}) {
  const nextId = Math.max(0, ...demoProperties.map(property => property.id)) + 1;
  const created: RuralProperty = {
    id: nextId,
    ownerId: demoOwnerId,
    name: values.name,
    municipality: values.municipality || null,
    state: values.state || null,
    totalArea: values.totalArea ? values.totalArea.toFixed(2) : null,
    mainActivity: values.mainActivity || null,
    description: values.description || null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  demoProperties.unshift(created);
  demoPropertyUsers.set(nextId, values.userCpfs);
  return created;
}

export function linkDemoPropertyUsers(propertyId: number, userCpfs: string[]) {
  const current = demoPropertyUsers.get(propertyId) ?? [];
  demoPropertyUsers.set(propertyId, Array.from(new Set([...current, ...userCpfs])));
  return getDemoPropertyUsers(propertyId);
}

export function deactivateDemoProperty(propertyId: number) {
  const property = demoProperties.find(item => item.id === propertyId);
  if (property) {
    property.isActive = false;
    property.updatedAt = new Date();
  }
  return { id: propertyId, isActive: false as const };
}

export function createDemoFinancialEntry(
  values: Omit<FinancialEntry, "id" | "createdAt" | "updatedAt">,
) {
  const nextId = Math.max(0, ...demoEntries.map(entry => entry.id)) + 1;
  const created: FinancialEntry = {
    ...values,
    id: nextId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  demoEntries.unshift(created);
  return created;
}

export function updateDemoFinancialEntry(
  entryId: number,
  values: Partial<Omit<FinancialEntry, "id" | "propertyId" | "createdById" | "createdAt" | "updatedAt">>,
) {
  const entry = demoEntries.find(item => item.id === entryId);
  if (!entry) return null;
  Object.assign(entry, values, { updatedAt: new Date() });
  return entry;
}

export function deleteDemoFinancialEntry(entryId: number) {
  const index = demoEntries.findIndex(item => item.id === entryId);
  if (index >= 0) demoEntries.splice(index, 1);
  return { id: entryId, deleted: true as const };
}
