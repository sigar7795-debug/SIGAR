import { EmptyState } from "@/components/EmptyState";
import { FinancialTrendChart } from "@/components/FinancialTrendChart";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { PageHeader } from "@/components/PageHeader";
import { PropertySelector } from "@/components/PropertySelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Plus,
  ReceiptText,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const ranges = [
  { value: "dia", label: "Hoje" },
  { value: "mes", label: "Este mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
] as const;

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("mes");
  const [referenceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { propertyId, setPropertyId } = useSelectedProperty();
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const profileQuery = trpc.finance.profile.get.useQuery();
  const summaryQuery = trpc.finance.dashboard.summary.useQuery(
    { propertyId: propertyId ?? 0, range, referenceDate },
    { enabled: Boolean(propertyId) },
  );
  const entriesQuery = trpc.finance.entries.list.useQuery(
    { propertyId: propertyId ?? 0, range, referenceDate },
    { enabled: Boolean(propertyId) },
  );

  if (propertiesQuery.isLoading || profileQuery.isLoading) {
    return <LoadingState title="A carregar o panorama financeiro" />;
  }
  if (propertiesQuery.isError || profileQuery.isError || summaryQuery.isError || entriesQuery.isError) {
    return (
      <QueryErrorState
        onRetry={() => {
          void propertiesQuery.refetch();
          void profileQuery.refetch();
          void summaryQuery.refetch();
          void entriesQuery.refetch();
        }}
      />
    );
  }

  const summary = summaryQuery.data?.summary;
  const period = summaryQuery.data?.period;
  const property = propertiesQuery.data?.find(item => item.id === propertyId);
  const recentEntries = entriesQuery.data?.entries.slice(0, 5) ?? [];
  const alerts = [
    summary?.overdueAmount
      ? { title: "Lançamentos vencidos", detail: `${formatCurrency(summary.overdueAmount)} aguardando regularização.` }
      : null,
    summary?.pendingAmount
      ? { title: "Movimentos pendentes", detail: `${formatCurrency(summary.pendingAmount)} ainda não foram liquidados.` }
      : null,
    profileQuery.data === null
      ? { title: "Perfil incompleto", detail: "Defina a sua função para concluir a configuração da conta." }
      : null,
    property && !property.mainActivity
      ? { title: "Atividade não informada", detail: `Complete os dados de ${property.name}.` }
      : null,
  ].filter((alert): alert is { title: string; detail: string } => Boolean(alert));

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Painel operacional"
        title="Visão geral"
        description="Acompanhe o desempenho da sua propriedade."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/propriedades")}
              className="h-11 rounded-none border-olive/40 bg-transparent text-field hover:bg-accent"
            >
              <Landmark className="mr-2 h-4 w-4" /> Cadastrar propriedade
            </Button>
            <Button
              type="button"
              onClick={() => setLocation("/fluxo-de-caixa")}
              disabled={!propertyId}
              className="h-11 rounded-none bg-field font-semibold text-sand hover:bg-field/90"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar lançamento
            </Button>
          </div>
        }
      />

      {!propertiesQuery.data?.length ? (
        <EmptyState
          icon={Landmark}
          title="A sua primeira propriedade começa aqui"
          description="Cadastre uma propriedade rural para centralizar receitas, custos e resultados em um único lugar."
          action={
            <Button onClick={() => setLocation("/propriedades")} className="rounded-none bg-field font-semibold text-sand hover:bg-field/90">
              Cadastrar propriedade <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          }
        />
      ) : (
        <>
          <section aria-label="Filtros do painel" className="grid gap-4 border-b border-olive/30 pb-6 lg:grid-cols-[minmax(260px,1fr)_180px_1fr] lg:items-end">
            <div>
              <label className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Propriedade</label>
              <PropertySelector properties={propertiesQuery.data} value={propertyId} onChange={setPropertyId} />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Período</label>
              <Select value={range} onValueChange={value => setRange(value as typeof range)}>
                <SelectTrigger className="h-11 rounded-none border-olive/35 bg-transparent"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">{ranges.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex min-h-11 items-center gap-3 border-l border-olive/25 pl-5 text-sm text-graphite/60">
              <CalendarDays className="h-4 w-4 text-olive" />
              {period ? formatPeriod(period.startDate, period.endDate) : "A preparar resultados"}
            </div>
          </section>

          <section aria-label="Indicadores financeiros" className="grid border-y border-olive/35 sm:grid-cols-2 xl:grid-cols-4">
            <FinancialMetric
              label="Saldo atual"
              value={formatCurrency(summary?.cashBalance)}
              icon={CircleDollarSign}
              featured
            />
            <FinancialMetric label="Receitas" value={formatCurrency(summary?.totalRevenue)} icon={ArrowUpRight} tone="positive" />
            <FinancialMetric label="Despesas" value={formatCurrency(summary?.totalCosts)} icon={ArrowDownRight} tone="expense" />
            <FinancialMetric label="Resultado" value={formatCurrency(summary?.netProfit)} icon={ReceiptText} tone={(summary?.netProfit ?? 0) >= 0 ? "positive" : "expense"} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
            <FinancialTrendChart
              propertyId={propertyId}
              properties={propertiesQuery.data}
              onPropertyChange={setPropertyId}
              eyebrow="Fluxo de caixa"
              title="Entradas e saídas do período"
            />

            <aside className="border border-olive/30 bg-field p-5 text-sand sm:p-7">
              <div className="border-b border-sand/20 pb-5">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-sage">Alertas e pendências</p>
                <p className="mt-2 font-display text-3xl font-bold">{alerts.length.toString().padStart(2, "0")}</p>
              </div>
              <div className="divide-y divide-sand/15">
                {alerts.length ? alerts.map(alert => (
                  <div key={alert.title} className="flex gap-3 py-5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    <div><p className="text-sm font-semibold">{alert.title}</p><p className="mt-1 text-xs leading-5 text-sand/65">{alert.detail}</p></div>
                  </div>
                )) : (
                  <div className="py-7 text-center">
                    <CheckCircle2 className="mx-auto h-6 w-6 text-sage" />
                    <p className="mt-3 text-sm font-semibold">Operação em dia</p>
                    <p className="mt-1 text-xs text-sand/65">Nenhuma pendência relevante neste período.</p>
                  </div>
                )}
              </div>
            </aside>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="border-t border-olive/35 pt-5">
              <div className="flex items-end justify-between gap-4">
                <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-olive">Resumo</p><h2 className="mt-2 font-display text-2xl font-bold">Propriedades</h2></div>
                <button type="button" onClick={() => setLocation("/propriedades")} className="text-xs font-semibold text-field hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field">Ver todas</button>
              </div>
              <div className="mt-5 divide-y divide-olive/25 border-y border-olive/25">
                {propertiesQuery.data.slice(0, 4).map(item => (
                  <button key={item.id} type="button" onClick={() => { setPropertyId(item.id); setLocation("/propriedades"); }} className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-4 text-left hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-field">
                    <span><span className="block font-semibold text-graphite">{item.name}</span><span className="mt-1 block text-xs text-graphite/55">{item.municipality || "Localização não informada"} · {item.mainActivity || "Atividade não informada"}</span></span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-olive">{item.totalArea ? `${Number(item.totalArea).toLocaleString("pt-BR")} ha` : "—"}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="border-t border-olive/35 pt-5">
              <div className="flex items-end justify-between gap-4">
                <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-olive">Movimentação</p><h2 className="mt-2 font-display text-2xl font-bold">Atividades recentes</h2></div>
                <button type="button" onClick={() => setLocation("/fluxo-de-caixa")} className="text-xs font-semibold text-field hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field">Abrir fluxo</button>
              </div>
              {recentEntries.length ? (
                <div className="mt-5 divide-y divide-olive/25 border-y border-olive/25">
                  {recentEntries.map(entry => {
                    const receipt = entry.entryType === "receita";
                    return (
                      <div key={entry.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-4">
                        <span className={`grid h-8 w-8 place-items-center border ${receipt ? "border-positive/30 text-positive" : "border-warning/30 text-warning"}`}>
                          {receipt ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{entry.description}</span><span className="mt-1 block text-xs text-graphite/50">{formatDate(entry.occurredOn)} · {entry.category}</span></span>
                        <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${receipt ? "text-positive" : "text-graphite"}`}>{receipt ? "+" : "−"} {formatCurrency(entry.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 border border-dashed border-olive/35 px-5 py-8 text-center text-sm text-graphite/55">Nenhuma atividade neste período.</div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

function FinancialMetric({
  label,
  value,
  icon: Icon,
  tone = "default",
  featured = false,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  tone?: "default" | "positive" | "expense";
  featured?: boolean;
}) {
  const toneClass = tone === "positive" ? "text-positive" : tone === "expense" ? "text-[#765f45]" : "text-graphite";
  return (
    <article className={`min-w-0 border-b border-olive/25 p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0 ${featured ? "bg-field text-sand" : "bg-card"}`}>
      <div className="flex items-center justify-between gap-4">
        <p className={`font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${featured ? "text-sage" : "text-olive"}`}>{label}</p>
        <Icon className={`h-4 w-4 ${featured ? "text-sage" : toneClass}`} />
      </div>
      <p className={`mt-8 whitespace-nowrap font-display text-3xl font-bold tabular-nums sm:text-4xl ${featured ? "text-sand" : toneClass}`}>{value}</p>
    </article>
  );
}
