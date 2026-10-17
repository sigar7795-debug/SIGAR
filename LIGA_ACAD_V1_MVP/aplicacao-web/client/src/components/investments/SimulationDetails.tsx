import { formatCurrency, formatPercent } from "@/lib/formatters";
import { simulateInvestment } from "@shared/investments";
import { useMemo } from "react";
import { describeParameters, ratePeriodLabels } from "./display";
import { InvestmentGrowthChart } from "./InvestmentCharts";
import { SectionHeading, Stat } from "./InvestmentBlocks";
import type { Alternative } from "./types";

export function SimulationDetails({
  alternative,
}: {
  alternative: Alternative;
}) {
  const simulation = useMemo(
    () => simulateInvestment(alternative),
    [alternative]
  );
  const costs =
    simulation.adminFees + simulation.fixedCosts + simulation.incomeTax;

  return (
    <section className="space-y-5" aria-labelledby="simulacao-titulo">
      <SectionHeading
        id="simulacao-titulo"
        eyebrow="RF28 · Retorno estimado"
        title={alternative.name}
        description={`${describeParameters(alternative)} a ${formatPercent(Number(alternative.returnRate), 4)} ${ratePeriodLabels[alternative.ratePeriod]} (equivale a ${formatPercent(simulation.monthlyRate, 4)} a.m. e ${formatPercent(simulation.annualRate, 4)} a.a.).`}
      />
      <div className="grid gap-px border border-olive/30 bg-olive/25 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Valor aplicado"
          value={formatCurrency(simulation.totalContributed)}
          detail="Valor inicial + aportes mensais."
        />
        <Stat
          label="Rendimento bruto"
          value={formatCurrency(simulation.grossYield)}
          detail="Juros compostos antes de custos e imposto."
        />
        <Stat
          label="Custos e imposto"
          value={formatCurrency(costs)}
          detail={`Adm. ${formatCurrency(simulation.adminFees)} · fixos ${formatCurrency(simulation.fixedCosts)} · IR ${formatCurrency(simulation.incomeTax)}`}
        />
        <Stat
          label="Valor líquido no resgate"
          value={formatCurrency(simulation.netBalance)}
          detail="Saldo após taxa de administração e IR."
        />
        <Stat
          label="Retorno líquido estimado"
          value={formatCurrency(simulation.netReturn)}
          detail={`${formatPercent(simulation.netReturnRate)} sobre o valor aplicado`}
          featured
        />
      </div>
      <p className="border-l-2 border-olive/40 pl-4 font-mono text-[11px] leading-6 text-graphite/65">
        Retorno líquido = rendimento bruto{" "}
        {formatCurrency(simulation.grossYield)} − taxa de administração{" "}
        {formatCurrency(simulation.adminFees)} − custos fixos{" "}
        {formatCurrency(simulation.fixedCosts)} − IR{" "}
        {formatCurrency(simulation.incomeTax)} ={" "}
        {formatCurrency(simulation.netReturn)}
      </p>
      <InvestmentGrowthChart
        name={alternative.name}
        timeline={simulation.timeline}
      />
    </section>
  );
}
