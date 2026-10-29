import {
  calculateFinancialSummary,
  type FinancialEntryForCalculation,
} from "./financial.js";

export const investmentRatePeriods = ["mensal", "anual"] as const;
export type InvestmentRatePeriod = (typeof investmentRatePeriods)[number];

// Limites partilhados pelo formulário e pelo servidor (RN10): nenhum campo
// aceita valores negativos e todas as taxas ficam entre 0% e 100%.
export const INVESTMENT_MAX_AMOUNT = 999_999_999;
export const INVESTMENT_MAX_TERM_MONTHS = 360;
export const INVESTMENT_MAX_RATE = 100;
export const COMPARISON_MAX_CAPITAL = 999_999_999_999;
export const COMPARISON_MAX_MONTHS = 120;

export type InvestmentParameters = {
  initialAmount: number | string;
  monthlyContribution: number | string;
  termMonths: number | string;
  /** Taxa de retorno bruta, em % ao período indicado por `ratePeriod`. */
  returnRate: number | string;
  ratePeriod: InvestmentRatePeriod;
  /** Taxa de administração ou custódia, em % ao ano sobre o saldo. */
  adminFeeRate: number | string;
  /** Custos cobrados uma única vez, na aplicação inicial (R$). */
  fixedCosts: number | string;
  /** Alíquota sobre o rendimento, descontada no resgate (%). */
  incomeTaxRate: number | string;
};

/** Situação acumulada ao fim de cada mês (mês 0 = data da aplicação). */
export type InvestmentSnapshot = {
  month: number;
  contributed: number;
  grossYield: number;
  adminFees: number;
  grossBalance: number;
  incomeTax: number;
  netBalance: number;
  netReturn: number;
};

export type InvestmentSimulation = {
  termMonths: number;
  /** Taxas equivalentes em %, com 4 casas decimais. */
  monthlyRate: number;
  annualRate: number;
  monthlyAdminFeeRate: number;
  totalContributed: number;
  grossYield: number;
  adminFees: number;
  grossBalance: number;
  incomeTax: number;
  netBalance: number;
  fixedCosts: number;
  totalCosts: number;
  netReturn: number;
  /** Retorno líquido ÷ valor aplicado, em %; nulo sem valor aplicado. */
  netReturnRate: number | null;
  timeline: InvestmentSnapshot[];
};

export type InvestmentSummary = Omit<InvestmentSimulation, "timeline">;

/**
 * Arredondamento comercial: o meio afasta-se do zero (2,345 → 2,35 e
 * −2,345 → −2,35). A vírgula é deslocada pela notação exponencial para não
 * herdar o erro binário de multiplicar por 100 (1,005 × 100 = 100,4999…).
 */
export function roundHalfAwayFromZero(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return value;
  const magnitude = Math.abs(value);
  const digits = String(magnitude);
  const rounded = digits.includes("e")
    ? Math.round(magnitude * 10 ** decimals) / 10 ** decimals
    : Number(`${Math.round(Number(`${digits}e${decimals}`))}e-${decimals}`);
  return rounded === 0 ? 0 : Math.sign(value) * rounded;
}

function roundMoney(value: number) {
  return roundHalfAwayFromZero(value, 2);
}

/**
 * `percent`% de um valor em reais, em aritmética inteira (centavos ×
 * centésimos de ponto percentual): 1.609,50 × 15% dá exatamente 241,425 e
 * arredonda para 241,43, enquanto 1609.5 * 0.15 resulta em 241,42499….
 */
function percentOfMoney(amount: number, percent: number) {
  const cents = Math.round(amount * 100);
  const hundredthsOfPercent = Math.round(percent * 100);
  return roundHalfAwayFromZero((cents * hundredthsOfPercent) / 10_000, 0) / 100;
}

function toNonNegativeNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toRatePercent(value: number | string | null | undefined) {
  return Math.min(toNonNegativeNumber(value), INVESTMENT_MAX_RATE);
}

/** Taxa mensal equivalente (fração) a uma taxa em % ao mês ou ao ano. */
export function toMonthlyRate(
  ratePercent: number,
  period: InvestmentRatePeriod
) {
  const rate = ratePercent / 100;
  return period === "mensal" ? rate : (1 + rate) ** (1 / 12) - 1;
}

