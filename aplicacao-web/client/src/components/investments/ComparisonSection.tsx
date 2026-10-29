import { QueryErrorState } from "@/components/DataFeedback";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCurrency, formatMonth, formatPercent } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import {
  COMPARISON_MAX_CAPITAL,
  COMPARISON_MAX_MONTHS,
  countMonths,
  shiftMonth,
} from "@shared/investments";
import { keepPreviousData } from "@tanstack/react-query";
import { Calculator, Scale, Sprout, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { parseDecimal } from "./display";
import { CumulativeResultChart, ReturnBarList } from "./InvestmentCharts";
import { Notice, SectionHeading, Stat } from "./InvestmentBlocks";
import { MonthPicker } from "./MonthPicker";
import type { Comparison } from "./types";

const periodPresets = [
  { value: "ultimos12", label: "Últimos 12 meses" },
  { value: "anoAnterior", label: "Ano anterior" },
  { value: "anoAtual", label: "Ano atual" },
  { value: "personalizado", label: "Personalizado" },
] as const;

type PeriodPreset = (typeof periodPresets)[number]["value"];

const CAPITAL_STORAGE_PREFIX = "sigar:investimentos:capital:";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function presetRange(preset: Exclude<PeriodPreset, "personalizado">) {
  const reference = currentMonth();
  const year = Number(reference.slice(0, 4));
  if (preset === "ultimos12")
    return {
      startMonth: shiftMonth(reference, -12),
      endMonth: shiftMonth(reference, -1),
    };
  if (preset === "anoAnterior")
    return { startMonth: `${year - 1}-01`, endMonth: `${year - 1}-12` };
  return { startMonth: `${year}-01`, endMonth: `${year}-12` };
}

function readStoredCapital(propertyId: number | undefined) {
  if (!propertyId) return "";
  try {
    return (
      window.localStorage.getItem(`${CAPITAL_STORAGE_PREFIX}${propertyId}`) ??
      ""
    );
  } catch {
    return "";
  }
}

function storeCapital(propertyId: number | undefined, value: string) {
  if (!propertyId) return;
  try {
    window.localStorage.setItem(
      `${CAPITAL_STORAGE_PREFIX}${propertyId}`,
      value
    );
  } catch {
    // Sem armazenamento local, o capital apenas não é lembrado.
  }
}

export function ComparisonSection({
  propertyId,
  hasAlternatives,
}: {
  propertyId: number;
  hasAlternatives: boolean;
}) {
  const [preset, setPreset] = useState<PeriodPreset>("ultimos12");
  const [range, setRange] = useState(() => presetRange("ultimos12"));
  const [capitalInput, setCapitalInput] = useState(() =>
    readStoredCapital(propertyId)
  );
  const [activity, setActivity] = useState("all");
  const debouncedCapital = useDebouncedValue(capitalInput, 450);

  useEffect(() => {
    setCapitalInput(readStoredCapital(propertyId));
    setActivity("all");
  }, [propertyId]);

  const nowMonth = currentMonth();
  const nowYear = Number(nowMonth.slice(0, 4));
  const years = Array.from({ length: 13 }, (_, index) => nowYear - 10 + index);
  const months = countMonths(range.startMonth, range.endMonth);
  const periodError =
    months < 1
      ? "O mês final deve ser igual ou posterior ao inicial."
      : months > COMPARISON_MAX_MONTHS
        ? `Escolha um período de até ${COMPARISON_MAX_MONTHS} meses.`
        : null;
  const capital = parseDecimal(debouncedCapital);
  const capitalValid =
    debouncedCapital.trim() !== "" &&
    Number.isFinite(capital) &&
    capital > 0 &&
    capital <= COMPARISON_MAX_CAPITAL;
  const typedCapital = parseDecimal(capitalInput);
  const capitalError =
    capitalInput.trim() === ""
      ? null
      : !Number.isFinite(typedCapital) || typedCapital <= 0
        ? "Informe um valor maior que zero."
        : typedCapital > COMPARISON_MAX_CAPITAL
          ? "Valor acima do limite de R$ 999.999.999.999,00."
          : null;

  const compareQuery = trpc.finance.investments.compare.useQuery(
    {
      propertyId,
      startMonth: range.startMonth,
      endMonth: range.endMonth,
      capital,
      activity: activity === "all" ? undefined : activity,
    },
    { enabled: capitalValid && !periodError, placeholderData: keepPreviousData }
  );
  const comparison = compareQuery.data;
  const activityOptions = Array.from(
    new Set([
      ...(comparison?.activities ?? []),
      ...(activity === "all" ? [] : [activity]),
    ])
  ).sort();
  const activityLabel = activity === "all" ? "Atividade rural" : activity;

  const choosePreset = (value: PeriodPreset) => {
    setPreset(value);
    if (value !== "personalizado") setRange(presetRange(value));
  };
  const changeRange = (next: Partial<typeof range>) => {
    setPreset("personalizado");
    setRange(current => ({ ...current, ...next }));
  };

  return (
    <section className="space-y-5" aria-labelledby="comparacao-titulo">
      <SectionHeading
        id="comparacao-titulo"
        eyebrow="RF29, RF30 e RN07 · Mesmo período"
        title="Atividade rural × investimentos"
        description="O lucro líquido da propriedade no período é comparado com o que o mesmo capital renderia em cada alternativa, nos mesmos meses."
      />

      <div className="grid gap-4 border-y border-olive/30 py-5 md:grid-cols-2 xl:grid-cols-3 xl:items-start">
        <div>
          <label
            htmlFor="comparacao-periodo"
            className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive"
          >
            Período
          </label>
          <Select
            value={preset}
            onValueChange={value => choosePreset(value as PeriodPreset)}
          >
            <SelectTrigger
              id="comparacao-periodo"
              className="h-11 w-full rounded-none border-olive/35 bg-transparent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {periodPresets.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <MonthPicker
          label="De"
          value={range.startMonth}
          years={years}
          onChange={startMonth => changeRange({ startMonth })}
        />
        <MonthPicker
          label="Até"
          value={range.endMonth}
          years={years}
          onChange={endMonth => changeRange({ endMonth })}
        />
        <div>
          <label
            htmlFor="capital-empregado"
            className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive"
          >
            Capital empregado (R$)
          </label>
          <Input
            id="capital-empregado"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={capitalInput}
            onChange={event => {
              setCapitalInput(event.target.value);
              storeCapital(propertyId, event.target.value);
            }}
            placeholder="Ex.: 1500000"
            aria-invalid={Boolean(capitalError)}
            aria-describedby="capital-ajuda"
            className="h-11 rounded-none tabular-nums"
          />
          <p
            id="capital-ajuda"
            className={`mt-1.5 text-[11px] leading-4 ${capitalError ? "text-destructive" : "text-graphite/50"}`}
          >
            {capitalError ??
              "Terra, benfeitorias, máquinas, animais e capital de giro."}
          </p>
        </div>
        <div>
          <label
            htmlFor="comparacao-atividade"
            className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive"
          >
            Atividade
          </label>
          <Select value={activity} onValueChange={setActivity}>
            <SelectTrigger
              id="comparacao-atividade"
              className="h-11 w-full rounded-none border-olive/35 bg-transparent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">Todas as atividades</SelectItem>
              {activityOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PeriodNotes
        startMonth={range.startMonth}
        endMonth={range.endMonth}
        months={months}
        nowMonth={nowMonth}
        periodError={periodError}
      />

      {periodError ? null : !capitalValid ? (
        <EmptyState
          icon={Calculator}
          title="Informe o capital empregado na propriedade"
          description="É a base da rentabilidade rural e do custo de oportunidade: quanto esse capital renderia se estivesse aplicado em cada alternativa no mesmo período."
        />
      ) : compareQuery.isError ? (
        <QueryErrorState
          onRetry={() => {
            void compareQuery.refetch();
          }}
        />
      ) : !comparison ? (
        <Skeleton className="h-72 w-full rounded-none" />
      ) : (
        <div
          className={`space-y-6 transition-opacity ${compareQuery.isPlaceholderData ? "opacity-60" : "opacity-100"}`}
          aria-busy={compareQuery.isFetching}
        >
          <ComparisonResult
            comparison={comparison}
            activityLabel={activityLabel}
            hasAlternatives={hasAlternatives}
          />
        </div>
      )}
    </section>
  );
}

function PeriodNotes({
  startMonth,
  endMonth,
  months,
  nowMonth,
  periodError,
}: {
  startMonth: string;
  endMonth: string;
  months: number;
  nowMonth: string;
  periodError: string | null;
}) {
  if (periodError) {
    return <Notice tone="warning">{periodError}</Notice>;
  }
  const notes: string[] = [];
  if (endMonth >= nowMonth) {
    notes.push(
      endMonth === nowMonth && startMonth < nowMonth
        ? "O mês atual ainda não terminou: o resultado rural considera só os lançamentos já registrados, enquanto as alternativas rendem o mês inteiro."
        : "O período inclui meses que ainda não terminaram: o resultado rural considera só os lançamentos já registrados para eles."
    );
  }
  if (months < 12) {
    notes.push(
      "A atividade rural é sazonal: em períodos curtos, vendas ou colheitas fora da janela distorcem a comparação. Prefira 12 meses ou a safra completa."
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-graphite/65">
        Período analisado:{" "}
        <strong className="font-semibold text-graphite">
          {formatMonth(startMonth)} a {formatMonth(endMonth)}
        </strong>{" "}
        ({months} {months === 1 ? "mês" : "meses"}).
      </p>
      {notes.map(note => (
        <Notice key={note} tone="info">
          {note}
        </Notice>
      ))}
    </div>
  );
}

function ComparisonResult({
  comparison,
  activityLabel,
  hasAlternatives,
}: {
  comparison: Comparison;
  activityLabel: string;
  hasAlternatives: boolean;
}) {
  const { rural, opportunityCost, economicProfit, verdict, period } =
    comparison;
  const periodText = `entre ${formatMonth(period.startMonth)} e ${formatMonth(period.endMonth)}`;
  const reference = comparison.alternatives.find(
    alternative => alternative.id === opportunityCost?.alternativeId
  );
  const subject = comparison.activity
    ? `a atividade “${comparison.activity}”`
    : "a atividade rural";
  const Subject = `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`;

  const verdictText =
    verdict === null
      ? "Cadastre ao menos uma alternativa de investimento para calcular o custo de oportunidade e o resultado econômico."
      : !opportunityCost?.alternativeId
        ? `Nenhuma alternativa teria retorno líquido positivo ${periodText}; o custo de oportunidade considera o capital parado (R$ 0,00).`
        : verdict === "rural"
          ? `${Subject} remunerou o capital ${formatCurrency(economicProfit)} acima da melhor alternativa (${opportunityCost.alternativeName}) ${periodText}.`
          : verdict === "alternativa"
            ? `Aplicado em ${opportunityCost.alternativeName}, o mesmo capital teria rendido ${formatCurrency(Math.abs(economicProfit ?? 0))} a mais que ${subject} ${periodText}.`
            : `${Subject} e a melhor alternativa (${opportunityCost.alternativeName}) empataram ${periodText}.`;

  return (
    <>
      <div
        className={`flex items-start gap-3 border px-5 py-4 ${verdict === "alternativa" ? "border-[#8a7654]/50 bg-[#8a7654]/10" : verdict === "rural" ? "border-positive/40 bg-positive/10" : "border-olive/30 bg-card"}`}
      >
        {verdict === "alternativa" ? (
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#765f45]" />
        ) : verdict === "rural" ? (
          <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-positive" />
        ) : (
          <Scale className="mt-0.5 h-5 w-5 shrink-0 text-olive" />
        )}
        <p className="text-sm font-semibold leading-6 text-graphite">
          {verdictText}
        </p>
      </div>

      <div className="grid gap-px border border-olive/30 bg-olive/25 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={`Lucro líquido · ${activityLabel}`}
          value={formatCurrency(rural.netProfit)}
          tone={rural.netProfit >= 0 ? "positive" : "negative"}
          detail={`Receitas ${formatCurrency(rural.totalRevenue)} − saídas ${formatCurrency(rural.totalOutflows)} · ${rural.entryCount} ${rural.entryCount === 1 ? "lançamento" : "lançamentos"}`}
        />
        <Stat
          label="Rentabilidade rural no período"
          value={formatPercent(rural.returnRate)}
          detail={`Lucro líquido ÷ capital de ${formatCurrency(comparison.capital)}`}
        />
        <Stat
          label="Custo de oportunidade"
          value={opportunityCost ? formatCurrency(opportunityCost.value) : "—"}
          detail={
            !opportunityCost
              ? "Sem alternativas cadastradas."
              : reference
                ? `Retorno líquido de ${reference.name} (${formatPercent(reference.returnRate)}) sobre o mesmo capital.`
                : "Nenhuma alternativa rende: capital parado."
          }
        />
        <Stat
          label="Resultado econômico"
          value={economicProfit === null ? "—" : formatCurrency(economicProfit)}
          tone={
            economicProfit === null
              ? "default"
              : economicProfit >= 0
                ? "positive"
                : "negative"
          }
          detail="Lucro líquido − custo de oportunidade."
          featured={economicProfit !== null}
        />
      </div>

      {hasAlternatives && comparison.alternatives.length ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:items-start">
            <figure className="min-w-0 border border-olive/30 bg-card p-5 sm:p-7">
              <figcaption className="border-b border-olive/25 pb-5">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-olive">
                  Mesmo capital, mesmo período
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold text-graphite">
                  Rentabilidade líquida no período
                </h3>
                <p className="mt-1 text-xs leading-5 text-graphite/60">
                  Percentual sobre {formatCurrency(comparison.capital)} e
                  retorno em reais de cada opção.
                </p>
              </figcaption>
              <div className="mt-6">
                <ReturnBarList
                  rural={rural}
                  alternatives={comparison.alternatives}
                  activityLabel={activityLabel}
                />
              </div>
            </figure>
            <CumulativeResultChart
              timeline={comparison.timeline}
              alternatives={comparison.alternatives}
              activityLabel={activityLabel}
            />
          </div>
          <ComparisonTable
            comparison={comparison}
            activityLabel={activityLabel}
          />
        </>
      ) : null}
    </>
  );
}

function ComparisonTable({
  comparison,
  activityLabel,
}: {
  comparison: Comparison;
  activityLabel: string;
}) {
  const { rural } = comparison;
  const outcomeLabels = {
    rural: "Atividade",
    alternativa: "Alternativa",
    empate: "Empate",
  } as const;
  const outcomeStyles = {
    rural: "border-positive/30 bg-positive/10 text-positive",
    alternativa: "border-[#8a7654]/40 bg-[#8a7654]/10 text-[#765f45]",
    empate: "border-olive/30 bg-accent text-graphite",
  } as const;

  return (
    <div className="overflow-x-auto border border-olive/30 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Opção
            </TableHead>
            <TableHead className="text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Retorno líquido
            </TableHead>
            <TableHead className="text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Rentabilidade
            </TableHead>
            <TableHead className="text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Custos e impostos
            </TableHead>
            <TableHead className="text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Vantagem da atividade
            </TableHead>
            <TableHead className="px-5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Rende mais
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-accent/40 hover:bg-accent/40">
            <TableCell className="px-5 font-semibold text-graphite">
              {activityLabel}
              <span className="block text-xs font-normal text-graphite/55">
                Realizado: lançamentos do período
              </span>
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatCurrency(rural.netProfit)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(rural.returnRate)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-graphite/55">
              {formatCurrency(rural.totalOutflows)}
            </TableCell>
            <TableCell className="text-right text-graphite/45">—</TableCell>
            <TableCell className="px-5 text-xs text-graphite/55">
              Referência
            </TableCell>
          </TableRow>
          {comparison.alternatives.map(alternative => (
            <TableRow key={alternative.id}>
              <TableCell className="px-5 font-semibold text-graphite">
                {alternative.name}
                <span className="block text-xs font-normal text-graphite/55">
                  {alternative.isBest
                    ? "Melhor alternativa · simulado"
                    : "Simulado"}
                </span>
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(alternative.netReturn)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(alternative.returnRate)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-graphite/55">
                {formatCurrency(
                  alternative.adminFees +
                    alternative.fixedCosts +
                    alternative.incomeTax
                )}
              </TableCell>
              <TableCell
                className={`text-right font-semibold tabular-nums ${alternative.ruralAdvantage >= 0 ? "text-positive" : "text-[#765f45]"}`}
              >
                {alternative.ruralAdvantage > 0 ? "+" : ""}
                {formatCurrency(alternative.ruralAdvantage)}
              </TableCell>
              <TableCell className="px-5">
                <Badge
                  variant="outline"
                  className={`whitespace-nowrap rounded-none border font-semibold ${outcomeStyles[alternative.outcome]}`}
                >
                  {outcomeLabels[alternative.outcome]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
