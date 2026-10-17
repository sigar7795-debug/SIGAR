import { describe, expect, it } from "vitest";
import {
  compareRuralActivityWithInvestments,
  countMonths,
  getMonthWindow,
  type InvestmentParameters,
  isValidMonth,
  roundHalfAwayFromZero,
  shiftMonth,
  simulateInvestment,
  suggestIncomeTaxRate,
  summarizeInvestment,
  toMonthlyAdminFee,
  toMonthlyRate,
} from "./investments";

const lumpSum: InvestmentParameters = {
  initialAmount: 10000,
  monthlyContribution: 0,
  termMonths: 12,
  returnRate: 1,
  ratePeriod: "mensal",
  adminFeeRate: 0,
  fixedCosts: 0,
  incomeTaxRate: 0,
};

function compoundFutureValue(
  initial: number,
  contribution: number,
  monthlyRate: number,
  months: number
) {
  const growth = (1 + monthlyRate) ** months;
  return initial * growth + contribution * ((growth - 1) / monthlyRate);
}

describe("roundHalfAwayFromZero", () => {
  it("arredonda o meio centavo para longe do zero sem herdar erro binário", () => {
    expect(roundHalfAwayFromZero(1.005)).toBe(1.01);
    expect(roundHalfAwayFromZero(2.345)).toBe(2.35);
    expect(roundHalfAwayFromZero(-2.345)).toBe(-2.35);
    expect(roundHalfAwayFromZero(1234.564)).toBe(1234.56);
    expect(roundHalfAwayFromZero(0.94887929, 4)).toBe(0.9489);
  });

  it("não devolve zero negativo", () => {
    expect(Object.is(roundHalfAwayFromZero(-0.001), 0)).toBe(true);
  });
});

describe("conversão de taxas", () => {
  it("mantém a taxa mensal e converte a anual pela equivalência composta", () => {
    expect(toMonthlyRate(1, "mensal")).toBe(0.01);
    expect((1 + toMonthlyRate(12, "anual")) ** 12).toBeCloseTo(1.12, 12);
  });

  it("cobra a taxa de administração anual inteira em 12 meses de saldo parado", () => {
    expect((1 - toMonthlyAdminFee(1)) ** 12).toBeCloseTo(0.99, 12);
    expect(toMonthlyAdminFee(0)).toBe(0);
  });

  it("sugere a alíquota da tabela regressiva do IR pelo prazo", () => {
    expect(suggestIncomeTaxRate(6)).toBe(22.5);
    expect(suggestIncomeTaxRate(7)).toBe(20);
    expect(suggestIncomeTaxRate(12)).toBe(20);
    expect(suggestIncomeTaxRate(24)).toBe(17.5);
    expect(suggestIncomeTaxRate(25)).toBe(15);
  });
});

