import { EditorialNumber, TechnicalLabel } from "./TechnicalLabel";

const STEPS = [
  { number: "01", title: "Cadastre a propriedade.", description: "Adicione uma ou mais explorações vinculadas à sua conta." },
  { number: "02", title: "Registre as movimentações.", description: "Receitas, custos de produção, despesas e impostos, por categoria e data." },
  { number: "03", title: "Acompanhe os resultados.", description: "Saldo, lucro bruto e lucro líquido recalculados para o período escolhido." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" data-nav-theme="dark" className="bg-graphite py-24 text-paper sm:py-32">
      <div className="container px-6 sm:px-10 lg:px-16">
        <TechnicalLabel className="text-sage">Como funciona</TechnicalLabel>
        <h2 className="mt-4 max-w-lg font-display text-4xl font-semibold tracking-[-0.01em] sm:text-5xl">
          Três passos, do cadastro ao resultado.
        </h2>

        <div className="mt-16 grid gap-10 border-t border-sage/15 pt-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map(step => (
            <div key={step.number} className="border-l border-sage/20 pl-5">
              <EditorialNumber value={step.number} />
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.005em]">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-paper/65">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
