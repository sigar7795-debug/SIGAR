const BENEFITS = [
  "Fluxo de caixa organizado",
  "Lucro bruto e líquido calculados automaticamente",
  "Comparação entre períodos",
  "Resultado por atividade produtiva",
];

const METRICS = [
  { label: "Receitas", value: "R$ 96.400,00" },
  { label: "Custos", value: "R$ 51.170,00" },
  { label: "Resultado", value: "R$ 42.980,00" },
];

/**
 * First appearance of financial data on the page — deliberately held back from
 * the hero. Asymmetric two-column editorial layout: fragmented headline + short
 * benefit list on the left, an offset illustrative panel on the right.
 */
export function WhySigarSection() {
  return (
    <section id="por-que-sigar" data-nav-theme="light" className="bg-paper py-20 text-graphite sm:py-28">
      <div className="container grid gap-12 px-6 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-16">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-olive">Por que o SIGAR?</p>

          <h2 className="mt-5 max-w-lg">
            <span className="block font-display text-2xl font-medium leading-[1.1] text-graphite/70 sm:text-3xl">
              O campo não gera somente produção.
            </span>
            <span className="mt-1 block font-display text-4xl font-bold leading-[1.05] tracking-[-0.01em] sm:ml-6 sm:text-5xl">
              Gera decisões.
            </span>
          </h2>

          <p className="mt-6 max-w-sm text-sm leading-relaxed text-graphite/70 sm:text-base">
            O SIGAR organiza as informações da propriedade e transforma movimentações em uma leitura financeira clara.
          </p>

          <ul className="mt-10 max-w-xs space-y-3 border-t-2 border-graphite/30 pt-6 sm:ml-6">
            {BENEFITS.map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-graphite/75">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-olive" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:mt-20">
          <div className="overflow-hidden rounded-lg border border-graphite/10 bg-card text-card-foreground shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite/10 px-6 py-4">
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-olive">Propriedade</p>
                <p className="mt-1 text-sm font-semibold">Propriedade modelo</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-olive">Período</p>
                <p className="mt-1 text-sm font-semibold">Este mês</p>
              </div>
            </div>

            <div className="divide-y divide-graphite/10">
              {METRICS.map(metric => (
                <div key={metric.label} className="flex items-center justify-between px-6 py-3.5">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-graphite/45">
                    {metric.label}
                  </span>
                  <span className="font-financial text-sm font-semibold tabular-nums">{metric.value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-graphite/10 px-6 py-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-graphite/40">Dados ilustrativos</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