describe("simulateInvestment", () => {
  it("calcula aplicação única com taxa mensal (juros compostos)", () => {
    const result = summarizeInvestment(lumpSum);

    expect(result).toMatchObject({
      totalContributed: 10000,
      grossYield: 1268.25,
      grossBalance: 11268.25,
      netBalance: 11268.25,
      netReturn: 1268.25,
      netReturnRate: 12.68,
      monthlyRate: 1,
      annualRate: 12.6825,
    });
    expect(result.grossBalance).toBe(
      roundHalfAwayFromZero(compoundFutureValue(10000, 0, 0.01, 12))
    );
  });

  it("soma aportes mensais ao fim de cada mês", () => {
    const result = summarizeInvestment({
      ...lumpSum,
      monthlyContribution: 500,
    });

    expect(result).toMatchObject({
      totalContributed: 16000,
      grossYield: 1609.5,
      grossBalance: 17609.5,
      netReturn: 1609.5,
      netReturnRate: 10.06,
    });
    expect(result.grossBalance).toBe(
      roundHalfAwayFromZero(compoundFutureValue(10000, 500, 0.01, 12))
    );
  });

  it("aceita apenas aportes, sem valor inicial", () => {
    const result = summarizeInvestment({
      ...lumpSum,
      initialAmount: 0,
      monthlyContribution: 1000,
      returnRate: 0.5,
      termMonths: 24,
    });

    expect(result).toMatchObject({
      totalContributed: 24000,
      grossBalance: 25431.96,
      netReturn: 1431.96,
      netReturnRate: 5.97,
    });
  });

  it("converte a taxa anual e respeita prazos distintos", () => {
    const annual = { ...lumpSum, returnRate: 12, ratePeriod: "anual" as const };

    expect(summarizeInvestment(annual)).toMatchObject({
      grossBalance: 11200,
      netReturnRate: 12,
      monthlyRate: 0.9489,
      annualRate: 12,
    });
    expect(summarizeInvestment({ ...annual, termMonths: 6 }).grossBalance).toBe(
      10583.01
    );
    expect(
      summarizeInvestment({ ...annual, termMonths: 24 }).grossBalance
    ).toBe(12544);
    expect(summarizeInvestment({ ...annual, termMonths: 1 }).grossBalance).toBe(
      10094.89
    );
  });

  it("desconta a taxa de administração do saldo", () => {
    const result = summarizeInvestment({
      ...lumpSum,
      returnRate: 0,
      adminFeeRate: 1,
    });

    expect(result).toMatchObject({
      grossYield: 0,
      adminFees: 100,
      grossBalance: 9900,
      totalCosts: 100,
      netReturn: -100,
      netReturnRate: -1,
    });
  });

  it("aplica o imposto apenas sobre o rendimento no resgate", () => {
    const result = summarizeInvestment({ ...lumpSum, incomeTaxRate: 15 });

    expect(result).toMatchObject({
      grossBalance: 11268.25,
      incomeTax: 190.24,
      netBalance: 11078.01,
      netReturn: 1078.01,
      netReturnRate: 10.78,
    });
  });

  it("arredonda o imposto no meio centavo sem erro de ponto flutuante", () => {
    // 15% de 1.609,50 = 241,425 exatos; 1609.5 * 0.15 daria 241,42499….
    const result = summarizeInvestment({
      ...lumpSum,
      monthlyContribution: 500,
      incomeTaxRate: 15,
    });

    expect(result).toMatchObject({
      totalContributed: 16000,
      grossYield: 1609.5,
      incomeTax: 241.43,
      netBalance: 17368.07,
      netReturn: 1368.07,
      netReturnRate: 8.55,
    });
  });

  it("não cobra imposto quando não há rendimento", () => {
    const result = summarizeInvestment({
      ...lumpSum,
      returnRate: 0,
      adminFeeRate: 2,
      incomeTaxRate: 22.5,
    });

    expect(result.incomeTax).toBe(0);
    expect(result.netReturn).toBe(-200);
  });

  it("trata custos fixos como saída única fora do saldo aplicado", () => {
    const result = summarizeInvestment({ ...lumpSum, fixedCosts: 50 });

    expect(result).toMatchObject({
      grossBalance: 11268.25,
      netBalance: 11268.25,
      fixedCosts: 50,
      totalCosts: 50,
      netReturn: 1218.25,
      netReturnRate: 12.18,
    });
  });

  it("fecha ao centavo quando combina aportes, taxas, custos e imposto", () => {
    const result = simulateInvestment({
      initialAmount: 20000,
      monthlyContribution: 1000,
      termMonths: 36,
      returnRate: 0.9,
      ratePeriod: "mensal",
      adminFeeRate: 0.5,
      fixedCosts: 30,
      incomeTaxRate: 15,
    });
    const cents = (value: number) => Math.round(value * 100);

    expect(result).toMatchObject({
      totalContributed: 56000,
      grossYield: 13816.99,
      adminFees: 646.92,
      grossBalance: 69170.07,
      incomeTax: 1975.51,
      netBalance: 67194.56,
      totalCosts: 2652.43,
      netReturn: 11164.56,
    });
    expect(cents(result.grossBalance)).toBe(
      cents(result.totalContributed) +
        cents(result.grossYield) -
        cents(result.adminFees)
    );
    expect(cents(result.netReturn)).toBe(
      cents(result.grossYield) - cents(result.totalCosts)
    );
    expect(cents(result.netReturn)).toBe(
      cents(result.netBalance) -
        cents(result.totalContributed) -
        cents(result.fixedCosts)
    );
    expect(result.timeline).toHaveLength(37);
    expect(result.timeline[0]).toMatchObject({
      month: 0,
      contributed: 20000,
      netReturn: -30,
    });
    expect(result.timeline[36]).toMatchObject({
      contributed: result.totalContributed,
      netBalance: result.netBalance,
      netReturn: result.netReturn,
    });
  });

  it("ignora valores negativos, inválidos e taxas acima de 100% (RN10)", () => {
    const result = summarizeInvestment({
      initialAmount: -5000,
      monthlyContribution: "indefinido",
      termMonths: 12,
      returnRate: 150,
      ratePeriod: "anual",
      adminFeeRate: -1,
      fixedCosts: -10,
      incomeTaxRate: "",
    });

    expect(result.totalContributed).toBe(0);
    expect(result.fixedCosts).toBe(0);
    expect(result.annualRate).toBe(100);
    expect(result.netReturnRate).toBeNull();
  });
});

describe("janelas mensais", () => {
  it("cobre meses inteiros, inclusive fevereiro de ano bissexto", () => {
    expect(getMonthWindow("2025-10", "2026-09")).toEqual({
      startMonth: "2025-10",
      endMonth: "2026-09",
      months: 12,
      startDate: "2025-10-01",
      endDate: "2026-09-30",
    });
    expect(getMonthWindow("2024-02", "2024-02").endDate).toBe("2024-02-29");
  });

  it("conta e desloca meses atravessando o ano", () => {
    expect(countMonths("2025-11", "2026-02")).toBe(4);
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
  });

  it("rejeita meses inválidos e períodos invertidos", () => {
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("0099-01")).toBe(false);
    expect(() => getMonthWindow("2026-05", "2026-04")).toThrow("mês final");
  });
});

