import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonth,
  formatPercent,
} from "@/lib/formatters";
import type {
  AlternativeComparison,
  ComparisonTimelinePoint,
  InvestmentSnapshot,
} from "@shared/investments";
import { Table2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Mesma identidade dos gráficos de fluxo de caixa: verde da propriedade para a
// atividade rural (realizado) e terra para a melhor alternativa (simulada); as
// demais alternativas ficam em cinza de contexto, com valores na tabela.
const COLOR_RURAL = "#34452f";
const COLOR_BEST = "#8a7654";
const COLOR_OTHER = "#a4ad98";
const COLOR_GRID = "rgba(115, 118, 83, 0.22)";
const COLOR_AXIS = "#737653";
const COLOR_ZERO = "#161c19";

function useTableToggle() {
  const [showTable, setShowTable] = useState(false);
  const toggle = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setShowTable(value => !value)}
      aria-pressed={showTable}
      className="h-9 rounded-none border-olive/35 text-xs font-semibold text-graphite hover:bg-accent"
    >
      <Table2 className="mr-2 h-3.5 w-3.5" />
      {showTable ? "Ver gráfico" : "Ver tabela"}
    </Button>
  );
  return [showTable, toggle] as const;
}

function ChartCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="min-w-0 border border-olive/30 bg-card p-5 sm:p-7">
      <figcaption className="flex flex-wrap items-start justify-between gap-4 border-b border-olive/25 pb-5">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-olive">
            {eyebrow}
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold text-graphite">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs leading-5 text-graphite/60">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </figcaption>
      <div className="mt-5">{children}</div>
    </figure>
  );
}