/**
 * Fração do saldo cobrada por mês para que 12 cobranças consumam exatamente
 * a taxa anual de um saldo sem rendimento.
 */
export function toMonthlyAdminFee(annualFeePercent: number) {
  return 1 - (1 - annualFeePercent / 100) ** (1 / 12);
}

/**
 * Alíquota da tabela regressiva do IR sobre renda fixa (Lei 11.033/2004),
 * contando o prazo em meses de 30 dias: até 180 dias, 22,5%; até 360, 20%;
 * até 720, 17,5%; acima disso, 15%.
 */
export function suggestIncomeTaxRate(termMonths: number) {
  if (termMonths <= 6) return 22.5;
  if (termMonths <= 12) return 20;
  if (termMonths <= 24) return 17.5;
  return 15;
}

type RunningTotals = {
  contributed: number;
  grossYield: number;
  adminFees: number;
};

// Cada componente é arredondado a 2 casas e os saldos são somas desses
// componentes já arredondados, para que os quadros fechem ao centavo.
function snapshotOf(
  month: number,
  totals: RunningTotals,
  taxPercent: number,
  fixedCosts: number
): InvestmentSnapshot {
  const contributed = roundMoney(totals.contributed);
  const grossYield = roundMoney(totals.grossYield);
  const adminFees = roundMoney(totals.adminFees);
  const grossBalance = roundMoney(contributed + grossYield - adminFees);
  const incomeTax = percentOfMoney(
    Math.max(0, grossBalance - contributed),
    taxPercent
  );
  const netBalance = roundMoney(grossBalance - incomeTax);
  return {
    month,
    contributed,
    grossYield,
    adminFees,
    grossBalance,
    incomeTax,
    netBalance,
    netReturn: roundMoney(netBalance - contributed - fixedCosts),
  };
}

/**
 * Simula mês a mês: o saldo rende a taxa mensal equivalente, paga a taxa de
 * administração sobre o saldo e recebe o aporte ao fim de cada mês. O IR
 * incide sobre o rendimento positivo no resgate; os custos fixos são pagos
 * à parte, na aplicação inicial.
 */
export function simulateInvestment(
  parameters: InvestmentParameters
): InvestmentSimulation {
  const initialAmount = toNonNegativeNumber(parameters.initialAmount);
  const monthlyContribution = toNonNegativeNumber(
    parameters.monthlyContribution
  );
  const termMonths = Math.min(
    Math.floor(toNonNegativeNumber(parameters.termMonths)),
    INVESTMENT_MAX_TERM_MONTHS
  );
  const monthlyRate = toMonthlyRate(
    toRatePercent(parameters.returnRate),
    parameters.ratePeriod
  );
  const monthlyFee = toMonthlyAdminFee(toRatePercent(parameters.adminFeeRate));
  const taxPercent = toRatePercent(parameters.incomeTaxRate);
  const fixedCosts = roundMoney(toNonNegativeNumber(parameters.fixedCosts));

  let balance = initialAmount;
  const totals: RunningTotals = {
    contributed: initialAmount,
    grossYield: 0,
    adminFees: 0,
  };
  const timeline = [snapshotOf(0, totals, taxPercent, fixedCosts)];

  for (let month = 1; month <= termMonths; month += 1) {
    const monthYield = balance * monthlyRate;
    const monthFee = (balance + monthYield) * monthlyFee;
    balance += monthYield - monthFee + monthlyContribution;
    totals.contributed += monthlyContribution;
    totals.grossYield += monthYield;
    totals.adminFees += monthFee;
    timeline.push(snapshotOf(month, totals, taxPercent, fixedCosts));
  }

  const final = timeline[timeline.length - 1];
  return {
    termMonths,
    monthlyRate: roundHalfAwayFromZero(monthlyRate * 100, 4),
    annualRate: roundHalfAwayFromZero(((1 + monthlyRate) ** 12 - 1) * 100, 4),
    monthlyAdminFeeRate: roundHalfAwayFromZero(monthlyFee * 100, 4),
    totalContributed: final.contributed,
    grossYield: final.grossYield,
    adminFees: final.adminFees,
    grossBalance: final.grossBalance,
    incomeTax: final.incomeTax,
    netBalance: final.netBalance,
    fixedCosts,
    totalCosts: roundMoney(final.adminFees + fixedCosts + final.incomeTax),
    netReturn: final.netReturn,
    netReturnRate:
      final.contributed > 0
        ? roundHalfAwayFromZero((final.netReturn / final.contributed) * 100)
        : null,
    timeline,
  };
}

