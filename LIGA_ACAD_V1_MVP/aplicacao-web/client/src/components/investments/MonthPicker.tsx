import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long" }).format(
    new Date(Date.UTC(2026, index, 1))
  )
);

type MonthPickerProps = {
  label: string;
  /** Mês no formato AAAA-MM. */
  value: string;
  onChange: (value: string) => void;
  years: number[];
};

/** Mês e ano em dois seletores: funciona em todos os navegadores, ao contrário de `<input type="month">`. */
export function MonthPicker({
  label,
  value,
  onChange,
  years,
}: MonthPickerProps) {
  const [year, month] = value.split("-");
  const yearOptions = years.includes(Number(year))
    ? years
    : [...years, Number(year)].sort((a, b) => a - b);

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">
        {label}
      </legend>
      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
        <Select
          value={month}
          onValueChange={nextMonth => onChange(`${year}-${nextMonth}`)}
        >
          <SelectTrigger
            aria-label={`${label}: mês`}
            className="h-11 w-full rounded-none border-olive/35 bg-transparent capitalize"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {monthNames.map((name, index) => (
              <SelectItem
                key={name}
                value={String(index + 1).padStart(2, "0")}
                className="capitalize"
              >
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={year}
          onValueChange={nextYear => onChange(`${nextYear}-${month}`)}
        >
          <SelectTrigger
            aria-label={`${label}: ano`}
            className="h-11 w-full rounded-none border-olive/35 bg-transparent tabular-nums"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {yearOptions.map(option => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  );
}
