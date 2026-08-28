import { PropertySelector } from "@/components/PropertySelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCompactCurrency, formatCurrency, formatPercentChange } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Minus,
  Table2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// Colors — the SAME hex values the previous CashFlowChart used (dark green /
// olive-brown), preserved exactly rather than switching to the platform's
// --positive/--negative tokens, which read as generic red/green rather than
// SIGAR's forest-green + earth-tone identity.
// ---------------------------------------------------------------------------
const COLOR_ENTRADAS = "#34452f";
const COLOR_SAIDAS = "#8a7654";
const COLOR_GRID = "rgba(115, 118, 83, 0.22)";
const COLOR_AXIS = "#737653";
const COLOR_ZERO = "#161c19";

type PresetId = "7d" | "30d" | "3m" | "6m" | "12m" | "custom";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "3m", label: "3 meses" },
  { id: "6m", label: "6 meses" },
  { id: "12m", label: "12 meses" },
  { id: "custom", label: "Personalizado" },
];

type ViewMode = "flow" | "net" | "cumulative";

type Property = { id: number; name: string; municipality: string | null; state: string | null };

type FinancialTrendChartProps = {
  propertyId: number | undefined;
  properties: Property[] | undefined;
  onPropertyChange: (propertyId: number | undefined) => void;
  eyebrow: string;
  title: string;
};

// --- date helpers -----------------------------------------------------------

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return toIso(new Date());
}

function shiftMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDayOfShiftedMonth = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
  shifted.setUTCDate(Math.min(d, lastDayOfShiftedMonth));
  return toIso(shifted);
}

function shiftDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toIso(new Date(Date.UTC(y, m - 1, d + days)));
}

function daysBetween(startIso: string, endIso: string) {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86_400_000) + 1;
}

function resolveWindow(preset: PresetId, custom: { start: string; end: string }) {
  const end = todayIso();
  switch (preset) {
    case "7d":
      return { start: shiftDays(end, -6), end };
    case "30d":
      return { start: shiftDays(end, -29), end };
    case "3m":
      return { start: shiftMonths(end, -3), end };
    case "6m":
      return { start: shiftMonths(end, -6), end };
    case "12m":
      return { start: shiftMonths(end, -12), end };
    case "custom":
      return custom.start && custom.end && custom.start <= custom.end ? custom : { start: shiftDays(end, -29), end };
  }
}

function previousWindow(start: string, end: string) {
  const span = daysBetween(start, end);
  return { start: shiftDays(start, -span), end: shiftDays(start, -1) };
}

type Granularity = "day" | "week" | "month";

function granularityFor(start: string, end: string): Granularity {
  const span = daysBetween(start, end);
  if (span <= 31) return "day";
  if (span <= 186) return "week";
  return "month";
}

function bucketKey(iso: string, granularity: Granularity) {
  if (granularity === "day") return iso;
  const [y, m, d] = iso.split("-").map(Number);
  if (granularity === "month") return `${y}-${String(m).padStart(2, "0")}`;
  // ISO week bucket, keyed by that week's Monday.
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - weekday);
  return toIso(date);
}

function bucketLabel(key: string, granularity: Granularity) {
  if (granularity === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(Date.UTC(y, m - 1, 1)));
  }
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(Date.UTC(y, m - 1, d)));
}

// --- data shaping -------------------------------------------------------

type EntryRow = { occurredOn: Date | string; entryType: string; amount: number | string; category: string };

type Bucket = { key: string; label: string; entradas: number; saidas: number };

function toBuckets(entries: EntryRow[] | undefined, granularity: Granularity): Bucket[] {
  const totals = new Map<string, Bucket>();
  entries?.forEach(entry => {
    const iso = (entry.occurredOn instanceof Date ? entry.occurredOn.toISOString() : entry.occurredOn).slice(0, 10);
    const key = bucketKey(iso, granularity);
    const current = totals.get(key) ?? { key, label: bucketLabel(key, granularity), entradas: 0, saidas: 0 };
    const amount = Number(entry.amount);
    if (Number.isFinite(amount)) {
      if (entry.entryType === "receita") current.entradas += amount;
      else current.saidas += amount;
    }
    totals.set(key, current);
  });
  return Array.from(totals.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function sumEntries(entries: EntryRow[] | undefined) {
  let entradas = 0;
  let saidas = 0;
  entries?.forEach(entry => {
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount)) return;
    if (entry.entryType === "receita") entradas += amount;
    else saidas += amount;
  });
  return { entradas, saidas, resultado: entradas - saidas };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0]?.contentRect.width ?? 0));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// --- component ------------------------------------------------------------

