import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { InvestmentRatePeriod } from "@shared/investments";
import type { Alternative } from "./types";

export const ratePeriodLabels: Record<InvestmentRatePeriod, string> = {
  mensal: "a.m.",
  anual: "a.a.",
};

export function parseDecimal(value: string) {
  const normalized = value.trim().replace(",", ".");
  return normalized === "" ? 0 : Number(normalized);
}

export function describeParameters(
  alternative: Pick<
    Alternative,
    "initialAmount" | "monthlyContribution" | "termMonths"
  >
) {
  const contribution = Number(alternative.monthlyContribution);
  const initial = Number(alternative.initialAmount);
  const parts = [
    initial > 0 ? formatCurrency(initial) : null,
    contribution > 0 ? `${formatCurrency(contribution)}/mês` : null,
  ].filter(Boolean);
  return `${parts.join(" + ")} · ${alternative.termMonths} ${alternative.termMonths === 1 ? "mês" : "meses"}`;
}

export function describeCosts(
  alternative: Pick<
    Alternative,
    "adminFeeRate" | "fixedCosts" | "incomeTaxRate"
  >
) {
  const parts = [
    Number(alternative.adminFeeRate) > 0
      ? `adm. ${formatPercent(Number(alternative.adminFeeRate), 4)} a.a.`
      : null,
    Number(alternative.fixedCosts) > 0
      ? `fixos ${formatCurrency(alternative.fixedCosts)}`
      : null,
    Number(alternative.incomeTaxRate) > 0
      ? `IR ${formatPercent(Number(alternative.incomeTaxRate))}`
      : "isento de IR",
  ].filter(Boolean);
  return parts.join(" · ");
}
