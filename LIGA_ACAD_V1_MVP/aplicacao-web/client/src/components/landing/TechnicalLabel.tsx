import type { ReactNode } from "react";

/** Small monospace caption used for technical/editorial overlays (e.g. "PROPRIEDADE ATIVA"). */
export function TechnicalLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-sage ${className}`}
    >
      {children}
    </span>
  );
}

/** Large editorial numeral used for "01 / 02 / 03" style sequences. */
export function EditorialNumber({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={`font-display text-5xl font-semibold tabular-nums text-sage/60 sm:text-6xl ${className}`}>
      {value}
    </span>
  );
}
