import { Button } from "@/components/ui/button";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";

export function LoadingState({ title = "A preparar informações" }: { title?: string }) {
  return (
    <div className="grid min-h-72 place-items-center border border-olive/30 bg-card p-8 text-center">
      <div>
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" />
        <p className="mt-4 text-sm font-bold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">Isso deve levar apenas alguns instantes.</p>
      </div>
    </div>
  );
}

export function QueryErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-72 place-items-center border border-olive/30 bg-card p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid h-12 w-12 place-items-center border border-destructive/25 bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-5 font-display text-lg font-extrabold text-foreground">Não foi possível carregar estes dados</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Verifique a sua ligação e tente novamente. Nenhum dado registado foi alterado.</p>
        <Button onClick={onRetry} variant="outline" className="mt-6 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    </div>
  );
}