function LineKey({
  color,
  dashed = false,
}: {
  color: string;
  dashed?: boolean;
}) {
  return (
    <svg width="18" height="8" aria-hidden="true" className="shrink-0">
      <line
        x1="0"
        y1="4"
        x2="18"
        y2="4"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={dashed ? "5 3" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

function TooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: {
    key: string;
    label: string;
    value: string;
    color: string;
    dashed?: boolean;
  }[];
}) {
  return (
    <div className="max-w-[280px] border border-olive/35 bg-[#faf9f5] px-4 py-3 text-left">
      <p className="font-display text-sm font-bold text-graphite">{title}</p>
      <dl className="mt-2 space-y-1.5 text-xs">
        {rows.map(row => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4"
          >
            <dt className="flex min-w-0 items-center gap-2 text-graphite/60">
              <LineKey color={row.color} dashed={row.dashed} />
              <span className="truncate">{row.label}</span>
            </dt>
            <dd className="font-semibold tabular-nums text-graphite">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function monthTicks(lastMonth: number) {
  const step =
    lastMonth <= 12 ? 1 : lastMonth <= 24 ? 3 : lastMonth <= 72 ? 12 : 24;
  const ticks: number[] = [];
  for (let month = 0; month <= lastMonth; month += step) ticks.push(month);
  if (ticks[ticks.length - 1] !== lastMonth) ticks.push(lastMonth);
  return ticks;
}

/** Evolução de uma alternativa ao longo do seu próprio prazo (RF28/RF31). */
export function InvestmentGrowthChart({
  name,
  timeline,
}: {
  name: string;
  timeline: InvestmentSnapshot[];
}) {
  const [showTable, tableToggle] = useTableToggle();
  const lastMonth = timeline[timeline.length - 1]?.month ?? 0;
  const final = timeline[timeline.length - 1];
  const tableRows = timeline.filter(
    point =>
      point.month > 0 &&
      (lastMonth <= 24 || point.month % 12 === 0 || point.month === lastMonth)
  );

  return (
    <ChartCard
      eyebrow="Evolução da simulação"
      title={`${name}: aplicado × valor líquido`}
      description="Valor líquido = saldo após taxas e imposto, se resgatado naquele mês. A distância entre as linhas é o ganho líquido acumulado."
      action={tableToggle}
    >
      {showTable ? (
        <div className="max-h-[400px] overflow-auto border border-olive/25">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Valor aplicado</TableHead>
                <TableHead className="text-right">Rendimento bruto</TableHead>
                <TableHead className="text-right">Taxa de adm.</TableHead>
                <TableHead className="text-right">IR no resgate</TableHead>
                <TableHead className="text-right">Valor líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map(point => (
                <TableRow key={point.month}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {point.month}º mês
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(point.contributed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(point.grossYield)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(point.adminFees)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(point.incomeTax)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(point.netBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Gráfico da simulação ${name}: ${formatCurrency(final?.contributed)} aplicados resultam em ${formatCurrency(final?.netBalance)} líquidos após ${lastMonth} meses.`}
            className="h-[300px] w-full min-w-0 sm:h-[340px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={timeline}
                margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid vertical={false} stroke={COLOR_GRID} />
                <XAxis
                  dataKey="month"
                  type="number"
                  domain={[0, lastMonth]}
                  ticks={monthTicks(lastMonth)}
                  tickFormatter={month =>
                    month === 0 ? "Início" : `${month}m`
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLOR_AXIS, fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLOR_AXIS, fontSize: 11 }}
                  tickFormatter={formatCompactCurrency}
                  width={70}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: COLOR_AXIS, strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const point = active
                      ? (payload?.[0]?.payload as
                          | InvestmentSnapshot
                          | undefined)
                      : undefined;
                    if (!point) return null;
                    return (
                      <TooltipCard
                        title={
                          point.month === 0
                            ? "Data da aplicação"
                            : `${point.month}º mês`
                        }
                        rows={[
                          {
                            key: "net",
                            label: "Valor líquido",
                            value: formatCurrency(point.netBalance),
                            color: COLOR_RURAL,
                          },
                          {
                            key: "contributed",
                            label: "Valor aplicado",
                            value: formatCurrency(point.contributed),
                            color: COLOR_OTHER,
                          },
                          {
                            key: "gain",
                            label: "Ganho líquido",
                            value: formatCurrency(point.netReturn),
                            color: "transparent",
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="netBalance"
                  stroke="none"
                  fill={COLOR_RURAL}
                  fillOpacity={0.1}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="contributed"
                  name="Valor aplicado"
                  stroke={COLOR_OTHER}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#faf9f5", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="netBalance"
                  name="Valor líquido"
                  stroke={COLOR_RURAL}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#faf9f5", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-graphite/70">
            <span className="flex items-center gap-2">
              <LineKey color={COLOR_RURAL} /> Valor líquido no resgate
            </span>
            <span className="flex items-center gap-2">
              <LineKey color={COLOR_OTHER} /> Valor aplicado (inicial + aportes)
            </span>
          </div>
        </>
      )}
    </ChartCard>
  );
}

type RuralResult = { netProfit: number; returnRate: number | null };

/** Rentabilidade no período, sobre o mesmo capital, para cada opção (RF30/RF31). */
export function ReturnBarList({
  rural,
  alternatives,
  activityLabel,
}: {
  rural: RuralResult;
  alternatives: AlternativeComparison[];
  activityLabel: string;
}) {
  const rows = [
    {
      key: "rural",
      name: activityLabel,
      rate: rural.returnRate ?? 0,
      amount: rural.netProfit,
      color: COLOR_RURAL,
      note: "Realizado",
    },
    ...alternatives.map(alternative => ({
      key: `alt-${alternative.id}`,
      name: alternative.name,
      rate: alternative.returnRate ?? 0,
      amount: alternative.netReturn,
      color: alternative.isBest ? COLOR_BEST : COLOR_OTHER,
      note: alternative.isBest ? "Melhor alternativa" : "Simulado",
    })),
  ];
  const min = Math.min(0, ...rows.map(row => row.rate));
  const max = Math.max(0, ...rows.map(row => row.rate));
  const span = max - min || 1;
  const zero = ((0 - min) / span) * 100;

  return (
    <ul
      className="space-y-4"
      aria-label="Rentabilidade líquida no período por opção"
    >
      {rows.map(row => {
        const position = ((row.rate - min) / span) * 100;
        const left = Math.min(zero, position);
        const width = Math.abs(position - zero);
        const negative = row.rate < 0;
        return (
          <li
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]"
          >
            <span className="col-span-2 min-w-0 sm:col-span-1">
              <span className="block truncate text-sm font-semibold text-graphite">
                {row.name}
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-olive">
                {row.note}
              </span>
            </span>
            <span className="relative block h-6 min-w-0" aria-hidden="true">
              <span
                className="absolute inset-y-0 w-px bg-graphite/35"
                style={{ left: `${zero}%` }}
              />
              <span
                className="absolute top-1/2 h-4 -translate-y-1/2"
                style={{
                  left: `${left}%`,
                  width: `max(${width}%, 2px)`,
                  background: row.color,
                  borderRadius: negative ? "4px 0 0 4px" : "0 4px 4px 0",
                }}
              />
            </span>
            <span className="whitespace-nowrap text-right">
              <span className="block text-sm font-bold tabular-nums text-graphite">
                {formatPercent(row.rate)}
              </span>
              <span className="block text-xs tabular-nums text-graphite/55">
                {formatCurrency(row.amount)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Resultado acumulado mês a mês no mesmo período (RN07/RF31). */
export function CumulativeResultChart({
  timeline,
  alternatives,
  activityLabel,
}: {
  timeline: ComparisonTimelinePoint[];
  alternatives: AlternativeComparison[];
  activityLabel: string;
}) {
  const [showTable, tableToggle] = useTableToggle();
  const best = alternatives.find(alternative => alternative.isBest);
  const others = alternatives.filter(alternative => !alternative.isBest);
  const data = timeline.map(point => ({
    label: point.month ? formatMonth(point.month, "short") : "Início",
    month: point.month,
    rural: point.rural,
    ...Object.fromEntries(
      alternatives.map(alternative => [
        `alt${alternative.id}`,
        point.alternatives[String(alternative.id)] ?? 0,
      ])
    ),
  }));
  const last = data[data.length - 1];

  return (
    <ChartCard
      eyebrow="Mesmo período"
      title="Resultado acumulado mês a mês"
      description="Lucro líquido rural acumulado (realizado) contra o retorno líquido que o mesmo capital acumularia em cada alternativa (simulado)."
      action={tableToggle}
    >
      {showTable ? (
        <div className="max-h-[400px] overflow-auto border border-olive/25">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">{activityLabel}</TableHead>
                {alternatives.map(alternative => (
                  <TableHead key={alternative.id} className="text-right">
                    {alternative.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(row => (
                <TableRow key={row.label}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {row.month ? formatMonth(row.month) : "Início do período"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.rural)}
                  </TableCell>
                  {alternatives.map(alternative => (
                    <TableCell
                      key={alternative.id}
                      className="text-right tabular-nums"
                    >
                      {formatCurrency(
                        Number(row[`alt${alternative.id}` as keyof typeof row])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Resultado acumulado no período: ${activityLabel} ${formatCurrency(last?.rural)}${best ? `; melhor alternativa, ${best.name}, ${formatCurrency(best.netReturn)}` : ""}.`}
            className="h-[300px] w-full min-w-0 sm:h-[360px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid vertical={false} stroke={COLOR_GRID} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLOR_AXIS, fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={16}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLOR_AXIS, fontSize: 11 }}
                  tickFormatter={formatCompactCurrency}
                  width={70}
                />
                <ReferenceLine
                  y={0}
                  stroke={COLOR_ZERO}
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: COLOR_AXIS, strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const row = active
                      ? (payload?.[0]?.payload as
                          | (typeof data)[number]
                          | undefined)
                      : undefined;
                    if (!row) return null;
                    const alternativeRows = alternatives
                      .map(alternative => ({
                        alternative,
                        value: Number(
                          row[`alt${alternative.id}` as keyof typeof row]
                        ),
                      }))
                      .sort((left, right) => right.value - left.value)
                      .map(({ alternative, value }) => ({
                        key: String(alternative.id),
                        label: alternative.name,
                        value: formatCurrency(value),
                        color: alternative.isBest ? COLOR_BEST : COLOR_OTHER,
                        dashed: true,
                      }));
                    return (
                      <TooltipCard
                        title={
                          row.month
                            ? formatMonth(row.month)
                            : "Início do período"
                        }
                        rows={[
                          {
                            key: "rural",
                            label: activityLabel,
                            value: formatCurrency(row.rural),
                            color: COLOR_RURAL,
                          },
                          ...alternativeRows,
                        ]}
                      />
                    );
                  }}
                />
                {others.map(alternative => (
                  <Line
                    key={alternative.id}
                    type="linear"
                    dataKey={`alt${alternative.id}`}
                    name={alternative.name}
                    stroke={COLOR_OTHER}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#faf9f5", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                ))}
                {best ? (
                  <Line
                    type="linear"
                    dataKey={`alt${best.id}`}
                    name={best.name}
                    stroke={COLOR_BEST}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#faf9f5", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                ) : null}
                <Line
                  type="linear"
                  dataKey="rural"
                  name={activityLabel}
                  stroke={COLOR_RURAL}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#faf9f5", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-graphite/70">
            <span className="flex items-center gap-2">
              <LineKey color={COLOR_RURAL} /> {activityLabel} (realizado)
            </span>
            {best ? (
              <span className="flex items-center gap-2">
                <LineKey color={COLOR_BEST} dashed /> {best.name} (melhor
                alternativa)
              </span>
            ) : null}
            {others.length ? (
              <span className="flex items-center gap-2">
                <LineKey color={COLOR_OTHER} dashed />{" "}
                {others.length === 1 ? others[0].name : "Demais alternativas"}{" "}
                (simulado)
              </span>
            ) : null}
          </div>
        </>
      )}
    </ChartCard>
  );
}
