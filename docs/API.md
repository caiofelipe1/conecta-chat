# API HTTP

Base URL: **PENDENTE — configurar após publicar**. JSON UTF-8. HTTPS em produção. Nenhum endpoint exige que o professor execute um servidor local.

Todos os endpoints, exceto `/health` e `/ready`, exigem:

```http
Authorization: Bearer <Firebase ID Token do usuário>
Content-Type: application/json
```

A API verifica o token com Admin SDK, checa revogação e permite somente login e-mail/senha. Não recebe UID do remetente nem lista de destinatários no endpoint de push. Erros retornam `{ "error": "mensagem compreensível" }`.

## Endpoints

| Método | Caminho | Corpo | Resultado |
| --- | --- | --- | --- |
| GET | `/health` | — | 200: processo disponível |
| GET | `/ready` | — | 200: Firestore/RTDB acessíveis; 503: indisponíveis |
| POST | `/users/me` | Perfil abaixo | 201: perfil privado salvo e diretório mínimo atualizado |
| GET | `/users` | — | 200: lista de UID, nome, photoUrl |
| GET | `/users/:uid` | — | 200: perfil próprio ou compartilhado; 403: sem conversa em comum |
| POST | `/conversations/direct` | `{ "otherUid": "UID" }` | 200: conversa única para o par |
| GET | `/conversations/:id` | — | 200: metadados para participante |
| POST | `/groups` | Grupo abaixo | 201: grupo criado |
| PUT | `/groups/:id` | `{ "group": { ... }, "expectedRevision": 1 }` | 200: grupo atualizado; 409: conflito |
| POST | `/conversations/:id/messages` | Mensagem abaixo | 201: mensagem persistida ou original reutilizada |
| PUT | `/devices/:uuid` | `{ "token": "FCM_TOKEN", "platform": "android", "enabled": true }` | 204: dispositivo registrado; plataforma também pode ser `ios` |
| DELETE | `/devices/:uuid` | — | 204: dispositivo removido de forma idempotente |
| POST | `/notifications/messages` | `{ "conversationId": "ID", "messageId": "UUID" }` | 200: sent/skipped/processing/uncertain e contagens quando disponíveis |

### Perfil

```json
{
  "name": "Nome do usuário",
  "phoneNumber": "+5511999999999",
  "birthDate": "2000-01-31",
  "photoUrl": ""
}
```

UID e e-mail vêm do token; createdAt é mantido na atualização. Data ISO válida, não futura. A foto vazia é permitida; foto preenchida deve ser uma URL final do Firebase Storage da equipe na pasta do usuário.

### Grupo

```json
{
  "name": "Equipe de estudos",
  "photoUrl": "",
  "memberIds": ["UID_DO_PROPRIETARIO", "UID_DO_OUTRO_USUARIO"],
  "memberLimit": 5,
  "notificationPolicy": "all_group_messages"
}
```

Entre 2 e 100 integrantes, sem duplicados, com todos os perfis existentes. Limite inteiro entre 2 e 100, maior ou igual à ocupação. OwnerId é determinado pelo token na criação e não pode ser trocado. Na edição, envie o estado completo e a revisão atual; o servidor valida proprietário.

### Mensagem

```json
{
  "messageId": "00000000-0000-4000-8000-000000000001",
  "text": "Olá, equipe!",
  "target": { "type": "conversation" },
  "mentionedUserIds": []
}
```

Texto de 1 a 2000 caracteres após trim. Conversa direta só aceita alvo `conversation` e nenhuma menção. Grupo também aceita `{ "type": "member", "memberId": "UID_ATIVO" }` e menções a integrantes ativos. Remetente, horário, tipo, ID da conversa e ID final são registrados pela API.

UUID igual + conteúdo igual retorna a mesma mensagem. UUID igual + texto/alvo/menções diferentes retorna conflito, sem sobrescrever. Confirme a persistência antes de chamar `/notifications/messages`.

## Status e erros

| HTTP | Significado |
| --- | --- |
| 400 | Campos inválidos ou JSON incorreto |
| 401 | Token ausente, inválido, expirado/revogado ou provedor não permitido |
| 403 | Não participante, não proprietário ou remetente divergente |
| 404 | Perfil/conversa/mensagem/endpoint inexistente |
| 409 | Revisão antiga, edição concorrente, acesso temporariamente fechado ou ID já utilizado |
| 429 | Limite de solicitações por usuário atingido |
| 500 | Falha interna, sem detalhes sensíveis na resposta |
| 503 | Falha de readiness |

Payloads usam schemas strict; atributos extras, como `recipientIds` ou `senderId`, são rejeitados. Headers e tokens não aparecem nos logs de aplicação. Configure o proxy da hospedagem para preservar o header Authorization.

## Teste público de disponibilidade

Abra em navegador `https://API_REAL/health` e `https://API_REAL/ready` após publicar. O primeiro deve retornar `status: ok`; o segundo `status: ready`. A presença de endpoints públicos não substitui testar envio de mensagem e FCM autenticados em dispositivos.
