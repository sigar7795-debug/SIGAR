# Membros de propriedade e permissão efetiva (RF07, RF57, RN09, RNF09)

## Objetivo

Antes desta funcionalidade, o único mecanismo de acesso a uma propriedade era
`ruralProperties.ownerId`: um único titular técnico (conta autenticada em
`users`). Não era possível convidar outra conta para colaborar numa
propriedade, nem havia papéis de acesso. A tabela `usuario_propriedade`
(ver [docs/usuarios-propriedades.md](usuarios-propriedades.md)) **não**
resolve isto — liga pessoas físicas por CPF, sem qualquer relação com uma
conta autenticada nem com direitos de acesso.

A tabela **`propertyMembers`** cria o vínculo real entre uma conta
autenticada e uma propriedade, com papel de acesso e estado de convite.

## Entidade e integridade

| Coluna | Descrição |
|---|---|
| `propertyId` | Propriedade a que o vínculo se refere. |
| `userId` | Conta autenticada (`users.id`), nula enquanto o convite está pendente e a conta ainda não existia. |
| `invitedEmail` | E-mail convidado (normalizado em minúsculas); chave de correspondência com a conta que aceita. |
| `role` | `proprietario`, `editor` ou `visualizador`. |
| `status` | `pendente`, `ativo`, `revogado` ou `recusado`. |
| `invitedById` | Conta que criou o convite. |

Índice único em `(propertyId, invitedEmail)`: um mesmo e-mail só pode ter um
vínculo por propriedade (reconvidar atualiza a linha existente).

O titular técnico original (`ruralProperties.ownerId`) é sempre
**proprietário implícito** e nunca precisa de uma linha em
`propertyMembers` — por isso nunca pode ser revogado ou rebaixado por esta
funcionalidade, o que evita uma propriedade ficar sem proprietário.

## Papéis e hierarquia

`proprietario > editor > visualizador`. Cada operação exige um papel mínimo:

| Operação | Papel mínimo |
|---|---|
| Ler propriedade, lançamentos, painel, lista de membros | `visualizador` |
| Criar, editar ou remover lançamentos financeiros | `editor` |
| Editar dados cadastrais da propriedade (RF06) | `proprietario` |
| Convidar, alterar papel ou revogar membros | `proprietario` |
| Remover (inativar) a propriedade | `proprietario` + perfil gestor/administrador ([docs/remocao-segura-propriedades.md](remocao-segura-propriedades.md)) |

A permissão efetiva é resolvida em `getEffectiveRole` (`server/db.ts`) e
aplicada por `assertPropertyAccess` em todas as consultas e mutações de
`server/routers/finance.ts` — nenhuma delas confia mais na igualdade estrita
de `ownerId`.

## Fluxo de convite

Não há envio de e-mail real. Um proprietário convida por e-mail e papel; o
vínculo nasce com `status = "pendente"`. Quando uma conta com esse e-mail
entra na plataforma, vê o convite numa secção "Convites pendentes" e pode
aceitar (`status = "ativo"`, `userId` preenchido) ou recusar
(`status = "recusado"`). Um proprietário pode alterar o papel ou revogar
(`status = "revogado"`) um membro a qualquer momento.

## Testes

`server/property-members.test.ts` cobre bloqueio de leitura para não
membros, bloqueio de escrita para visualizadores, bloqueio de gestão de
membros para editores, e que só um proprietário convida/altera/revoga.
`server/db.permissions.test.ts` cobre a hierarquia pura de papéis.
