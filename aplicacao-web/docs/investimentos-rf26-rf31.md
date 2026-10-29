# Investimentos e custo de oportunidade (RF26–RF31, RN07)

## Objetivo

Permite ao produtor responder a uma pergunta direta: **o capital empregado na
propriedade rende mais na atividade rural ou em uma aplicação financeira?**
A página **Investimentos** (`/investimentos`) reúne o cadastro de alternativas,
a simulação de cada uma e a comparação com o lucro da propriedade no mesmo
período.

| Requisito | Como é atendido |
|---|---|
| RF26 | Cadastro, edição e exclusão de alternativas de investimento por propriedade. |
| RF27 | Cada alternativa tem valor inicial, aporte mensal, prazo em meses, taxa de retorno (ao mês ou ao ano), taxa de administração, custos fixos e imposto sobre o rendimento. |
| RF28 | O retorno estimado é calculado mês a mês e aparece na tabela de alternativas, na simulação detalhada e na prévia do formulário, antes de salvar. |
| RF29 | O custo de oportunidade é o maior retorno líquido que o capital empregado obteria nas alternativas, no período analisado. |
| RF30 | A rentabilidade rural (lucro líquido ÷ capital) é comparada com a rentabilidade de cada alternativa sobre o mesmo capital. |
| RF31 | Tabelas (alternativas, evolução, comparação) e gráficos (evolução da simulação, rentabilidade no período e resultado acumulado). Todo gráfico tem uma visão em tabela. |
| RN07 | Atividade e alternativas usam exatamente o mesmo período, formado por meses inteiros. |
| RNF06 | A seção **Como calculamos** da página mostra fórmulas, premissas e arredondamentos; cada indicador traz a sua fórmula resumida. |

## Entidade `investmentAlternatives`

Guarda apenas os parâmetros. Retornos e comparações não são gravados: são
recalculados a cada consulta por `shared/investments.ts`, para que qualquer
alteração de dados atualize indicadores e gráficos (RN11).

| Coluna | Tipo | Regra |
|---|---|---|
| `propertyId` | inteiro | Propriedade dona da alternativa (exclusão em cascata). |
| `createdById` | inteiro | Conta que cadastrou. |
| `name` | texto (2–120) | Ex.: "CDB 100% do CDI". |
| `description` | texto (até 600) | Opcional: instituição, liquidez, vencimento. |
| `initialAmount` | R$, 2 casas | ≥ 0. |
| `monthlyContribution` | R$, 2 casas | ≥ 0; valor inicial ou aporte precisa ser maior que zero. |
| `termMonths` | inteiro | De 1 a 360 meses. |
| `returnRate` | %, 4 casas | De 0 a 100, ao período indicado em `ratePeriod`. |
| `ratePeriod` | `mensal` ou `anual` | Periodicidade da taxa de retorno. |
| `adminFeeRate` | % ao ano, 4 casas | De 0 a 100; taxa de administração ou custódia sobre o saldo. |
| `fixedCosts` | R$, 2 casas | ≥ 0; corretagem, taxa de abertura etc. |
| `incomeTaxRate` | %, 2 casas | De 0 a 100; imposto sobre o rendimento no resgate. |

As mesmas regras valem no formulário, no servidor (zod) e no banco
(restrições `CHECK`), o que impede valores negativos em campos incompatíveis
(RN10). A tabela tem RLS ativo e nenhum acesso para `anon` e `authenticated`,
como as demais.

## Fórmulas

Notação: `P` valor inicial, `A` aporte mensal, `n` prazo em meses, `r` taxa de
retorno, `a` taxa de administração anual, `t` alíquota de IR, `F` custos
fixos, todos os percentuais em fração (12% = 0,12).

### Taxas equivalentes

| Taxa | Fórmula |
|---|---|
| Retorno mensal, quando informada ao mês | `i = r` |
| Retorno mensal, quando informada ao ano | `i = (1 + r)^(1/12) − 1` |
| Retorno anual equivalente (exibido) | `(1 + i)^12 − 1` |
| Taxa de administração mensal | `f = 1 − (1 − a)^(1/12)` |

A taxa de administração mensal é escolhida para que 12 cobranças consumam
exatamente a taxa anual de um saldo sem rendimento: com `a = 1%`, R$ 10.000,00
viram R$ 9.900,00 em 12 meses.

### Simulação mês a mês (RF28)

O saldo começa em `P`. Em cada mês `m = 1 … n`:

```
rendimento(m) = saldo(m−1) × i
taxa(m)       = (saldo(m−1) + rendimento(m)) × f
saldo(m)      = saldo(m−1) + rendimento(m) − taxa(m) + A
```

O aporte entra no fim de cada mês (série postecipada), por isso o último
aporte não rende. Sem custos, o resultado coincide com a fórmula fechada
`P(1 + i)^n + A[(1 + i)^n − 1] / i`.

