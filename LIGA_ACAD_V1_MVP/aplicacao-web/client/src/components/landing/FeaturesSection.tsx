import { ArrowLeftRight, BarChart3, Landmark, ReceiptText, Sprout, TrendingDown, TrendingUp } from "lucide-react";

const FEATURES = [
  { icon: Sprout, title: "Cadastro de propriedades", description: "Registre uma ou mais explorações vinculadas à sua conta." },
  { icon: ReceiptText, title: "Receitas e despesas", description: "Lance entradas, custos de produção, despesas e impostos por categoria." },
  { icon: ArrowLeftRight, title: "Fluxo de caixa", description: "Acompanhe o saldo por dia, mês, trimestre ou ano." },
  { icon: TrendingUp, title: "Lucro bruto", description: "Receitas menos custos diretamente ligados à produção." },
  { icon: TrendingDown, title: "Lucro líquido", description: "Resultado após custos, despesas, impostos e deduções." },
  { icon: BarChart3, title: "Comparação entre períodos", description: "Coloque dois intervalos lado a lado e veja a variação." },
  { icon: Landmark, title: "Resultado por atividade produtiva", description: "Isole o desempenho financeiro de cada atividade da propriedade." },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="bg-graphite py-24 text-paper sm:py-32">
      <div className="container grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-sage">Recursos</p>
          <h2 className="mt-4 max-w-sm font-display text-4xl font-semibold leading-[1.02] tracking-[-0.01em] sm:text-5xl">
            O que já está disponível no SIGAR hoje.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/70">
            Sem promessas de recursos futuros — apenas o que a plataforma já entrega para organizar a gestão financeira da propriedade.
          </p>
        </div>

        <ul className="divide-y divide-sage/15 border-t border-sage/15">
          {FEATURES.map((feature, i) => (
            <li key={feature.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6 sm:grid-cols-[3rem_auto_1fr] sm:items-baseline sm:gap-6">
              <span className="font-mono text-xs text-sage/60">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex items-center gap-2 sm:contents">
                <feature.icon className="h-4 w-4 shrink-0 text-sage sm:hidden" />
                <h3 className="font-display text-xl font-semibold tracking-[-0.005em] sm:text-2xl">{feature.title}</h3>
              </div>
              <p className="col-span-2 mt-1 text-sm leading-relaxed text-paper/65 sm:col-span-1 sm:mt-0 sm:max-w-sm sm:text-right">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
