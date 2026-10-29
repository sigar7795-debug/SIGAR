import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { EmptyState } from "@/components/EmptyState";
import {
  AlternativeDialog,
  type AlternativeForm,
  formToPayload,
} from "@/components/investments/AlternativeDialog";
import { AlternativesSection } from "@/components/investments/AlternativesSection";
import { ComparisonSection } from "@/components/investments/ComparisonSection";
import { FormulasSection } from "@/components/investments/FormulasSection";
import { SimulationDetails } from "@/components/investments/SimulationDetails";
import type { Alternative } from "@/components/investments/types";
import { PageHeader } from "@/components/PageHeader";
import { PropertySelector } from "@/components/PropertySelector";
import { Button } from "@/components/ui/button";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Info, Landmark, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function mutationErrorMessage(message: string) {
  // Erros de validação do servidor chegam como JSON; o formulário já valida antes.
  return message.trim().startsWith("[")
    ? "Não foi possível guardar: revise os valores informados."
    : message;
}

export default function InvestmentsPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { propertyId, setPropertyId } = useSelectedProperty();
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const alternativesQuery = trpc.finance.investments.list.useQuery(
    { propertyId: propertyId ?? 0 },
    { enabled: Boolean(propertyId) }
  );
  const [dialog, setDialog] = useState<{
    open: boolean;
    editing: Alternative | null;
  }>({ open: false, editing: null });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const property = propertiesQuery.data?.find(item => item.id === propertyId);
  const canEdit =
    property?.effectiveRole === "proprietario" ||
    property?.effectiveRole === "editor";
  const alternatives = alternativesQuery.data ?? [];
  const selected =
    alternatives.find(item => item.id === selectedId) ??
    alternatives[0] ??
    null;

  const refresh = () => {
    void utils.finance.investments.list.invalidate();
    void utils.finance.investments.compare.invalidate();
  };
  const closeDialog = () => setDialog({ open: false, editing: null });
  const createAlternative = trpc.finance.investments.create.useMutation({
    onSuccess: created => {
      refresh();
      setSelectedId(created.id);
      closeDialog();
      toast.success(
        "Alternativa cadastrada. O retorno estimado já foi calculado."
      );
    },
    onError: error => toast.error(mutationErrorMessage(error.message)),
  });
  const updateAlternative = trpc.finance.investments.update.useMutation({
    onSuccess: updated => {
      refresh();
      setSelectedId(updated.id);
      closeDialog();
      toast.success(
        "Alternativa atualizada. Simulação e comparação foram recalculadas."
      );
    },
    onError: error => toast.error(mutationErrorMessage(error.message)),
  });
  const deleteAlternative = trpc.finance.investments.delete.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Alternativa excluída.");
    },
    onError: error => toast.error(mutationErrorMessage(error.message)),
  });

  const submit = (form: AlternativeForm) => {
    if (!propertyId) return;
    const payload = { propertyId, ...formToPayload(form) };
    if (dialog.editing)
      updateAlternative.mutate({
        ...payload,
        alternativeId: dialog.editing.id,
      });
    else createAlternative.mutate(payload);
  };

  if (propertiesQuery.isLoading)
    return <LoadingState title="A carregar as propriedades" />;
  if (propertiesQuery.isError || alternativesQuery.isError) {
    return (
      <QueryErrorState
        onRetry={() => {
          void propertiesQuery.refetch();
          void alternativesQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Investimentos e custo de oportunidade"
        title="Investimentos"
        description="Simule aplicações financeiras e compare-as com a atividade rural no mesmo período."
        action={
          <Button
            type="button"
            onClick={() => setDialog({ open: true, editing: null })}
            disabled={!propertyId || !canEdit}
            title={
              !canEdit && property
                ? "O seu papel nesta propriedade permite apenas consultar."
                : undefined
            }
            className="h-11 rounded-none bg-field font-semibold text-sand hover:bg-field/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova alternativa
          </Button>
        }
      />

      {!propertiesQuery.data?.length ? (
        <EmptyState
          icon={Landmark}
          title="Cadastre uma propriedade para simular investimentos"
          description="As alternativas e a comparação usam o capital e os lançamentos de uma propriedade, por isso ela vem primeiro."
          action={
            <Button
              onClick={() => setLocation("/propriedades")}
              className="rounded-none bg-field font-semibold text-sand hover:bg-field/90"
            >
              Ir para propriedades <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          }
        />
      ) : (
        <>
          <section
            aria-label="Propriedade analisada"
            className="grid gap-4 border-b border-olive/30 pb-6 lg:grid-cols-[minmax(260px,420px)_1fr] lg:items-end"
          >
            <div>
              <label className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">
                Propriedade
              </label>
              <PropertySelector
                properties={propertiesQuery.data}
                value={propertyId}
                onChange={setPropertyId}
              />
            </div>
            {property && !canEdit ? (
              <p className="flex items-start gap-2 text-xs leading-5 text-graphite/60">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-olive" />
                Você tem acesso de visualização: pode consultar simulações e
                comparações, mas não cadastrar ou alterar alternativas.
              </p>
            ) : null}
          </section>

          <AlternativesSection
            alternatives={alternatives}
            loading={alternativesQuery.isPending}
            selectedId={selected?.id ?? null}
            canEdit={canEdit}
            deleting={deleteAlternative.isPending}
            onSelect={setSelectedId}
            onCreate={() => setDialog({ open: true, editing: null })}
            onEdit={alternative =>
              setDialog({ open: true, editing: alternative })
            }
            onDelete={alternative =>
              propertyId &&
              deleteAlternative.mutate({
                propertyId,
                alternativeId: alternative.id,
              })
            }
          />

          {selected ? <SimulationDetails alternative={selected} /> : null}

          {propertyId ? (
            <ComparisonSection
              propertyId={propertyId}
              hasAlternatives={alternatives.length > 0}
            />
          ) : null}

          <FormulasSection />
        </>
      )}

      <AlternativeDialog
        open={dialog.open}
        editing={dialog.editing}
        loading={createAlternative.isPending || updateAlternative.isPending}
        onOpenChange={open => {
          if (!open) closeDialog();
        }}
        onSubmit={submit}
      />
    </div>
  );
}
