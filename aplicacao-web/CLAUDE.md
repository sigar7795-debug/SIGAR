# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

SIGAR (nome antigo no código: "Liga Rural") é um app de gestão financeira para propriedades rurais. Todo o app vive em `aplicacao-web/` (a raiz do repositório git é a pasta acima). UI, mensagens de erro, docs e commits são em português.

## Comandos

Rodar a partir de `aplicacao-web/`, com pnpm.

| Comando | Uso |
|---|---|
| `pnpm dev` | Express + Vite em modo middleware (`server/_core/index.ts`), porta 3000 ou a próxima livre |
| `pnpm test` | Vitest (só `server/**` e `shared/**` — não há testes de client) |
| `pnpm exec vitest run shared/modules.test.ts` | Um arquivo de teste; `-t "<nome>"` filtra por caso |
| `pnpm check` | `tsc --noEmit` (exclui `*.test.ts`) |
| `pnpm format` | Prettier |
| `pnpm build` | Client (Vite → `dist/public`) + servidor bundlado com esbuild (`dist/index.js`) |

**O `.env` local aponta para o banco de PRODUÇÃO.** Para rodar contra homologação: `DOTENV_CONFIG_PATH=.env.homolog pnpm dev`.

## Arquitetura

Monólito TypeScript com três áreas que compartilham tipos:

- `client/src/` — React 19 + wouter (rotas em `App.tsx`) + tRPC React Query + shadcn/ui (`components/ui`) + Tailwind 4. Alias `@/` → `client/src`, `@shared/` → `shared`.
- `server/` — Express + tRPC v11 (superjson). `server/app.ts` (`createApp`) é usado tanto pelo `pnpm dev` quanto pela função serverless da Vercel (`api/index.ts`).
- `shared/` — regras de negócio puras e testadas, usadas pelos dois lados: `financial.ts` (fórmulas de saldo/lucro, janelas de período), `investments.ts` (simulações), `modules.ts`, `passwordPolicy.ts`.

O client importa o tipo `AppRouter` direto de `server/routers.ts`; mudar input/output de uma procedure quebra o client no `pnpm check`.

### Deploy (Vercel)

`vercel.json` builda só o client (`pnpm build:client`) e serve `/api/*` pela função `api/index.ts`; todo o resto cai em `index.html` (SPA). O `pnpm build`/`pnpm start` com `dist/index.js` não é o caminho usado na Vercel.

### Autenticação

Login por e-mail/senha no Supabase Auth (`server/supabaseAuth.ts`), mas a sessão do SIGAR é um **cookie HTTP-only próprio** assinado com `JWT_SECRET` (`sdk.signSession` em `server/_core/sdk.ts`). O `createContext` resolve `ctx.user` a partir desse cookie; o usuário Supabase é espelhado na tabela `users` (`openId` = id do Supabase). Eventos de senha são gravados em `securityEvents`.

Boa parte de `server/_core/` (oauth, sdk, llm, map, storageProxy, imageGeneration etc.) e `vite-plugin-manus-runtime` vieram do template Manus; o OAuth do Manus não é o fluxo de login em uso.

### Autorização em camadas

Toda procedure de dados deve aplicar as camadas cabíveis:

1. `protectedProcedure` (`server/_core/trpc.ts`) — exige sessão.
2. `moduleProcedure("<modulo>")` (`server/routers/moduleAccess.ts`) — exige o módulo ligado para a conta.
3. `assertPropertyAccess(propertyId, userId, minRole)` (`server/routers/propertyAccess.ts`) — papel efetivo na propriedade: `proprietario` > `editor` > `visualizador`. O dono (`ruralProperties.ownerId`) é sempre `proprietario`; os demais vêm de `propertyMembers` com status `ativo` (convites por e-mail). Ver `docs/membros-propriedade.md`.

**Módulos por perfil** (`shared/modules.ts`): o perfil (`produtor`, `gestor`, `estudante`, `consultor`, `administrador`) só define quais módulos vêm ligados por padrão; o usuário liga/desliga em `/perfil` e apenas a diferença é gravada em `userProfiles.moduleOverrides`. Código deve perguntar `hasModule(...)`, nunca checar o perfil diretamente. No client, `ModuleGate` + `useModules` espelham a regra. Para adicionar um módulo: `moduleIds`/`MODULES`/`PERSONA_MODULES` em `shared/modules.ts`, `moduleProcedure` no router, `ModuleGate` na rota.

### Duas noções de "usuário"

- `users` — contas autenticadas (login). É o que `ctx.user` e `propertyMembers` referenciam.
- `usuarios` + `usuario_propriedade` — pessoas físicas cadastradas por CPF e vinculadas a propriedades (`finance.domainUsers`), **sem** relação com login nem permissão. Ver `docs/usuarios-propriedades.md`.

### Banco de dados

- Postgres no Supabase, acessado pelo servidor via Drizzle (`server/db.ts`, pool `pg` com `max: 1`). Schema em `drizzle/schema.ts`; todo acesso a dados passa por funções exportadas de `server/db.ts`.
- **Migrations são escritas à mão e mantidas em dois lugares** com o mesmo conteúdo: `drizzle/NNNN_*.sql` e `supabase/migrations/<timestamp>_*.sql` (esta última é a que se aplica nos projetos Supabase). O journal do drizzle-kit (`drizzle/meta`) para na 0003 — não usar `pnpm db:push` para gerar migrations novas.
- Ambientes: produção e homologação são projetos Supabase separados. O MCP `supabase` em `.mcp.json` é **read-only em produção**. Aplicar e validar migrations primeiro em homologação.

## Testes

Os testes de servidor chamam o `appRouter` diretamente com um `TrpcContext` montado à mão e mockam a camada de dados com `vi.mock("./db", ...)` (via `vi.hoisted`) — não há banco nos testes. Siga esse padrão em `server/*.test.ts`; regras puras vão em `shared/*.test.ts`.

## Documentação de domínio

`docs/` descreve requisitos e regras por RF/RN (fluxo financeiro RF08–RF25, investimentos RF26–RF31, redefinição de senha RF03, membros, remoção segura de propriedades). Consulte o doc correspondente antes de mudar regras de cálculo ou permissões.