describe("compareRuralActivityWithInvestments", () => {
  const entries = [
    {
      entryType: "receita" as const,
      amount: "50000.00",
      occurredOn: "2025-11-10",
    },
    {
      entryType: "custo_variavel" as const,
      amount: "30000.00",
      occurredOn: "2026-01-15",
    },
  ];
  const alternatives = [
    { id: 7, name: "CDB", ...lumpSum },
    { id: 8, name: "Poupança", ...lumpSum, returnRate: 0.5 },
  ];

  it("calcula rentabilidade rural, custo de oportunidade e resultado econômico", () => {
    const result = compareRuralActivityWithInvestments({
      capital: 100000,
      startMonth: "2025-10",
      endMonth: "2026-09",
      entries,
      alternatives,
    });

    expect(result.rural).toEqual({
      netProfit: 20000,
      totalRevenue: 50000,
      totalOutflows: 30000,
      returnRate: 20,
      entryCount: 2,
    });
    expect(
      result.alternatives.map(item => [item.name, item.netReturn])
    ).toEqual([
      ["CDB", 12682.5],
      ["Poupança", 6167.78],
    ]);
    expect(result.alternatives[0]).toMatchObject({
      returnRate: 12.68,
      ruralAdvantage: 7317.5,
      outcome: "rural",
      isBest: true,
    });
    expect(result.opportunityCost).toEqual({
      value: 12682.5,
      alternativeId: 7,
      alternativeName: "CDB",
    });
    expect(result.economicProfit).toBe(7317.5);
    expect(result.verdict).toBe("rural");
  });

  it("indica a alternativa quando ela rende mais que a atividade no período", () => {
    const result = compareRuralActivityWithInvestments({
      capital: 100000,
      startMonth: "2025-10",
      endMonth: "2026-09",
      entries: [
        { entryType: "receita", amount: 5000, occurredOn: "2026-03-01" },
      ],
      alternatives,
    });

    expect(result.economicProfit).toBe(-7682.5);
    expect(result.verdict).toBe("alternativa");
    expect(result.alternatives[1]).toMatchObject({
      name: "Poupança",
      ruralAdvantage: -1167.78,
      outcome: "alternativa",
    });
  });

  it("usa o mesmo período e capital para todas as opções (RN07)", () => {
    const longTerm = {
      ...lumpSum,
      id: 9,
      name: "Prazo de 36 meses",
      initialAmount: 1,
      monthlyContribution: 999,
      termMonths: 36,
    };
    const result = compareRuralActivityWithInvestments({
      capital: 100000,
      startMonth: "2025-10",
      endMonth: "2026-09",
      entries: [
        ...entries,
        { entryType: "receita", amount: 99999, occurredOn: "2025-09-30" },
        { entryType: "receita", amount: 99999, occurredOn: "2026-10-01" },
      ],
      alternatives: [longTerm],
    });

    expect(result.period.months).toBe(12);
    expect(result.rural.netProfit).toBe(20000);
    expect(result.alternatives[0].netReturn).toBe(
      summarizeInvestment({
        ...lumpSum,
        initialAmount: 100000,
        termMonths: 12,
      }).netReturn
    );
  });

  it("monta a evolução mês a mês com o lucro rural acumulado", () => {
    const result = compareRuralActivityWithInvestments({
      capital: 100000,
      startMonth: "2025-10",
      endMonth: "2026-01",
      entries,
      alternatives: [{ ...alternatives[0], fixedCosts: 25 }],
    });

    expect(result.timeline.map(point => point.month)).toEqual([
      null,
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
    expect(result.timeline.map(point => point.rural)).toEqual([
      0, 0, 50000, 50000, 20000,
    ]);
    expect(result.timeline[0].alternatives["7"]).toBe(-25);
    expect(result.timeline[4].alternatives["7"]).toBe(
      result.alternatives[0].netReturn
    );
  });

  it("deixa o custo de oportunidade em zero quando nenhuma alternativa rende", () => {
    const result = compareRuralActivityWithInvestments({
      capital: 1000,
      startMonth: "2026-01",
      endMonth: "2026-01",
      entries: [],
      alternatives: [
        {
          ...lumpSum,
          id: 3,
          name: "Sem rendimento",
          returnRate: 0,
          fixedCosts: 15,
        },
      ],
    });

    expect(result.alternatives[0].netReturn).toBe(-15);
    expect(result.opportunityCost).toEqual({
      value: 0,
      alternativeId: null,
      alternativeName: null,
    });
    expect(result.economicProfit).toBe(0);
    expect(result.verdict).toBe("empate");
  });

  it("não calcula custo de oportunidade sem alternativas cadastradas", () => {
    const result = compareRuralActivityWithInvestments({
      capital: 50000,
      startMonth: "2026-01",
      endMonth: "2026-03",
      entries,
      alternatives: [],
    });

    expect(result.rural.netProfit).toBe(-30000);
    expect(result.rural.returnRate).toBe(-60);
    expect(result.opportunityCost).toBeNull();
    expect(result.economicProfit).toBeNull();
    expect(result.verdict).toBeNull();
  });
});
