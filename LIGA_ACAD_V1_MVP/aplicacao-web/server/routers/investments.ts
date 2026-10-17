import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { User } from "../../drizzle/schema.js";
import {
  createInvestmentAlternative,
  deleteInvestmentAlternative,
  listInvestmentAlternatives,
  listPropertyEntries,
  updateInvestmentAlternative,
} from "../db.js";
import { protectedProcedure, router } from "../_core/trpc.js";
import {
  COMPARISON_MAX_CAPITAL,
  COMPARISON_MAX_MONTHS,
  compareRuralActivityWithInvestments,
  countMonths,
  getMonthWindow,
  INVESTMENT_MAX_AMOUNT,
  INVESTMENT_MAX_RATE,
  INVESTMENT_MAX_TERM_MONTHS,
  type InvestmentParameters,
  investmentRatePeriods,
  isValidMonth,
  type MonthWindow,
  roundHalfAwayFromZero,
  summarizeInvestment,
} from "../../shared/investments.js";
import {
  createDemoInvestmentAlternative,
  deleteDemoInvestmentAlternative,
  isDemoOpenId,
  listDemoEntries,
  listDemoInvestmentAlternatives,
  updateDemoInvestmentAlternative,
} from "../demo.js";
import { assertPropertyAccess } from "./propertyAccess.js";

const propertyIdInput = z.number().int().positive();
const alternativeIdInput = z.number().int().positive();
const moneyInput = z.coerce.number().min(0).max(INVESTMENT_MAX_AMOUNT);
const rateInput = z.coerce.number().min(0).max(INVESTMENT_MAX_RATE);
const monthInput = z
  .string()
  .refine(isValidMonth, "Mês inválido. Use o formato AAAA-MM.");

const alternativeFields = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional(),
  initialAmount: moneyInput,
  monthlyContribution: moneyInput.default(0),
  termMonths: z.coerce.number().int().min(1).max(INVESTMENT_MAX_TERM_MONTHS),
  returnRate: rateInput,
  ratePeriod: z.enum(investmentRatePeriods),
  adminFeeRate: rateInput.default(0),
  fixedCosts: moneyInput.default(0),
  incomeTaxRate: rateInput.default(0),
});

// Compara já em centavos: 0,001 seria gravado como 0,00.
function hasInvestedAmount(value: {
  initialAmount: number;
  monthlyContribution: number;
}) {
  return (
    roundHalfAwayFromZero(value.initialAmount) > 0 ||
    roundHalfAwayFromZero(value.monthlyContribution) > 0
  );
}

const investedAmountError = {
  message: "Informe um valor inicial ou um aporte mensal maior que zero.",
  path: ["initialAmount"],
};

const alternativeCreateInput = alternativeFields
  .extend({ propertyId: propertyIdInput })
  .refine(hasInvestedAmount, investedAmountError);

const alternativeUpdateInput = alternativeFields
  .extend({ propertyId: propertyIdInput, alternativeId: alternativeIdInput })
  .refine(hasInvestedAmount, investedAmountError);

function monthSpan(value: { startMonth: string; endMonth: string }) {
  return isValidMonth(value.startMonth) && isValidMonth(value.endMonth)
    ? countMonths(value.startMonth, value.endMonth)
    : null;
}

const compareInput = z
  .object({
    propertyId: propertyIdInput,
    startMonth: monthInput,
    endMonth: monthInput,
    capital: z.coerce.number().positive().max(COMPARISON_MAX_CAPITAL),
    activity: z.string().trim().min(1).max(120).optional(),
  })
  .refine(value => (monthSpan(value) ?? 1) >= 1, {
    message: "O mês final deve ser igual ou posterior ao inicial.",
    path: ["endMonth"],
  })
  .refine(value => (monthSpan(value) ?? 1) <= COMPARISON_MAX_MONTHS, {
    message: `O período pode ter no máximo ${COMPARISON_MAX_MONTHS} meses.`,
    path: ["endMonth"],
  });

function toDecimal(value: number, decimals: number) {
  return roundHalfAwayFromZero(value, decimals).toFixed(decimals);
}

