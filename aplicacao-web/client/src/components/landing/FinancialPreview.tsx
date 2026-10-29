import { useLayoutEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const METRICS = [
  { label: "Saldo", value: "R$ 48.230,00", tone: "positive" as const },
  { label: "Receita", value: "R$ 96.400,00", tone: "neutral" as const },
  { label: "Custos", value: "R$ 51.170,00", tone: "neutral" as const },
  { label: "Lucro líquido", value: "R$ 42.980,00", tone: "positive" as const },
];

const FINAL_FINANCIAL_STYLE = {
  fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif',
  fontStyle: "normal",
  fontWeight: 800,
  letterSpacing: "0px",
  fontVariantNumeric: "tabular-nums lining-nums",
} as const;

const FINANCIAL_SHUFFLE_STYLES = [
  { fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace', fontStyle: "normal", fontWeight: 600 },
  { fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif', fontStyle: "normal", fontWeight: 500 },
  { fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace', fontStyle: "normal", fontWeight: 800 },
  { fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif', fontStyle: "normal", fontWeight: 600 },
  { fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace', fontStyle: "normal", fontWeight: 700 },
  { fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif', fontStyle: "normal", fontWeight: 700 },
  FINAL_FINANCIAL_STYLE,
] as const;

const SHUFFLE_INTERVAL_MS = 78;
const METRIC_STAGGER_MS = 105;

export function FinancialPreview() {
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const values = valueRefs.current.filter((value): value is HTMLSpanElement => Boolean(value));
    if (!card || values.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeouts: number[] = [];

    const clearShuffle = () => {
      timeouts.splice(0).forEach(timeout => window.clearTimeout(timeout));
      gsap.set(values, FINAL_FINANCIAL_STYLE);
    };

    if (reduceMotion) {
      clearShuffle();
      return;
    }

    const runShuffle = () => {
      clearShuffle();

      values.forEach((value, metricIndex) => {
        FINANCIAL_SHUFFLE_STYLES.forEach((style, styleIndex) => {
          timeouts.push(
            window.setTimeout(
              () => gsap.set(value, style),
              metricIndex * METRIC_STAGGER_MS + styleIndex * SHUFFLE_INTERVAL_MS,
            ),
          );
        });
      });
    };

    const trigger = ScrollTrigger.create({
      trigger: card,
      start: "top 78%",
      onEnter: runShuffle,
      onEnterBack: runShuffle,
      onLeave: clearShuffle,
      onLeaveBack: clearShuffle,
    });

    return () => {
      trigger.kill();
      clearShuffle();
    };
  }, []);

  return (
    <section data-nav-theme="light" className="bg-paper py-24 text-graphite sm:py-32">
      <div className="container px-6 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-olive">Prévia do painel</p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.01em] sm:text-5xl">
            A mesma clareza, dentro do sistema.
          </h2>
        </div>

        <div
          ref={cardRef}
          className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-lg border border-graphite/10 bg-white shadow-[0_30px_80px_-40px_rgba(22,28,25,0.35)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite/10 px-6 py-4 sm:px-8">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-olive">Propriedade selecionada</p>
              <p className="mt-1 text-sm font-semibold">Propriedade modelo</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-olive">Período analisado</p>
              <p className="mt-1 text-sm font-semibold">Este mês</p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-graphite/10 lg:grid-cols-4 lg:divide-y-0">
            {METRICS.map((metric, index) => (
              <div key={metric.label} className="min-w-0 overflow-hidden px-5 py-6 sm:px-6">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-graphite/45">{metric.label}</p>
                <p className="mt-2 h-7 min-w-0 overflow-hidden text-xl leading-7 tabular-nums sm:text-2xl lg:text-[22px]">
                  <span
                    ref={value => {
                      valueRefs.current[index] = value;
                    }}
                    className="block w-full max-w-full whitespace-nowrap font-display font-extrabold"
                  >
                    {metric.value}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-graphite/10 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-2">
              <Badge className="gap-1 border-none bg-positive/10 text-positive hover:bg-positive/10">
                <ArrowUpRight className="h-3 w-3" /> +12,4% vs. mês anterior
              </Badge>
              <Badge className="gap-1 border-none bg-graphite/5 text-graphite/60 hover:bg-graphite/5">
                <ArrowDownRight className="h-3 w-3" /> Custos -3,1%
              </Badge>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-graphite/40">Dados ilustrativos</p>
          </div>
        </div>
      </div>
    </section>
  );
}
