import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import {
  INVESTMENT_MAX_AMOUNT,
  INVESTMENT_MAX_RATE,
  INVESTMENT_MAX_TERM_MONTHS,
  type InvestmentRatePeriod,
  simulateInvestment,
  suggestIncomeTaxRate,
} from "@shared/investments";
import { PiggyBank } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { parseDecimal } from "./display";
import type { Alternative } from "./types";

export type AlternativeForm = {
  name: string;
  description: string;
  initialAmount: string;
  monthlyContribution: string;
  termMonths: string;
  returnRate: string;
  ratePeriod: InvestmentRatePeriod;
  adminFeeRate: string;
  fixedCosts: string;
  incomeTaxRate: string;
};

type FormErrors = Partial<Record<keyof AlternativeForm, string>>;

const emptyForm: AlternativeForm = {
  name: "",
  description: "",
  initialAmount: "",
  monthlyContribution: "0",
  termMonths: "12",
  returnRate: "",
  ratePeriod: "anual",
  adminFeeRate: "0",
  fixedCosts: "0",
  incomeTaxRate: "0",
};

function validateForm(form: AlternativeForm): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim().length < 2) errors.name = "Use pelo menos 2 caracteres.";
  for (const key of [
    "initialAmount",
    "monthlyContribution",
    "fixedCosts",
  ] as const) {
    const value = parseDecimal(form[key]);
    if (!Number.isFinite(value) || value < 0)
      errors[key] = "Informe um valor igual ou maior que zero.";
    else if (value > INVESTMENT_MAX_AMOUNT)
      errors[key] = "Valor acima do limite de R$ 999.999.999,00.";
  }
  if (
    !errors.initialAmount &&
    !errors.monthlyContribution &&
    parseDecimal(form.initialAmount) < 0.005 &&
    parseDecimal(form.monthlyContribution) < 0.005
  ) {
    errors.initialAmount =
      "Informe um valor inicial ou um aporte mensal maior que zero.";
  }
  const term = Number(form.termMonths);
  if (
    !Number.isInteger(term) ||
    term < 1 ||
    term > INVESTMENT_MAX_TERM_MONTHS
  ) {
    errors.termMonths = `Use um número inteiro de 1 a ${INVESTMENT_MAX_TERM_MONTHS} meses.`;
  }
  if (form.returnRate.trim() === "")
    errors.returnRate = "Informe a taxa de retorno esperada.";
  for (const key of ["returnRate", "adminFeeRate", "incomeTaxRate"] as const) {
    if (errors[key]) continue;
    const value = parseDecimal(form[key]);
    if (!Number.isFinite(value) || value < 0 || value > INVESTMENT_MAX_RATE)
      errors[key] = `Use uma taxa entre 0% e ${INVESTMENT_MAX_RATE}%.`;
  }
  return errors;
}

export function formToPayload(form: AlternativeForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    initialAmount: parseDecimal(form.initialAmount),
    monthlyContribution: parseDecimal(form.monthlyContribution),
    termMonths: Number(form.termMonths),
    returnRate: parseDecimal(form.returnRate),
    ratePeriod: form.ratePeriod,
    adminFeeRate: parseDecimal(form.adminFeeRate),
    fixedCosts: parseDecimal(form.fixedCosts),
    incomeTaxRate: parseDecimal(form.incomeTaxRate),
  };
}

function alternativeToForm(alternative: Alternative): AlternativeForm {
  const plain = (value: string) => String(Number(value));
  return {
    name: alternative.name,
    description: alternative.description ?? "",
    initialAmount: plain(alternative.initialAmount),
    monthlyContribution: plain(alternative.monthlyContribution),
    termMonths: String(alternative.termMonths),
    returnRate: plain(alternative.returnRate),
    ratePeriod: alternative.ratePeriod,
    adminFeeRate: plain(alternative.adminFeeRate),
    fixedCosts: plain(alternative.fixedCosts),
    incomeTaxRate: plain(alternative.incomeTaxRate),
  };
}

