import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useModules } from "@/hooks/useModules";
import { type ModuleId, MODULES } from "@shared/modules";
import { ArrowRight, ToggleLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

/** Só renderiza a página se o módulo estiver ligado para a conta. */
export function ModuleGate({ module, children }: { module: ModuleId; children: ReactNode }) {
  const { hasModule, isLoading, isError, refetch } = useModules();
  const [, setLocation] = useLocation();

  if (isLoading) return <LoadingState />;
  if (isError) return <QueryErrorState onRetry={() => { void refetch(); }} />;
  if (hasModule(module)) return <>{children}</>;

  return (
    <EmptyState
      icon={ToggleLeft}
      title={`${MODULES[module].label} está desativado`}
      description="Este módulo não faz parte do seu menu no momento. Você pode ativá-lo quando quiser em Meu perfil."
      action={
        <Button onClick={() => setLocation("/perfil")} className="rounded-none bg-field font-semibold text-sand hover:bg-field/90">
          Ativar em Meu perfil <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      }
    />
  );
}
