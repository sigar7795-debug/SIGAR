import { BackgroundVideo } from "./BackgroundVideo";
import { FieldScene } from "./FieldScene";
import { TechnicalLabel } from "./TechnicalLabel";

export function VideoBreakSection() {
  return (
    <section data-nav-theme="dark" className="bg-graphite py-24 text-paper sm:py-32">
      <div className="container grid items-center gap-10 px-6 sm:px-10 lg:grid-cols-2 lg:gap-6 lg:px-16">
        <div className="relative lg:pr-10">
          <TechnicalLabel>Operação em campo</TechnicalLabel>
          <h2 className="mt-4 max-w-md font-display text-4xl font-semibold tracking-[-0.01em] sm:text-5xl">
            Cada lançamento parte do que acontece na propriedade.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/65">
            Colheita, insumos, mão de obra — cada movimentação registrada no SIGAR tem origem na operação real da propriedade.
          </p>
          <div className="mt-8 inline-flex items-baseline gap-2 border-t border-sage/20 pt-4">
            <span className="font-financial text-2xl font-semibold tabular-nums">R$ —</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-sage/70">Custo de produção · ilustrativo</span>
          </div>
          <span className="absolute right-0 top-1/2 hidden h-px w-10 -translate-y-1/2 bg-sage/30 lg:block" />
        </div>

        <BackgroundVideo poster={<FieldScene variant="contour" />} className="relative aspect-[4/3] w-full rounded-lg lg:aspect-[5/4]">
          <div className="absolute inset-0 bg-gradient-to-t from-graphite/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4">
            <TechnicalLabel>Colheita · irrigação</TechnicalLabel>
          </div>
        </BackgroundVideo>
      </div>
    </section>
  );
}
