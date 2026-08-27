import { formatCurrency } from "@/lib/formatters";
import { ChartNoAxesCombined } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CashFlowEntry = {
  occurredOn: Date | string;
  entryType: string;
  amount: number | string;
};

type CashFlowChartProps = {
  entries: CashFlowEntry[] | undefined;
  variant?: "line" | "bar";
  height?: number;
};

function dateKey(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function formatAxisValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function CashFlowChart({ entries, variant = "line", height = 310 }: CashFlowChartProps) {
  const totals = new Map<string, { date: string; entradas: number; saidas: number }>();

  entries?.forEach(entry => {
    const key = dateKey(entry.occurredOn);
    const current = totals.get(key) ?? { date: key, entradas: 0, saidas: 0 };
    const amount = Number(entry.amount);
    if (entry.entryType === "receita") current.entradas += amount;
    else current.saidas += amount;
    totals.set(key, current);
  });

  const data = Array.from(totals.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(item => ({
      ...item,
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
        new Date(`${item.date}T12:00:00`),
      ),
    }));

  if (!data.length) {
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

  const common = (
    <>
      <CartesianGrid vertical={false} stroke="rgba(115, 118, 83, 0.22)" />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#737653", fontSize: 11 }} dy={10} />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#737653", fontSize: 11 }}
        tickFormatter={formatAxisValue}
        width={52}
      />
      <Tooltip
        cursor={{ fill: "rgba(115, 118, 83, 0.08)" }}
        contentStyle={{ border: "1px solid #cfd1c3", borderRadius: 0, background: "#faf9f5", boxShadow: "none" }}
        labelStyle={{ color: "#161c19", fontWeight: 700 }}
        formatter={value => formatCurrency(Number(value))}
      />
    </>
  );

  return (
    <div
      role="img"
      aria-label="Gráfico de entradas e saídas do período"
      className="w-full min-w-0"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }} barGap={4}>
            {common}
            <Bar dataKey="entradas" name="Entradas" fill="#34452f" radius={0} maxBarSize={38} />
            <Bar dataKey="saidas" name="Saídas" fill="#8a7654" radius={0} maxBarSize={38} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            {common}
            <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#34452f" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#8a7654" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