| Resultado | Fórmula |
|---|---|
| Valor aplicado | `P + n × A` |
| Rendimento bruto | `Σ rendimento(m)` |
| Taxas de administração | `Σ taxa(m)` |
| Saldo bruto | `valor aplicado + rendimento bruto − taxas de administração` |
| IR no resgate | `t × (saldo bruto − valor aplicado)`, somente quando a diferença é positiva |
| Valor líquido de resgate | `saldo bruto − IR` |
| Custos e imposto | `taxas de administração + F + IR` |
| Retorno líquido estimado | `valor líquido − valor aplicado − F` = `rendimento bruto − custos e imposto` |
| Rentabilidade líquida | `retorno líquido ÷ valor aplicado` |

Os custos fixos `F` são pagos uma única vez na aplicação, à parte do valor
aplicado: não rendem nem entram na base do IR.

**Exemplo** (coberto em teste): R$ 10.000,00 iniciais + R$ 500,00/mês, 1% a.m.,
12 meses, IR de 15%.

| Item | Valor |
|---|---|
| Valor aplicado | R$ 16.000,00 |
| Rendimento bruto | R$ 1.609,50 |
| Saldo bruto | R$ 17.609,50 |
| IR (15% × R$ 1.609,50 = R$ 241,425) | R$ 241,43 |
| Valor líquido | R$ 17.368,07 |
| Retorno líquido | R$ 1.368,07 (8,55%) |

### Comparação no mesmo período (RF30, RN07)

1. O período é formado por meses inteiros: do dia 1 do mês inicial ao último
   dia do mês final (até 120 meses). Atalhos: últimos 12 meses fechados, ano
   anterior, ano atual ou personalizado (ex.: uma safra de julho a junho).
2. **Atividade rural:** lucro líquido dos lançamentos do período pela data de
   competência, com a mesma regra do painel (RF21):
   `receitas − custos fixos − custos variáveis − despesas administrativas − impostos − deduções`.
   Pode ser restrito a uma atividade produtiva.
   `Rentabilidade rural = lucro líquido ÷ capital empregado`.
3. **Alternativas:** o capital empregado `C` é aplicado de uma vez no início do
   período e mantido pelo mesmo número de meses, com a taxa, a taxa de
   administração, os custos fixos e o IR cadastrados
   (`P = C`, `A = 0`, `n = meses do período`). O prazo e os aportes próprios da
   alternativa valem só para a simulação individual.
   `Rentabilidade da alternativa = retorno líquido ÷ C`.
4. `Vantagem da atividade = lucro líquido rural − retorno líquido da alternativa`.
   Positiva: a atividade rendeu mais; negativa: a alternativa rendeu mais.
5. O gráfico mensal acumula o lucro rural até cada mês e o retorno líquido que
   cada alternativa teria se fosse resgatada naquele mês.

### Custo de oportunidade e resultado econômico (RF29)

| Indicador | Fórmula |
|---|---|
| Custo de oportunidade | maior retorno líquido entre as alternativas para o capital `C` no período; nunca negativo |
| Resultado econômico | `lucro líquido rural − custo de oportunidade` |

Manter o capital parado (0%) é sempre possível, por isso, se nenhuma
alternativa tiver retorno positivo, o custo de oportunidade é R$ 0,00. Sem
alternativas cadastradas, custo de oportunidade e resultado econômico não são
calculados.

**Exemplo** (coberto em teste): capital de R$ 100.000,00, outubro de 2025 a
setembro de 2026, lucro líquido rural de R$ 20.000,00 (20%). Um CDB a 1% a.m.
renderia R$ 12.682,50 (12,68%), que é o custo de oportunidade. Resultado
econômico: R$ 7.317,50 a favor da atividade rural.

## Arredondamentos

- Os cálculos internos usam precisão completa (ponto flutuante de 64 bits);
  só os resultados apresentados são arredondados.
- Valores em reais têm 2 casas decimais (RNF15) com arredondamento comercial:
  o meio centavo afasta-se do zero (R$ 0,125 → R$ 0,13; −R$ 0,125 → −R$ 0,13).
  A função `roundHalfAwayFromZero` desloca a vírgula pela representação
  decimal do número, evitando o erro binário de `1,005 × 100 = 100,4999…`.
- O IR é calculado em aritmética inteira (centavos × centésimos de ponto
  percentual), para que 15% de R$ 1.609,50 dê exatamente R$ 241,425 e
  arredonde para R$ 241,43.
- Rendimento, taxas de administração e IR são arredondados um a um; saldos e
  totais são somas desses valores já arredondados, para que os quadros fechem
  ao centavo (`saldo bruto = aplicado + rendimento − taxas`).
