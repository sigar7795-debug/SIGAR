import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ReactNode } from "react";
import { SectionHeading } from "./InvestmentBlocks";

function FormulaList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5 text-sm leading-6 text-graphite/75">
      {items.map((item, index) => (
        <li key={index} className="border-l-2 border-olive/30 pl-3">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-none bg-accent px-1.5 py-0.5 font-mono text-[12px] text-graphite">
      {children}
    </code>
  );
}

export function FormulasSection() {
  return (
    <section className="space-y-4" aria-labelledby="formulas-titulo">
      <SectionHeading
        id="formulas-titulo"
        eyebrow="RNF06 · Transparência"
        title="Como calculamos"
        description="Fórmulas, premissas e arredondamentos usados nas simulações e na comparação. Detalhes em docs/investimentos-rf26-rf31.md."
      />
      <Accordion type="multiple" className="border-y border-olive/30">
        <AccordionItem value="retorno" className="border-olive/25">
          <AccordionTrigger className="font-display text-lg font-bold text-graphite">
            Retorno estimado de uma alternativa
          </AccordionTrigger>
          <AccordionContent>
            <FormulaList
              items={[
                <>
                  Taxa mensal equivalente: <Formula>i = r</Formula> quando
                  informada ao mês, ou <Formula>i = (1 + r)^(1/12) − 1</Formula>{" "}
                  quando informada ao ano.
                </>,
                <>
                  Taxa de administração ao mês:{" "}
                  <Formula>f = 1 − (1 − a)^(1/12)</Formula>, para que 12
                  cobranças consumam exatamente a taxa anual{" "}
                  <Formula>a</Formula>.
                </>,
                <>
                  A cada mês: <Formula>rendimento = saldo × i</Formula>,{" "}
                  <Formula>taxa = (saldo + rendimento) × f</Formula> e{" "}
                  <Formula>saldo = saldo + rendimento − taxa + aporte</Formula>.
                  O aporte entra no fim do mês.
                </>,
                <>
                  <Formula>
                    Saldo bruto = valor aplicado + rendimento bruto − taxas de
                    administração
                  </Formula>
                  .
                </>,
                <>
                  <Formula>
                    IR = alíquota × (saldo bruto − valor aplicado)
                  </Formula>
                  , somente quando há ganho.
                </>,
                <>
                  <Formula>Valor líquido = saldo bruto − IR</Formula> e{" "}
                  <Formula>
                    retorno líquido = valor líquido − valor aplicado − custos
                    fixos
                  </Formula>
                  . Rentabilidade = retorno líquido ÷ valor aplicado.
                </>,
              ]}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="comparacao" className="border-olive/25">
          <AccordionTrigger className="font-display text-lg font-bold text-graphite">
            Comparação no mesmo período (RN07)
          </AccordionTrigger>
          <AccordionContent>
            <FormulaList
              items={[
                "O período é formado por meses inteiros: do dia 1 do mês inicial ao último dia do mês final.",
                <>
                  Atividade rural: lucro líquido dos lançamentos do período pela
                  data de competência, como no painel (
                  <Formula>
                    receitas − custos − despesas administrativas − impostos −
                    deduções
                  </Formula>
                  ).{" "}
                  <Formula>
                    Rentabilidade rural = lucro líquido ÷ capital empregado
                  </Formula>
                  .
                </>,
                "Alternativas: o capital empregado é aplicado de uma vez no início do período e mantido pelo mesmo número de meses, com a taxa, os custos e o IR cadastrados. Prazo e aportes próprios da alternativa valem só para a simulação individual.",
                "O gráfico mensal acumula o lucro rural mês a mês e o retorno líquido que cada alternativa teria se fosse resgatada naquele mês.",
              ]}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="oportunidade" className="border-olive/25">
          <AccordionTrigger className="font-display text-lg font-bold text-graphite">
            Custo de oportunidade e resultado econômico
          </AccordionTrigger>
          <AccordionContent>
            <FormulaList
              items={[
                <>
                  <Formula>
                    Custo de oportunidade = maior retorno líquido entre as
                    alternativas
                  </Formula>
                  , para o mesmo capital e período. Nunca é negativo: manter o
                  capital parado rende R$ 0,00.
                </>,
                <>
                  <Formula>
                    Resultado econômico = lucro líquido rural − custo de
                    oportunidade
                  </Formula>
                  . Positivo: a atividade remunerou o capital acima da melhor
                  alternativa; negativo: a alternativa teria rendido mais.
                </>,
              ]}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="arredondamento" className="border-olive/25">
          <AccordionTrigger className="font-display text-lg font-bold text-graphite">
            Arredondamentos
          </AccordionTrigger>
          <AccordionContent>
            <FormulaList
              items={[
                "Os cálculos usam precisão completa; só os resultados apresentados são arredondados.",
                "Valores em reais têm 2 casas decimais, com o meio centavo afastando-se do zero (R$ 0,125 → R$ 0,13; −R$ 0,125 → −R$ 0,13).",
                "Rendimento, taxas de administração e IR são arredondados um a um; saldos e totais somam esses valores já arredondados, para que os quadros fechem ao centavo.",
                "Percentuais têm 2 casas decimais; taxas equivalentes, 4 casas.",
              ]}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="premissas" className="border-olive/25">
          <AccordionTrigger className="font-display text-lg font-bold text-graphite">
            Premissas e limites
          </AccordionTrigger>
          <AccordionContent>
            <FormulaList
              items={[
                "As taxas ficam constantes durante todo o prazo. Não são considerados inflação, IOF, marcação a mercado nem risco de crédito.",
                "O IR usa a alíquota informada sobre todo o rendimento, no resgate. Na tabela regressiva real, cada aporte tem o seu próprio prazo.",
                "Custos fixos (corretagem, taxas de abertura) são pagos uma única vez, à parte do valor aplicado.",
                "O capital empregado é informado por você; os resultados apoiam a decisão, mas não substituem a avaliação de um contador, economista ou consultor rural.",
              ]}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
