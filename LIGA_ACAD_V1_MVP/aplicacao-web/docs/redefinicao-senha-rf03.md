# Redefinição e troca de senha (RF03)

## Objetivo

Complementa o acesso por e-mail e senha (RF01/RF02). Antes, "Esqueci minha
senha" só mandava procurar o administrador, e a secção de senha de **Meu
perfil** recolhia os campos sem chamar nenhuma operação.

## Fluxos

### 1. Pedido de redefinição (`auth.requestPasswordReset`)

1. Em `/login`, "Esqueci minha senha" abre o modo de recuperação (também
   acessível por `/login?modo=recuperar`), já com o e-mail digitado.
2. O servidor chama `resetPasswordForEmail` do Supabase com
   `redirectTo = <APP_URL ou host atual>/redefinir-senha`.
3. A resposta é **sempre** `{ success: true }`, com uma duração mínima de
   1,5 s. Erros do provedor (conta inexistente, limite de envios) não chegam
   ao cliente, então a tela não revela se a conta existe.

### 2. Definição da nova senha (`/redefinir-senha`)

1. O Supabase valida o link do e-mail e redireciona com os tokens da
   sessão de recuperação no fragmento (`#access_token=…&type=recovery`) ou
   com o erro (`#error_code=otp_expired`).
2. A página retira os tokens da URL e do histórico logo ao abrir e chama
   `auth.validatePasswordReset`. O servidor confere localmente que o token é
   de recuperação (`amr.method = "recovery"`) e não expirou (`exp`), e depois
   confirma a sessão no Supabase (`getUser`).
3. Com o link válido, o formulário pede nova senha + confirmação e chama
   `auth.resetPassword`, que abre a sessão de recuperação, atualiza a senha e
   **revoga todas as sessões do Supabase** (`signOut` global). Assim o link
   deixa de funcionar depois de usado.
4. Link expirado, inválido ou já usado mostra uma mensagem clara e o botão
   "Solicitar novo link".

Os tokens trafegam só no corpo de mutations (POST), nunca em query string,
para não aparecerem em logs de acesso.

Se o `redirectTo` não estiver liberado no Supabase, o link volta para o Site
URL. `client/src/main.tsx` deteta `type=recovery` no fragmento e reencaminha
para `/redefinir-senha`.

### 3. Troca de senha no perfil (`auth.changePassword`)

Exige sessão autenticada. O servidor confirma a senha atual com
`signInWithPassword`, atualiza com `updateUser` e descarta a sessão
temporária. A conta de demonstração não tem senha e recebe `FORBIDDEN`; a
interface mostra um aviso no lugar do formulário.

## Política de senha

`shared/passwordPolicy.ts`, usada pelo cliente e pelo servidor: mínimo de 8
caracteres, máximo de 72 bytes (limite do bcrypt no Supabase), confirmação
igual e nova senha diferente da atual. Regras adicionais configuradas no
Supabase (`weak_password`) aparecem como "A nova senha não atende aos
requisitos de segurança".

## Eventos de segurança

Tabela `securityEvents` (migração
`supabase/migrations/20260925120000_security_events.sql`, espelhada em
`drizzle/0006_security_events.sql`), com RLS ativo e sem acesso para `anon`
e `authenticated`.

| Coluna | Conteúdo |
|---|---|
| `eventType` | `password_reset_requested`, `password_reset_completed`, `password_reset_failed`, `password_change_completed`, `password_change_failed` |
| `userId` | Conta local, quando conhecida |
| `emailHash` | HMAC-SHA256 do e-mail normalizado (chave `JWT_SECRET`), nunca o e-mail em claro |
| `reason` | Código fixo do motivo: `expired_token`, `invalid_token`, `wrong_current_password`, `same_password`, `weak_password`, `rate_limited`, `provider_error` |
| `ipAddress` | IP de origem do pedido |

**Nunca** são gravados senha, token de acesso, refresh token nem mensagens
do provedor. Uma falha ao gravar o evento não interrompe o fluxo: fica um
aviso no log do servidor com apenas `eventType` e `reason`.

## Configuração necessária

| Onde | O quê |
|---|---|
| Banco | Aplicar a migração `20260925120000_security_events.sql`. Sem ela, os fluxos funcionam, mas os eventos ficam só no log. |
| Supabase → Authentication → URL Configuration | Incluir `https://<domínio>/redefinir-senha` (e `http://localhost:3000/redefinir-senha` em desenvolvimento) nas Redirect URLs. |
| Supabase → Authentication → SMTP | Configurar um SMTP próprio. O SMTP padrão só entrega para membros da organização e tem limite baixo de envios por hora. |
| Vercel (opcional) | `APP_URL=https://<domínio>` para fixar o domínio dos links em vez de usar o host do pedido. |

## Limitações conhecidas

- A sessão do SIGAR é um JWT próprio em cookie HTTP-only e não fica
  guardada no servidor. Redefinir a senha revoga as sessões do Supabase,
  mas **não** encerra sessões do SIGAR já abertas noutros dispositivos: elas
  continuam válidas até expirar. Encerrá-las exige guardar um marco como
  `passwordChangedAt` e rejeitar cookies emitidos antes dele.
- Não há limite de pedidos próprio da aplicação. Valem os limites do
  Supabase (intervalo mínimo por conta e e-mails por hora).

## Testes

- `shared/passwordPolicy.test.ts`: regras da política.
- `server/supabaseAuth.password.test.ts`: integração com o Supabase
  simulada. Cobre o pedido que nunca falha para o cliente, a duração mínima,
  o token expirado, de login ou malformado, a revogação após a redefinição,
  a senha atual errada e a tradução de erros.
- `server/auth.password.test.ts`: rotas tRPC. Cobre a resposta idêntica com
  e sem conta, o link para `/redefinir-senha`, a autenticação obrigatória, a
  conta de demonstração, as mensagens claras e a ausência de senha, token ou
  e-mail em claro nos eventos gravados.
