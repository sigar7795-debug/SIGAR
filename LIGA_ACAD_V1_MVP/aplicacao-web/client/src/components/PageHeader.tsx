import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-6 border-b border-olive/35 pb-7 lg:flex-row lg:items-end">
      <div className="max-w-3xl">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-olive">{eyebrow}</p>
        <h1 className="font-display text-4xl font-bold leading-none text-graphite sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-graphite/60 sm:text-base">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
