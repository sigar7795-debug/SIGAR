import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accent: "cyan" | "orange" | "lime";
};

const accents = {
  cyan: "text-info",
  orange: "text-warning",
  lime: "text-positive",
};

export function MetricCard({ label, value, description, icon: Icon, accent }: MetricCardProps) {
  return (
    <article className="group border border-olive/30 bg-card p-5 transition-colors duration-200 hover:border-field/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-olive">{label}</p>
          <p className="mt-4 font-display text-3xl font-bold text-graphite tabular-nums sm:text-4xl">{value}</p>
          <p className="mt-2 text-xs leading-5 text-graphite/55">{description}</p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-olive/30 bg-accent">
          <Icon className={`h-5 w-5 ${accents[accent]}`} />
        </div>
      </div>
    </article>
  );
}