function alternativeValues(input: z.infer<typeof alternativeFields>) {
  return {
    name: input.name,
    description: input.description || null,
    initialAmount: toDecimal(input.initialAmount, 2),
    monthlyContribution: toDecimal(input.monthlyContribution, 2),
    termMonths: input.termMonths,
    returnRate: toDecimal(input.returnRate, 4),
    ratePeriod: input.ratePeriod,
    adminFeeRate: toDecimal(input.adminFeeRate, 4),
    fixedCosts: toDecimal(input.fixedCosts, 2),
    incomeTaxRate: toDecimal(input.incomeTaxRate, 2),
  };
}

function withSimulation<T extends InvestmentParameters>(alternative: T) {
  return { ...alternative, simulation: summarizeInvestment(alternative) };
}

function alternativeNotFound() {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "Alternativa de investimento não encontrada nesta propriedade.",
  });
}

async function loadComparisonData(
  user: User,
  propertyId: number,
  period: MonthWindow
) {
  if (isDemoOpenId(user.openId)) {
    return {
      entries: listDemoEntries(propertyId, period.startDate, period.endDate),
      alternatives: listDemoInvestmentAlternatives(propertyId),
    };
  }
  await assertPropertyAccess(propertyId, user.id, "visualizador");
  const [entries, alternatives] = await Promise.all([
    listPropertyEntries(propertyId, period.startDate, period.endDate),
    listInvestmentAlternatives(propertyId),
  ]);
  return { entries, alternatives };
}

export const investmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ propertyId: propertyIdInput }))
    .query(async ({ ctx, input }) => {
      if (isDemoOpenId(ctx.user.openId)) {
        return listDemoInvestmentAlternatives(input.propertyId).map(
          withSimulation
        );
      }
      await assertPropertyAccess(input.propertyId, ctx.user.id, "visualizador");
      const alternatives = await listInvestmentAlternatives(input.propertyId);
      return alternatives.map(withSimulation);
    }),
  create: protectedProcedure
    .input(alternativeCreateInput)
    .mutation(async ({ ctx, input }) => {
      const values = {
        propertyId: input.propertyId,
        createdById: ctx.user.id,
        ...alternativeValues(input),
      };
      if (isDemoOpenId(ctx.user.openId)) {
        return withSimulation(createDemoInvestmentAlternative(values));
      }
      await assertPropertyAccess(input.propertyId, ctx.user.id, "editor");
      const created = await createInvestmentAlternative(values);
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível cadastrar a alternativa de investimento.",
        });
      }
      return withSimulation(created);
    }),
  update: protectedProcedure
    .input(alternativeUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const values = alternativeValues(input);
      if (isDemoOpenId(ctx.user.openId)) {
        const updated = updateDemoInvestmentAlternative(
          input.propertyId,
          input.alternativeId,
          values
        );
        if (!updated) throw alternativeNotFound();
        return withSimulation(updated);
      }
      await assertPropertyAccess(input.propertyId, ctx.user.id, "editor");
      const updated = await updateInvestmentAlternative(
        input.alternativeId,
        input.propertyId,
        values
      );
      if (!updated) throw alternativeNotFound();
      return withSimulation(updated);
    }),
  delete: protectedProcedure
    .input(
      z.object({
        propertyId: propertyIdInput,
        alternativeId: alternativeIdInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (isDemoOpenId(ctx.user.openId)) {
        if (
          !deleteDemoInvestmentAlternative(
            input.propertyId,
            input.alternativeId
          )
        ) {
          throw alternativeNotFound();
        }
        return { id: input.alternativeId, deleted: true as const };
      }
      await assertPropertyAccess(input.propertyId, ctx.user.id, "editor");
      const deleted = await deleteInvestmentAlternative(
        input.alternativeId,
        input.propertyId
      );
      if (!deleted) throw alternativeNotFound();
      return { id: input.alternativeId, deleted: true as const };
    }),
  compare: protectedProcedure
    .input(compareInput)
    .query(async ({ ctx, input }) => {
      const period = getMonthWindow(input.startMonth, input.endMonth);
      const { entries, alternatives } = await loadComparisonData(
        ctx.user,
        input.propertyId,
        period
      );
      const activityEntries = input.activity
        ? entries.filter(entry => entry.activity === input.activity)
        : entries;
      return {
        activity: input.activity ?? null,
        activities: Array.from(
          new Set(entries.map(entry => entry.activity))
        ).sort(),
        ...compareRuralActivityWithInvestments({
          capital: input.capital,
          startMonth: input.startMonth,
          endMonth: input.endMonth,
          entries: activityEntries,
          alternatives,
        }),
      };
    }),
});
