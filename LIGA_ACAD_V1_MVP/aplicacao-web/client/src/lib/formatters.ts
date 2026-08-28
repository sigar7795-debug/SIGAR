export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPeriod(startDate: string, endDate: string) {
  if (startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} — ${formatDate(endDate)}`;
}

/** "R$ 0" / "R$ 5 mil" / "R$ 10 mil" / "R$ 1,5 mi" — for chart axes and dense summaries. */
export function formatCompactCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

/** "+12,5%" / "-8%" / "0%" — period-over-period change indicators. */
export function formatPercentChange(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(value);
}

/** Short weekday/day-month/month-year labels for chart X-axis ticks, by granularity. */
export function formatAxisDate(value: Date | string, granularity: "day" | "week" | "month") {
  const date = new Date(`${typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10)}T12:00:00`);
  if (granularity === "month") return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}
