import { EmptyState } from "@/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { Eye, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { describeCosts, describeParameters, ratePeriodLabels } from "./display";
import { SectionHeading } from "./InvestmentBlocks";
import type { Alternative } from "./types";

export function AlternativesSection({
  alternatives,
  loading,
  selectedId,
  canEdit,
  deleting,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: {
  alternatives: Alternative[];
  loading: boolean;
  selectedId: number | null;
  canEdit: boolean;
  deleting: boolean;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onEdit: (alternative: Alternative) => void;
  onDelete: (alternative: Alternative) => void;
}) {
  return (
    <section className="space-y-5" aria-labelledby="alternativas-titulo">
      <SectionHeading
        id="alternativas-titulo"
        eyebrow="RF26 a RF28 · Alternativas cadastradas"
        title="Simulações de investimento"
        description="Cada alternativa guarda valor inicial, aportes, prazo, taxa e custos. O retorno estimado é recalculado sempre que um dado muda."
      />
      {loading ? (
        <Skeleton className="h-48 w-full rounded-none" />
      ) : !alternatives.length ? (
        <EmptyState
          icon={PiggyBank}
          title="Nenhuma alternativa cadastrada"
          description={
            canEdit
              ? "Cadastre aplicações como Tesouro Selic, CDB ou poupança para estimar o retorno e compará-las com a atividade rural."
              : "Ainda não há alternativas nesta propriedade. Um proprietário ou editor pode cadastrá-las."
          }
          action={
            canEdit ? (
              <Button
                onClick={onCreate}
                className="rounded-none bg-field font-semibold text-sand hover:bg-field/90"
              >
                <Plus className="mr-2 h-4 w-4" /> Cadastrar alternativa
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto border border-olive/30 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Alternativa
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Taxa e custos
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Valor aplicado
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Valor líquido
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Retorno líquido
                </TableHead>
                <TableHead className="px-5 text-right text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alternatives.map(alternative => {
                const isSelected = alternative.id === selectedId;
                const simulation = alternative.simulation;
                return (
                  <TableRow
                    key={alternative.id}
                    data-state={isSelected ? "selected" : undefined}
                    className={
                      isSelected
                        ? "bg-accent/60 hover:bg-accent/60"
                        : "hover:bg-muted/50"
                    }
                  >
                    <TableCell className="px-5 py-4 align-top">
                      <p className="font-semibold text-graphite">
                        {alternative.name}
                      </p>
                      <p className="mt-0.5 text-xs text-graphite/55">
                        {describeParameters(alternative)}
                      </p>
                      {alternative.description ? (
                        <p className="mt-1 max-w-xs whitespace-normal text-xs text-graphite/45">
                          {alternative.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-graphite">
                        {formatPercent(Number(alternative.returnRate), 4)}{" "}
                        {ratePeriodLabels[alternative.ratePeriod]}
                      </p>
                      <p className="mt-0.5 whitespace-nowrap text-xs text-graphite/55">
                        {describeCosts(alternative)}
                      </p>
                    </TableCell>
                    <TableCell className="py-4 text-right align-top tabular-nums">
                      {formatCurrency(simulation.totalContributed)}
                    </TableCell>
                    <TableCell className="py-4 text-right align-top tabular-nums">
                      {formatCurrency(simulation.netBalance)}
                    </TableCell>
                    <TableCell className="py-4 text-right align-top">
                      <p
                        className={`font-bold tabular-nums ${simulation.netReturn >= 0 ? "text-positive" : "text-[#765f45]"}`}
                      >
                        {formatCurrency(simulation.netReturn)}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-graphite/55">
                        {formatPercent(simulation.netReturnRate)} no prazo
                      </p>
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          aria-pressed={isSelected}
                          onClick={() => onSelect(alternative.id)}
                          className="h-8 w-8 rounded-none hover:bg-accent hover:text-accent-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="sr-only">
                            Ver simulação de {alternative.name}
                          </span>
                        </Button>
                        {canEdit ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => onEdit(alternative)}
                              className="h-8 w-8 rounded-none hover:bg-accent hover:text-accent-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">
                                Editar {alternative.name}
                              </span>
                            </Button>
                            <DeleteAlternativeDialog
                              name={alternative.name}
                              loading={deleting}
                              onConfirm={() => onDelete(alternative)}
                            />
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function DeleteAlternativeDialog({
  name,
  loading,
  onConfirm,
}: {
  name: string;
  loading: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-none text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Excluir {name}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-extrabold text-foreground">
            Excluir alternativa?
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            "{name}" deixará de aparecer nas simulações e a comparação com a
            atividade rural será recalculada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive font-bold text-white hover:bg-destructive/90"
          >
            {loading ? "A excluir..." : "Excluir alternativa"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