export function summarizeInvestment(
  parameters: InvestmentParameters
): InvestmentSummary {
  const { timeline: _timeline, ...summary } = simulateInvestment(parameters);
  return summary;
}

// Meses no formato AAAA-MM. Anos abaixo de 1900 ficam de fora porque
// Date.UTC trata 0–99 como 1900–1999.
const MONTH_PATTERN = /^(19|2\d)\d{2}-(0[1-9]|1[0-2])$/;

export function isValidMonth(value: string) {
  return MONTH_PATTERN.test(value);
}

function parseMonth(value: string) {
  if (!isValidMonth(value)) throw new Error("O mês informado é inválido.");
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

export function shiftMonth(value: string, delta: number) {
  const { year, month } = parseMonth(value);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Quantidade de meses de `startMonth` a `endMonth`, contando os dois. */
export function countMonths(startMonth: string, endMonth: string) {
  const start = parseMonth(startMonth);
  const end = parseMonth(endMonth);
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

export function listMonths(startMonth: string, count: number) {
  return Array.from({ length: count }, (_, index) =>
    shiftMonth(startMonth, index)
  );
}

export type MonthWindow = {
  startMonth: string;
  endMonth: string;
  months: number;
  startDate: string;
  endDate: string;
};

/** Datas que cobrem meses inteiros: do dia 1 do mês inicial ao último dia do final. */
export function getMonthWindow(
  startMonth: string,
  endMonth: string
): MonthWindow {
  const months = countMonths(startMonth, endMonth);
  if (months < 1) {
    throw new Error("O mês final deve ser igual ou posterior ao inicial.");
  }
  const end = parseMonth(endMonth);
  const lastDay = new Date(Date.UTC(end.year, end.month, 0)).getUTCDate();
  return {
    startMonth,
    endMonth,
    months,
    startDate: `${startMonth}-01`,
    endDate: `${endMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export type DatedFinancialEntry = FinancialEntryForCalculation & {
  occurredOn: Date | string;
};

export type InvestmentAlternativeForComparison = InvestmentParameters & {
  id: number;
  name: string;
};

export type ComparisonOutcome = "rural" | "alternativa" | "empate";

export type AlternativeComparison = {
  id: number;
  name: string;
  netBalance: number;
  netReturn: number;
  /** Retorno líquido ÷ capital, em % no período. */
  returnRate: number | null;
  adminFees: number;
  fixedCosts: number;
  incomeTax: number;
  /** Lucro líquido rural − retorno líquido da alternativa. */
  ruralAdvantage: number;
  outcome: ComparisonOutcome;
  isBest: boolean;
};

export type ComparisonTimelinePoint = {
  /** Meses decorridos desde o início do período. */
  index: number;
  /** Mês encerrado neste ponto; nulo no início. */
  month: string | null;
  rural: number;
  alternatives: Record<string, number>;
};

export type RuralInvestmentComparison = {
  period: MonthWindow;
  capital: number;
  rural: {
    netProfit: number;
    totalRevenue: number;
    totalOutflows: number;
    returnRate: number | null;
    entryCount: number;
  };
  alternatives: AlternativeComparison[];
  /** Nulo quando não há alternativas cadastradas. */
  opportunityCost: {
    value: number;
    /** Nulo quando nenhuma alternativa rende: vale manter o capital parado. */
    alternativeId: number | null;
    alternativeName: string | null;
  } | null;
  economicProfit: number | null;
  verdict: ComparisonOutcome | null;
  timeline: ComparisonTimelinePoint[];
};

function outcomeOf(ruralAdvantage: number): ComparisonOutcome {
  if (ruralAdvantage > 0) return "rural";
  if (ruralAdvantage < 0) return "alternativa";
  return "empate";
}

function monthOf(entry: DatedFinancialEntry) {
  const value = entry.occurredOn;
  return (value instanceof Date ? value.toISOString() : value).slice(0, 7);
}

function returnRateOf(amount: number, capital: number) {
  return capital > 0 ? roundHalfAwayFromZero((amount / capital) * 100) : null;
}

/**
 * Compara, no mesmo período e sobre o mesmo capital (RN07), o lucro líquido
 * da atividade rural com o que esse capital renderia em cada alternativa.
 * Cada alternativa é aplicada de uma vez no início do período e mantida pelo
 * número de meses do período; o seu prazo e aportes próprios valem apenas
 * para a simulação individual.
 */
export function compareRuralActivityWithInvestments(input: {
  capital: number;
  startMonth: string;
  endMonth: string;
  entries: DatedFinancialEntry[];
  alternatives: InvestmentAlternativeForComparison[];
}): RuralInvestmentComparison {
  const period = getMonthWindow(input.startMonth, input.endMonth);
  const capital = roundMoney(toNonNegativeNumber(input.capital));
  const entries = input.entries.filter(entry => {
    const month = monthOf(entry);
    return month >= period.startMonth && month <= period.endMonth;
  });
  const ruralSummary = calculateFinancialSummary(entries);
  const netProfit = ruralSummary.netProfit;

  const simulations = input.alternatives.map(alternative => ({
    alternative,
    simulation: simulateInvestment({
      ...alternative,
      initialAmount: capital,
      monthlyContribution: 0,
      termMonths: period.months,
    }),
  }));
  const best = simulations.reduce<(typeof simulations)[number] | null>(
    (current, item) =>
      !current || item.simulation.netReturn > current.simulation.netReturn
        ? item
        : current,
    null
  );

  const alternatives = simulations
    .map(({ alternative, simulation }) => {
      const ruralAdvantage = roundMoney(netProfit - simulation.netReturn);
      return {
        id: alternative.id,
        name: alternative.name,
        netBalance: simulation.netBalance,
        netReturn: simulation.netReturn,
        returnRate: returnRateOf(simulation.netReturn, capital),
        adminFees: simulation.adminFees,
        fixedCosts: simulation.fixedCosts,
        incomeTax: simulation.incomeTax,
        ruralAdvantage,
        outcome: outcomeOf(ruralAdvantage),
        isBest: best?.alternative.id === alternative.id,
      };
    })
    .sort((left, right) => right.netReturn - left.netReturn);

  // Manter o capital parado (0%) é sempre possível, por isso o custo de
  // oportunidade nunca fica negativo.
  const bestReturns = best !== null && best.simulation.netReturn > 0;
  const opportunityCost = best
    ? {
        value: bestReturns ? best.simulation.netReturn : 0,
        alternativeId: bestReturns ? best.alternative.id : null,
        alternativeName: bestReturns ? best.alternative.name : null,
      }
    : null;
  const economicProfit = opportunityCost
    ? roundMoney(netProfit - opportunityCost.value)
    : null;

  const timeline: ComparisonTimelinePoint[] = [
    {
      index: 0,
      month: null,
      rural: 0,
      alternatives: Object.fromEntries(
        simulations.map(({ alternative, simulation }) => [
          String(alternative.id),
          simulation.timeline[0].netReturn,
        ])
      ),
    },
    ...listMonths(period.startMonth, period.months).map((month, index) => ({
      index: index + 1,
      month,
      rural: calculateFinancialSummary(
        entries.filter(entry => monthOf(entry) <= month)
      ).netProfit,
      alternatives: Object.fromEntries(
        simulations.map(({ alternative, simulation }) => [
          String(alternative.id),
          simulation.timeline[index + 1].netReturn,
        ])
      ),
    })),
  ];

  return {
    period,
    capital,
    rural: {
      netProfit,
      totalRevenue: ruralSummary.totalRevenue,
      totalOutflows: roundMoney(ruralSummary.totalRevenue - netProfit),
      returnRate: returnRateOf(netProfit, capital),
      entryCount: entries.length,
    },
    alternatives,
    opportunityCost,
    economicProfit,
    verdict: economicProfit === null ? null : outcomeOf(economicProfit),
    timeline,
  };
}
