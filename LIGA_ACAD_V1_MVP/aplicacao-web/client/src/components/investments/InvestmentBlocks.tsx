import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="max-w-3xl">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-olive">
          {eyebrow}
        </p>
        <h2
          id={id}
          className="mt-2 font-display text-3xl font-bold text-graphite"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-graphite/60">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  tone = "default",
  featured = false,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  tone?: "default" | "positive" | "negative";
  featured?: boolean;
}) {
  const toneClass = featured
    ? "text-sand"
    : tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-[#765f45]"
        : "text-graphite";
  return (
    <div
      className={`min-w-0 p-5 ${featured ? "bg-field text-sand" : "bg-card"}`}
    >
      <p
        className={`font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${featured ? "text-sage" : "text-olive"}`}
      >
        {label}
      </p>
      <p
        className={`mt-3 break-words font-display text-2xl font-bold sm:text-3xl ${toneClass}`}
      >
        {value}
      </p>
      {detail ? (
        <p
          className={`mt-2 text-xs leading-5 ${featured ? "text-sand/70" : "text-graphite/55"}`}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "info" | "warning";
  children: ReactNode;
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <p
      className={`flex items-start gap-2 border-l-2 px-3 py-2 text-xs leading-5 ${tone === "warning" ? "border-warning bg-warning/10 text-graphite" : "border-olive/50 bg-accent/50 text-graphite/75"}`}
    >
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "warning" ? "text-warning" : "text-olive"}`}
      />
      <span>{children}</span>
    </p>
  );
}
