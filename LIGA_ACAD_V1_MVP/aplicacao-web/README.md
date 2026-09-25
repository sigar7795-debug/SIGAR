# Liga Rural — M.V.P.

O **Liga Rural** é uma aplicação web de gestão financeira para propriedades rurais. Este M.V.P. centraliza propriedades, lançamentos de receitas e saídas, cálculo de fluxo de caixa, lucro bruto e lucro líquido, com uma interface escura e cinematográfica orientada à leitura objetiva dos resultados.

## Escopo implementado

| Área | Entrega disponível |
|---|---|
| Identidade de uso | Perfil de utilizador entre produtor, gestor, estudante, consultor e administrador. |
| Acesso e senha | Login por e-mail e senha, redefinição por link enviado ao e-mail e troca de senha em **Meu perfil** (ver [docs/redefinicao-senha-rf03.md](docs/redefinicao-senha-rf03.md)). |
| Propriedades | Cadastro de uma ou mais propriedades vinculadas ao utilizador autenticado. |
| Lançamentos | Registro de receitas, custos de produção, despesas administrativas, impostos e deduções. |
| Fluxo de caixa | Filtros por dia, mês, trimestre e ano, com saldo calculado automaticamente. |
| Resultado econômico | Cálculo de lucro bruto e líquido conforme os lançamentos do período. |
| Painel | Indicadores de saldo, lucro bruto e lucro líquido para a propriedade selecionada. |

> O M.V.P. calcula o saldo do fluxo de caixa e o lucro líquido pela mesma base: receitas menos custos de produção, despesas administrativas, impostos e deduções. O lucro bruto considera apenas receitas menos custos diretamente ligados à produção.

## Como utilizar

Depois de entrar na plataforma, defina o perfil em **Meu perfil**. Em seguida, crie uma ou mais explorações em **Propriedades**. A propriedade escolhida passa a ser usada no painel e no fluxo de caixa.

Na área **Fluxo de caixa**, crie lançamentos indicando tipo, categoria, descrição, data e valor. A tela permite selecionar o intervalo de análise e a data de referência. Os indicadores são recalculados automaticamente para a propriedade e janela de tempo selecionadas.

## Desenvolvimento e validação

| Comando | Finalidade |
|---|---|
| `pnpm dev` | Inicia o ambiente local de desenvolvimento. |
| `pnpm test` | Executa os testes de sessão, autorização e regras financeiras. |
| `pnpm check` | Executa a verificação estática de TypeScript. |
| `pnpm build` | Gera a versão de produção. |

A suíte cobre as fórmulas de resultado, os intervalos temporais, a sessão, a proteção contra acessos não autenticados às rotas financeiras e os fluxos de redefinição e troca de senha.

Para a redefinição de senha funcionar em produção, libere `https://<domínio>/redefinir-senha` nas Redirect URLs do Supabase, configure um SMTP próprio e aplique a migração `supabase/migrations/20260925120000_security_events.sql`. A variável opcional `APP_URL` fixa o domínio usado nos links enviados por e-mail.

## Limites do primeiro incremento

Funcionalidades previstas no documento original, como balanço patrimonial, indicadores produtivos, relatórios, exportações, importação de planilhas, permissões de colaboração por propriedade e simulações de investimento, não integram este recorte inicial. A autenticação por e-mail e senha usa o Supabase Auth; a sessão do SIGAR é um cookie HTTP-only próprio.