- Percentuais têm 2 casas decimais; taxas equivalentes, 4 casas.
- Ao gravar, valores em reais e alíquotas de IR ficam com 2 casas e taxas de
  retorno e de administração com 4 casas, pelo mesmo arredondamento.

## Premissas e limitações

- As taxas são constantes durante todo o prazo. Não há inflação, IOF,
  marcação a mercado, risco de crédito nem limite de garantia do FGC.
- Produtos atrelados ao CDI ou à Selic devem ser informados pela taxa anual
  esperada (ex.: 110% de um CDI de 10% a.a. = 11% a.a.).
- O IR usa a alíquota informada sobre todo o rendimento, no resgate. Na tabela
  regressiva real (22,5% até 180 dias, 20% até 360, 17,5% até 720 e 15% acima),
  cada aporte tem o seu próprio prazo. O botão **Usar tabela regressiva**
  sugere a alíquota pelo prazo total, contado em meses de 30 dias.
- Na comparação, a alíquota de IR cadastrada é mantida mesmo que o período
  analisado caia em outra faixa da tabela regressiva.
- A atividade rural é sazonal: em períodos curtos, vendas ou colheitas fora da
  janela distorcem a comparação. A página avisa quando o período tem menos de
  12 meses ou inclui meses que ainda não terminaram.
- O capital empregado (terra, benfeitorias, máquinas, animais e capital de
  giro) é informado pelo usuário e fica lembrado no navegador, por
  propriedade. Quando o balanço patrimonial (RF32–RF39) existir, poderá vir do
  total de ativos.
- Os resultados apoiam a decisão, mas não substituem a avaliação de um
  contador, economista ou consultor rural (RN13).

## Permissões

Seguem os papéis de [membros da propriedade](membros-propriedade.md):

| Operação | Papel mínimo |
|---|---|
| Listar alternativas e simulações, comparar com a atividade rural | `visualizador` |
| Cadastrar, editar ou excluir alternativas | `editor` |

Edição e exclusão só alcançam alternativas da propriedade informada; outra
alternativa responde `NOT_FOUND`. A verificação de papel (`assertPropertyAccess`)
passou para `server/routers/propertyAccess.ts` e é partilhada com o
`financeRouter`. No modo de demonstração, as alternativas ficam em memória
(`server/demo.ts`), com taxas ilustrativas.

## API (tRPC)

| Procedimento | Entrada | Saída |
|---|---|---|
| `finance.investments.list` | `propertyId` | Alternativas com `simulation` (resumo de RF28). |
| `finance.investments.create` | `propertyId` + parâmetros | Alternativa criada com `simulation`. |
| `finance.investments.update` | `propertyId`, `alternativeId` + parâmetros | Alternativa atualizada com `simulation`. |
| `finance.investments.delete` | `propertyId`, `alternativeId` | `{ id, deleted: true }`. |
| `finance.investments.compare` | `propertyId`, `startMonth`, `endMonth` (AAAA-MM), `capital`, `activity?` | Período, resultado rural, alternativas comparadas, custo de oportunidade, resultado econômico, veredito e série mensal. |

## Testes

- `shared/investments.test.ts`: arredondamento, conversão de taxas, tabela
  regressiva, aplicação única e com aportes, apenas aportes, taxa anual com
  prazos de 1, 6, 12 e 24 meses, taxa de administração, IR (inclusive o meio
  centavo), custos fixos, a combinação de tudo fechando ao centavo, entradas
  inválidas (RN10), janelas mensais e a comparação (atividade melhor,
  alternativa melhor, mesmo período e capital, série mensal, nenhuma
  alternativa rendendo e nenhuma alternativa cadastrada).
- `server/investments.test.ts`: sessão obrigatória, bloqueio de não membros,
  visualizador só consulta, conversão para decimal ao gravar, rejeição de
  valores fora dos limites, edição e exclusão restritas à propriedade, janela
  de datas usada na consulta dos lançamentos, filtro por atividade, validação
  do período e do capital, e o modo de demonstração sem acesso ao banco.

## Validação visual

Verificada com a conta de demonstração em computador (1440 × 900) e celular
(390 × 844): cadastro com prévia do retorno e validação por campo, simulação
detalhada com gráfico e tabela, comparação nos dois cenários (atividade e
alternativa rendendo mais) e a seção de fórmulas. No celular os controles e
indicadores empilham-se sem rolagem horizontal da página; as tabelas rolam na
horizontal, como no fluxo de caixa.

## Configuração necessária

Aplicar no Supabase a migração
`supabase/migrations/20261016120000_investment_alternatives.sql` (espelhada em
`drizzle/0007_investment_alternatives.sql`). Sem ela, a página mostra erro ao
carregar as alternativas e a comparação; o modo de demonstração não depende
dela.
