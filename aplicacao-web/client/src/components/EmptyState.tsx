import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-olive/40 bg-card px-6 py-12 text-center">
      <div className="mx-auto grid max-w-md justify-items-center">
        <div className="grid h-12 w-12 place-items-center border border-olive/30 bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