export function FinancialTrendChart({ propertyId, properties, onPropertyChange, eyebrow, title }: FinancialTrendChartProps) {
  const [preset, setPreset] = useState<PresetId>("30d");
  const [customRange, setCustomRange] = useState({ start: shiftDays(todayIso(), -29), end: todayIso() });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("flow");
  const [showTable, setShowTable] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [containerRef, containerWidth] = useContainerWidth();

  const { start, end } = resolveWindow(preset, customRange);
  const granularity = granularityFor(start, end);
  const { start: prevStart, end: prevEnd } = previousWindow(start, end);
  const category = categoryFilter === "all" ? undefined : categoryFilter;

  const entriesQuery = trpc.finance.entries.list.useQuery(
    { propertyId: propertyId ?? 0, range: "mes", referenceDate: end, startDate: start, endDate: end, category },
    { enabled: Boolean(propertyId) },
  );
  const previousEntriesQuery = trpc.finance.entries.list.useQuery(
    { propertyId: propertyId ?? 0, range: "mes", referenceDate: prevEnd, startDate: prevStart, endDate: prevEnd, category },
    { enabled: Boolean(propertyId) },
  );

  const property = properties?.find(item => item.id === propertyId);
  const entries = entriesQuery.data?.entries;
  const previousEntries = previousEntriesQuery.data?.entries;
  const categories = entriesQuery.data?.categories ?? [];

  const currentBuckets = useMemo(() => toBuckets(entries, granularity), [entries, granularity]);
  const previousBuckets = useMemo(() => toBuckets(previousEntries, granularity), [previousEntries, granularity]);

  const totals = useMemo(() => sumEntries(entries), [entries]);
  const previousTotals = useMemo(() => sumEntries(previousEntries), [previousEntries]);
  const change = {
    entradas: pctChange(totals.entradas, previousTotals.entradas),
    saidas: pctChange(totals.saidas, previousTotals.saidas),
    resultado: pctChange(totals.resultado, previousTotals.resultado),
  };

  // Merge current + previous buckets by index (both windows share the same
  // length and granularity, so bucket counts line up) into one row per tick,
  // running cumulative totals along the way for the "valores acumulados" mode.
  const data = useMemo(() => {
    let cumEntradas = 0;
    let cumSaidas = 0;
    let cumEntradasPrev = 0;
    let cumSaidasPrev = 0;
    const length = Math.max(currentBuckets.length, previousBuckets.length);
    return Array.from({ length }, (_, index) => {
      const bucket = currentBuckets[index];
      const prevBucket = previousBuckets[index];
      const entradas = bucket?.entradas ?? 0;
      const saidas = bucket?.saidas ?? 0;
      const entradasPrev = prevBucket?.entradas ?? 0;
      const saidasPrev = prevBucket?.saidas ?? 0;
      cumEntradas += entradas;
      cumSaidas += saidas;
      cumEntradasPrev += entradasPrev;
      cumSaidasPrev += saidasPrev;
      return {
        label: bucket?.label ?? prevBucket?.label ?? "",
        prevLabel: prevBucket?.label,
        entradas,
        saidas,
        resultado: entradas - saidas,
        entradasPrev,
        saidasPrev,
        resultadoPrev: entradasPrev - saidasPrev,
        cumEntradas,
        cumSaidas,
        cumEntradasPrev,
        cumSaidasPrev,
      };
    });
  }, [currentBuckets, previousBuckets]);

  const hasEntriesInPeriod = categories.length > 0 || (entries?.length ?? 0) > 0;
  const hasFilteredData = (entries?.length ?? 0) > 0;
  const cumulativeDisabled = data.length < 2;

  // Guard against landing on a disabled mode (e.g. after narrowing the period
  // shrinks it to a single bucket) — done as an effect, not during render.
  useEffect(() => {
    if (viewMode === "cumulative" && cumulativeDisabled) setViewMode("flow");
  }, [viewMode, cumulativeDisabled]);

  const maxTicks = containerWidth < 480 ? 4 : containerWidth < 768 ? 6 : containerWidth < 1024 ? 8 : 12;
  const ticks = useMemo(() => {
    if (data.length <= maxTicks) return data.map(row => row.label);
    const stride = Math.ceil((data.length - 1) / (maxTicks - 1));
    const picked = new Set<number>();
    for (let index = 0; index < data.length; index += stride) picked.add(index);
    picked.add(data.length - 1);
    return Array.from(picked)
      .sort((a, b) => a - b)
      .map(index => data[index].label);
  }, [data, maxTicks]);

  const seriesKeys =
    viewMode === "flow"
      ? (["entradas", "saidas"] as const)
      : viewMode === "net"
        ? (["resultado"] as const)
        : (["cumEntradas", "cumSaidas"] as const);
  const seriesMeta: Record<string, { label: string; color: string; prevKey: string }> = {
    entradas: { label: "Entradas", color: COLOR_ENTRADAS, prevKey: "entradasPrev" },
    saidas: { label: "Saídas", color: COLOR_SAIDAS, prevKey: "saidasPrev" },
    resultado: { label: "Resultado líquido", color: COLOR_ENTRADAS, prevKey: "resultadoPrev" },
    cumEntradas: { label: "Entradas acumuladas", color: COLOR_ENTRADAS, prevKey: "cumEntradasPrev" },
    cumSaidas: { label: "Saídas acumuladas", color: COLOR_SAIDAS, prevKey: "cumSaidasPrev" },
  };

  const eyebrowId = eyebrow.replace(/\s+/g, "-").toLowerCase();
  const summaryText = `Gráfico de ${title.toLowerCase()}: entradas ${formatCurrency(totals.entradas)}, saídas ${formatCurrency(totals.saidas)}, resultado líquido ${formatCurrency(totals.resultado)} no período de ${bucketLabel(bucketKey(start, "day"), "day")} a ${bucketLabel(bucketKey(end, "day"), "day")}${property ? `, propriedade ${property.name}` : ""}${category ? `, categoria ${category}` : ""}.`;

  return (
    <div className="min-w-0 border border-olive/30 bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-olive/25 pb-5">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-olive">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-graphite">{title}</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowTable(value => !value)}
          className="h-9 rounded-none border-olive/35 text-xs font-semibold text-graphite hover:bg-accent"
          aria-pressed={showTable}
        >
          <Table2 className="mr-2 h-3.5 w-3.5" />
          {showTable ? "Ver gráfico" : "Ver tabela"}
        </Button>
      </div>

      {/* Filters — horizontally scrollable on narrow screens so nothing overflows the page */}
      <div className="-mx-1 mt-5 flex items-end gap-4 overflow-x-auto px-1 pb-1" role="group" aria-label={`Filtros de ${eyebrowId}`}>
        <div className="shrink-0">
          <label className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Propriedade</label>
          <PropertySelector properties={properties} value={propertyId} onChange={onPropertyChange} />
        </div>

        <div className="shrink-0">
          <label className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Período</label>
          <Select value={preset} onValueChange={value => setPreset(value as PresetId)}>
            <SelectTrigger className="h-11 min-w-[150px] rounded-none border-olive/35 bg-transparent"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none">
              {PRESETS.map(item => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {preset === "custom" ? (
          <div className="flex shrink-0 items-end gap-2">
            <label className="block">
              <span className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">De</span>
              <input
                type="date"
                value={customRange.start}
                max={customRange.end}
                onChange={event => setCustomRange(range => ({ ...range, start: event.target.value }))}
                className="h-11 border border-olive/35 bg-transparent px-3 text-sm text-graphite"
              />
            </label>
            <label className="block">
              <span className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Até</span>
              <input
                type="date"
                value={customRange.end}
                min={customRange.start}
                max={todayIso()}
                onChange={event => setCustomRange(range => ({ ...range, end: event.target.value }))}
                className="h-11 border border-olive/35 bg-transparent px-3 text-sm text-graphite"
              />
            </label>
          </div>
        ) : null}

        <div className="shrink-0">
          <label className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Categoria</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-11 min-w-[170px] rounded-none border-olive/35 bg-transparent"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <label className="flex h-11 shrink-0 items-center gap-2 border-l border-olive/25 pl-4">
          <Switch checked={compareEnabled} onCheckedChange={setCompareEnabled} aria-label="Comparar com período anterior" />
          <span className="whitespace-nowrap text-xs font-semibold text-graphite/70">Comparar com período anterior</span>
        </label>
      </div>

      {/* View modes */}
      <div className="mt-4">
        <ToggleGroup type="single" value={viewMode} onValueChange={value => value && setViewMode(value as ViewMode)} className="flex-wrap justify-start gap-1">
          <ToggleGroupItem value="flow" className="h-9 rounded-none border border-olive/30 text-xs font-semibold data-[state=on]:bg-field data-[state=on]:text-sand">
            Entradas e saídas
          </ToggleGroupItem>
          <ToggleGroupItem value="net" className="h-9 rounded-none border border-olive/30 text-xs font-semibold data-[state=on]:bg-field data-[state=on]:text-sand">
            Resultado líquido
          </ToggleGroupItem>
          <ToggleGroupItem
            value="cumulative"
            disabled={cumulativeDisabled}
            title={cumulativeDisabled ? "É preciso mais de um ponto no período para mostrar valores acumulados." : undefined}
            className="h-9 rounded-none border border-olive/30 text-xs font-semibold data-[state=on]:bg-field data-[state=on]:text-sand disabled:opacity-40"
          >
            Valores acumulados
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Summary indicators */}
      <div className="mt-5 grid grid-cols-2 gap-4 border-y border-olive/25 py-5 sm:grid-cols-4">
        <SummaryStat label="Total de entradas" value={formatCurrency(totals.entradas)} change={compareEnabled ? change.entradas : null} tone="positive" />
        <SummaryStat label="Total de saídas" value={formatCurrency(totals.saidas)} change={compareEnabled ? change.saidas : null} tone="expense" invert />
        <SummaryStat label="Resultado líquido" value={formatCurrency(totals.resultado)} change={compareEnabled ? change.resultado : null} tone={totals.resultado >= 0 ? "positive" : "expense"} />
        <SummaryStat
          label="Variação vs. período anterior"
          value={change.resultado === null ? "—" : formatPercentChange(change.resultado)}
          tone={change.resultado === null ? "default" : change.resultado >= 0 ? "positive" : "expense"}
        />
      </div>

      {/* Body: loading / error / empty / no-results / chart|table */}
      <div ref={containerRef} className="mt-5">
        {entriesQuery.isError || previousEntriesQuery.isError ? (
          <ErrorState onRetry={() => { void entriesQuery.refetch(); void previousEntriesQuery.refetch(); }} />
        ) : entriesQuery.isLoading || !propertyId ? (
          <LoadingSkeleton />
        ) : !hasEntriesInPeriod ? (
          <EmptyPeriodState />
        ) : !hasFilteredData ? (
          <NoResultsState onClear={() => setCategoryFilter("all")} />
        ) : showTable ? (
          <AccessibleTable data={data} granularity={granularity} viewMode={viewMode} compareEnabled={compareEnabled} />
        ) : (
          <>
            <div
              className="h-[300px] w-full min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-field sm:h-[400px]"
              tabIndex={0}
              role="group"
              aria-label={summaryText}
              aria-describedby={`${eyebrowId}-focus-live`}
              onKeyDown={event => {
                if (!data.length) return;
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setActiveIndex(index => Math.min((index ?? -1) + 1, data.length - 1));
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setActiveIndex(index => Math.max((index ?? data.length) - 1, 0));
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setActiveIndex(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setActiveIndex(data.length - 1);
                } else if (event.key === "Escape") {
                  setActiveIndex(null);
                }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                  onMouseMove={state => setActiveIndex(typeof state.activeTooltipIndex === "number" ? state.activeTooltipIndex : null)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <CartesianGrid vertical={false} stroke={COLOR_GRID} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: COLOR_AXIS, fontSize: 11 }}
                    ticks={ticks}
                    interval={0}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: COLOR_AXIS, fontSize: 11 }}
                    tickFormatter={formatCompactCurrency}
                    width={64}
                    domain={([dataMin, dataMax]: [number, number]) => [Math.min(0, dataMin * 1.1), Math.max(0, dataMax * 1.1)] as [number, number]}
                  />
                  <ReferenceLine y={0} stroke={COLOR_ZERO} strokeOpacity={0.4} strokeWidth={1.5} />
                  {activeIndex !== null && data[activeIndex] ? (
                    <ReferenceLine x={data[activeIndex].label} stroke={COLOR_AXIS} strokeDasharray="2 2" />
                  ) : null}
                  <Tooltip
                    isAnimationActive={false}
                    allowEscapeViewBox={{ x: false, y: false }}
                    cursor={{ stroke: COLOR_AXIS, strokeWidth: 1, strokeDasharray: "3 3" }}
                    content={
                      <ChartTooltip
                        compareEnabled={compareEnabled}
                        property={property?.name}
                        category={category}
                        viewMode={viewMode}
                      />
                    }
                  />
                  {seriesKeys.map((key, seriesIndex) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={seriesMeta[key].label}
                      stroke={seriesMeta[key].color}
                      strokeWidth={2.5}
                      strokeDasharray={seriesIndex === 1 ? "7 4" : undefined}
                      dot={{ r: 2.5, fill: seriesMeta[key].color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={!reduceMotion}
                      animationDuration={reduceMotion ? 0 : 300}
                    />
                  ))}
                  {compareEnabled &&
                    seriesKeys.map(key => (
                      <Line
                        key={seriesMeta[key].prevKey}
                        type="monotone"
                        dataKey={seriesMeta[key].prevKey}
                        name={`${seriesMeta[key].label} (período anterior)`}
                        stroke={seriesMeta[key].color}
                        strokeOpacity={0.45}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={!reduceMotion}
                        animationDuration={reduceMotion ? 0 : 300}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p id={`${eyebrowId}-focus-live`} className="sr-only" aria-live="polite">
              {activeIndex !== null && data[activeIndex]
                ? `${data[activeIndex].label}: entradas ${formatCurrency(data[activeIndex].entradas)}, saídas ${formatCurrency(data[activeIndex].saidas)}, resultado ${formatCurrency(data[activeIndex].resultado)}.`
                : ""}
            </p>

            <Legend seriesKeys={seriesKeys} seriesMeta={seriesMeta} compareEnabled={compareEnabled} />
          </>
        )}
      </div>
    </div>
  );
}

// --- subcomponents ----------------------------------------------------------

function SummaryStat({
  label,
  value,
  change,
  tone = "default",
  invert = false,
}: {
  label: string;
  value: string;
  change?: number | null;
  tone?: "default" | "positive" | "expense";
  invert?: boolean;
}) {
  const toneClass = tone === "positive" ? "text-positive" : tone === "expense" ? "text-[#765f45]" : "text-graphite";
  const showChange = change !== undefined && change !== null;
  const isUp = showChange && change! >= 0;
  const goodDirection = invert ? !isUp : isUp;
  return (
    <div className="min-w-0">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">{label}</p>
      <p className={`mt-2 truncate font-display text-2xl font-bold tabular-nums sm:text-3xl ${toneClass}`}>{value}</p>
      {showChange ? (
        <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${goodDirection ? "text-positive" : "text-[#765f45]"}`}>
          {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {formatPercentChange(change)} vs. período anterior
        </p>
      ) : null}
    </div>
  );
}

function Legend({
  seriesKeys,
  seriesMeta,
  compareEnabled,
}: {
  seriesKeys: readonly string[];
  seriesMeta: Record<string, { label: string; color: string }>;
  compareEnabled: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-graphite/70">
      {seriesKeys.map((key, index) => (
        <span key={key} className="flex items-center gap-2">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke={seriesMeta[key].color} strokeWidth="2.5" strokeDasharray={index === 1 ? "5 3" : undefined} />
          </svg>
          {seriesMeta[key].label}
        </span>
      ))}
      {compareEnabled ? (
        <span className="flex items-center gap-2 text-graphite/50">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke={COLOR_AXIS} strokeWidth="2" strokeDasharray="4 4" />
          </svg>
          Período anterior
        </span>
      ) : null}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  compareEnabled,
  property,
  category,
  viewMode,
}: {
  active?: boolean;
  payload?: { payload: Record<string, number | string> }[];
  label?: string;
  compareEnabled: boolean;
  property?: string;
  category?: string;
  viewMode: ViewMode;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const entradas = viewMode === "cumulative" ? Number(row.cumEntradas) : Number(row.entradas);
  const saidas = viewMode === "cumulative" ? Number(row.cumSaidas) : Number(row.saidas);
  const resultado = viewMode === "net" ? Number(row.resultado) : entradas - saidas;
  const entradasPrev = viewMode === "cumulative" ? Number(row.cumEntradasPrev) : Number(row.entradasPrev);
  const saidasPrev = viewMode === "cumulative" ? Number(row.cumSaidasPrev) : Number(row.saidasPrev);
  const resultadoChange = compareEnabled ? pctChange(resultado, entradasPrev - saidasPrev) : null;

  return (
    <div className="max-w-[240px] border border-olive/35 bg-[#faf9f5] px-4 py-3 text-left shadow-none">
      <p className="font-display text-sm font-bold text-graphite">{label}</p>
      {property ? <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-olive">{property}{category ? ` · ${category}` : ""}</p> : null}
      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-graphite/60">Entradas</dt>
          <dd className="font-semibold tabular-nums" style={{ color: COLOR_ENTRADAS }}>{formatCurrency(entradas)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-graphite/60">Saídas</dt>
          <dd className="font-semibold tabular-nums" style={{ color: COLOR_SAIDAS }}>{formatCurrency(saidas)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-olive/20 pt-1">
          <dt className="text-graphite/60">Resultado</dt>
          <dd className={`font-semibold tabular-nums ${resultado >= 0 ? "text-positive" : "text-[#765f45]"}`}>{formatCurrency(resultado)}</dd>
        </div>
        {compareEnabled && resultadoChange !== null ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-graphite/60">Vs. período anterior</dt>
            <dd className="font-semibold tabular-nums">{formatPercentChange(resultadoChange)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="h-[300px] w-full space-y-3 sm:h-[400px]" aria-busy="true" aria-label="A carregar o gráfico">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-[260px] place-items-center border border-dashed border-negative/40 bg-background px-6 text-center">
      <div className="max-w-sm">
        <AlertTriangle className="mx-auto h-6 w-6 text-negative" />
        <p className="mt-4 font-display text-xl font-bold text-graphite">Não foi possível carregar o gráfico.</p>
        <p className="mt-2 text-sm leading-6 text-graphite/55">Verifique a sua conexão e tente novamente.</p>
        <Button onClick={onRetry} variant="outline" className="mt-4 rounded-none border-olive/40">Tentar novamente</Button>
      </div>
    </div>
  );
}

function EmptyPeriodState() {
  return (
    <div className="grid min-h-[260px] place-items-center border border-dashed border-olive/35 bg-background px-6 text-center">
      <div className="max-w-sm">
        <ChartNoAxesCombined className="mx-auto h-6 w-6 text-olive" />
        <p className="mt-4 font-display text-xl font-bold text-graphite">O gráfico começa com o primeiro lançamento.</p>
        <p className="mt-2 text-sm leading-6 text-graphite/55">Entradas e saídas aparecerão aqui conforme o período selecionado.</p>
      </div>
    </div>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="grid min-h-[260px] place-items-center border border-dashed border-olive/35 bg-background px-6 text-center">
      <div className="max-w-sm">
        <Minus className="mx-auto h-6 w-6 text-olive" />
        <p className="mt-4 font-display text-xl font-bold text-graphite">Nenhum resultado para este filtro.</p>
        <p className="mt-2 text-sm leading-6 text-graphite/55">Há lançamentos no período, mas nenhum corresponde à categoria selecionada.</p>
        <Button onClick={onClear} variant="outline" className="mt-4 rounded-none border-olive/40">Limpar filtro de categoria</Button>
      </div>
    </div>
  );
}

function AccessibleTable({
  data,
  granularity,
  viewMode,
  compareEnabled,
}: {
  data: ReturnType<typeof toBuckets> extends never ? never : { label: string; entradas: number; saidas: number; resultado: number; entradasPrev: number; saidasPrev: number }[];
  granularity: Granularity;
  viewMode: ViewMode;
  compareEnabled: boolean;
}) {
  const periodLabel = granularity === "day" ? "Dia" : granularity === "week" ? "Semana" : "Mês";
  return (
    <div className="max-h-[400px] overflow-auto border border-olive/25">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{periodLabel}</TableHead>
            <TableHead className="text-right">Entradas</TableHead>
            <TableHead className="text-right">Saídas</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            {compareEnabled ? <TableHead className="text-right">Variação</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(row => {
            const resultadoPrev = row.entradasPrev - row.saidasPrev;
            const change = compareEnabled ? pctChange(row.resultado, resultadoPrev) : null;
            return (
              <TableRow key={row.label}>
                <TableCell className="whitespace-nowrap font-medium">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.entradas)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.saidas)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.resultado)}</TableCell>
                {compareEnabled ? <TableCell className="text-right tabular-nums">{change === null ? "—" : formatPercentChange(change)}</TableCell> : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