export function AlternativeDialog({
  open,
  editing,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: Alternative | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AlternativeForm) => void;
}) {
  const [form, setForm] = useState<AlternativeForm>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? alternativeToForm(editing) : emptyForm);
    setSubmitted(false);
  }, [editing, open]);

  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const preview = useMemo(
    () => (hasErrors ? null : simulateInvestment(formToPayload(form))),
    [form, hasErrors]
  );
  const term = Number(form.termMonths);
  const suggestedTax =
    Number.isInteger(term) && term >= 1 ? suggestIncomeTaxRate(term) : null;
  const update = (key: keyof AlternativeForm, value: string) =>
    setForm(current => ({ ...current, [key]: value }));
  const visibleError = (key: keyof AlternativeForm) =>
    submitted ? errors[key] : undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-3xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader className="border-b border-border px-6 py-6">
            <div className="mb-3 grid h-10 w-10 place-items-center bg-accent text-accent-foreground">
              <PiggyBank className="h-5 w-5" />
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold text-foreground">
              {editing
                ? "Editar alternativa"
                : "Nova alternativa de investimento"}
            </DialogTitle>
            <DialogDescription className="leading-6">
              Informe como o dinheiro seria aplicado. Custos e imposto podem
              ficar em zero quando não existirem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <Field
              id="alternativa-nome"
              label="Nome da alternativa"
              required
              error={visibleError("name")}
              className="sm:col-span-2"
            >
              <Input
                {...fieldProps("alternativa-nome", visibleError("name"))}
                value={form.name}
                onChange={event => update("name", event.target.value)}
                maxLength={120}
                placeholder="Ex.: CDB 100% do CDI"
                className="h-11"
              />
            </Field>
            <Field
              id="alternativa-valor-inicial"
              label="Valor inicial (R$)"
              required
              hint="Aplicado de uma vez, no início."
              error={visibleError("initialAmount")}
            >
              <Input
                {...fieldProps(
                  "alternativa-valor-inicial",
                  visibleError("initialAmount")
                )}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.initialAmount}
                onChange={event => update("initialAmount", event.target.value)}
                placeholder="Ex.: 50000"
                className="h-11 tabular-nums"
              />
            </Field>
            <Field
              id="alternativa-aporte"
              label="Aporte mensal (R$)"
              hint="Aplicado ao fim de cada mês. Use 0 se não houver."
              error={visibleError("monthlyContribution")}
            >
              <Input
                {...fieldProps(
                  "alternativa-aporte",
                  visibleError("monthlyContribution")
                )}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.monthlyContribution}
                onChange={event =>
                  update("monthlyContribution", event.target.value)
                }
                className="h-11 tabular-nums"
              />
            </Field>
            <Field
              id="alternativa-prazo"
              label="Prazo (meses)"
              required
              hint={`De 1 a ${INVESTMENT_MAX_TERM_MONTHS} meses. Ex.: 24 para 2 anos.`}
              error={visibleError("termMonths")}
            >
              <Input
                {...fieldProps("alternativa-prazo", visibleError("termMonths"))}
                type="number"
                inputMode="numeric"
                min="1"
                max={INVESTMENT_MAX_TERM_MONTHS}
                step="1"
                value={form.termMonths}
                onChange={event => update("termMonths", event.target.value)}
                className="h-11 tabular-nums"
              />
            </Field>
            <Field
              id="alternativa-taxa"
              label="Taxa de retorno (%)"
              required
              hint="Rentabilidade bruta esperada, antes de custos e IR."
              error={visibleError("returnRate")}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                <Input
                  {...fieldProps(
                    "alternativa-taxa",
                    visibleError("returnRate")
                  )}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={INVESTMENT_MAX_RATE}
                  step="0.0001"
                  value={form.returnRate}
                  onChange={event => update("returnRate", event.target.value)}
                  placeholder="Ex.: 11,5"
                  className="h-11 tabular-nums"
                />
                <Select
                  value={form.ratePeriod}
                  onValueChange={value => update("ratePeriod", value)}
                >
                  <SelectTrigger
                    aria-label="Periodicidade da taxa"
                    className="h-11"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anual">ao ano</SelectItem>
                    <SelectItem value="mensal">ao mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Field>
            <Field
              id="alternativa-administracao"
              label="Taxa de administração (% a.a.)"
              hint="Cobrada sobre o saldo. Ex.: 0,2 (custódia do Tesouro Direto)."
              error={visibleError("adminFeeRate")}
            >
              <Input
                {...fieldProps(
                  "alternativa-administracao",
                  visibleError("adminFeeRate")
                )}
                type="number"
                inputMode="decimal"
                min="0"
                max={INVESTMENT_MAX_RATE}
                step="0.0001"
                value={form.adminFeeRate}
                onChange={event => update("adminFeeRate", event.target.value)}
                className="h-11 tabular-nums"
              />
            </Field>
            <Field
              id="alternativa-custos-fixos"
              label="Custos fixos (R$)"
              hint="Pagos uma vez na aplicação, como corretagem."
              error={visibleError("fixedCosts")}
            >
              <Input
                {...fieldProps(
                  "alternativa-custos-fixos",
                  visibleError("fixedCosts")
                )}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.fixedCosts}
                onChange={event => update("fixedCosts", event.target.value)}
                className="h-11 tabular-nums"
              />
            </Field>
            <Field
              id="alternativa-imposto"
              label="Imposto sobre o rendimento (%)"
              hint="Renda fixa: 22,5% até 6 meses, 20% até 12, 17,5% até 24 e 15% acima. Poupança, LCI e LCA: 0."
              error={visibleError("incomeTaxRate")}
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  {...fieldProps(
                    "alternativa-imposto",
                    visibleError("incomeTaxRate")
                  )}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={INVESTMENT_MAX_RATE}
                  step="0.01"
                  value={form.incomeTaxRate}
                  onChange={event =>
                    update("incomeTaxRate", event.target.value)
                  }
                  className="h-11 w-36 tabular-nums"
                />
                {suggestedTax !== null ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      update("incomeTaxRate", String(suggestedTax))
                    }
                    className="h-11 rounded-none border-olive/40 text-xs font-semibold"
                  >
                    Usar tabela regressiva ({formatPercent(suggestedTax)})
                  </Button>
                ) : null}
              </div>
            </Field>
            <Field
              id="alternativa-observacoes"
              label="Observações"
              hint="Opcional. Ex.: instituição, liquidez, vencimento."
              className="sm:col-span-2"
            >
              <Textarea
                {...fieldProps("alternativa-observacoes", undefined)}
                value={form.description}
                onChange={event => update("description", event.target.value)}
                maxLength={600}
                rows={2}
              />
            </Field>
          </div>

          <div className="sticky bottom-0 border-t border-border bg-background">
            <div className="bg-accent/50 px-6 py-4" aria-live="polite">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">
                Estimativa com estes dados
              </p>
              {preview ? (
                <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <PreviewItem
                    label="Valor aplicado"
                    value={formatCurrency(preview.totalContributed)}
                  />
                  <PreviewItem
                    label="Custos e IR"
                    value={formatCurrency(preview.totalCosts)}
                  />
                  <PreviewItem
                    label="Valor líquido"
                    value={formatCurrency(preview.netBalance)}
                  />
                  <PreviewItem
                    label="Retorno líquido"
                    value={`${formatCurrency(preview.netReturn)} (${formatPercent(preview.netReturnRate)})`}
                    strong
                  />
                </dl>
              ) : (
                <p className="mt-1 text-sm text-graphite/60">
                  Complete ou corrija os campos para ver o retorno estimado.
                </p>
              )}
            </div>
            <DialogFooter className="px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-none bg-field font-semibold text-sand hover:bg-field/90"
              >
                {loading
                  ? "A guardar..."
                  : editing
                    ? "Guardar alterações"
                    : "Cadastrar alternativa"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-graphite/55">{label}</dt>
      <dd
        className={`mt-0.5 tabular-nums ${strong ? "font-bold text-graphite" : "font-semibold text-graphite/85"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Field({
  id,
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label
        htmlFor={id}
        className="mb-2 block text-xs font-bold text-muted-foreground"
      >
        {label}
        {required ? <span className="ml-1 text-primary">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-mensagem`}
          className="mt-1.5 text-xs font-semibold text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-mensagem`}
          className="mt-1.5 text-[11px] leading-4 text-graphite/50"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function fieldProps(id: string, error: string | undefined) {
  return {
    id,
    "aria-invalid": Boolean(error),
    "aria-describedby": `${id}-mensagem`,
  };
}
