# Arquitetura e decisões

## Objetivo e fronteiras

O cliente cuida de autenticação nativa, UI, fotos, registro de dispositivo e listeners. A API Express valida tokens, autoriza ações, publica mensagens e envia FCM. Firestore mantém o modelo de negócio; RTDB mantém o histórico e uma ACL técnica por conversa.

## Modelo de dados

| Caminho | Serviço | Conteúdo e acesso |
| --- | --- | --- |
| `users/{uid}` | Firestore | Perfil completo. Próprio usuário pode ler; terceiros obtêm pela API se houver conversa em comum. Escrita pela API. |
| `directory/{uid}` | Firestore | UID, nome e URL de foto. Leitura por usuários autenticados por senha. |
| `users/{uid}/devices/{deviceId}` | Firestore | Token FCM, plataforma, enabled, UID, deviceId e atualização. Privado. |
| `users/{uid}/installations/{tokenHash}` | Firestore | ID aleatório associado à instalação. Privado ao UID. |
| `tokenOwners/{sha256Token}` | Firestore | Dono atual do token para impedir associação simultânea a duas contas. Somente API. |
| `groups/{id}` | Firestore | Nome/foto, ownerId, memberIds, memberLimit, política, datas e revisão. Leitura por integrantes; escrita pela API. |
| `directConversations/{id}` | Firestore | Dois participantes, revisão e data. ID determinístico com comprimento e UIDs ordenados. |
| `conversationLocks/{id}` | Firestore | Operação de grupo em andamento, metadados anteriores/propostos. Somente API. |
| `notificationReceipts/{hash}` | Firestore | Reserva e resultado de push por conversa/mensagem. Somente API. |
| `streams/{id}/access` | RTDB | State, revisão e mapa de membros replicado pela API. Não substitui o modelo de grupo do Firestore. |
| `streams/{id}/messages/{uuid}` | RTDB | Mensagem, remetente, alvo, menções, horário e tipo da conversa. Leitura por integrante ativo. |
| `users/{uid}/{uuid}.jpg` | Storage | Arquivo de imagem, até 5 MB. Upload pelo proprietário da pasta. |

Os caminhos adicionais são a adaptação permitida pelo enunciado. Não há mensagens no Firestore nem fotos Base64 nos bancos. IDs de UIDs aceitam os caracteres usados por contas e-mail/senha do Firebase (`A–Z`, `a–z`, números, `_`, `-`); IDs de conversa admitem até 600 caracteres para a concatenação segura de UIDs.

## Decisão: gravações críticas pela API

Regras do RTDB não consultam documentos do Firestore. Tentar autorizar a mensagem somente por dados fornecidos pelo aplicativo deixaria o gerenciamento de membros contornável. A API é responsável por:

1. validar o Firebase ID Token, checar revogação e exigir o provedor `password`;
2. ler participantes e políticas no Firestore;
3. garantir o limite e a autoridade do proprietário;
4. manter a ACL técnica do RTDB;
5. derivar `senderId` do token e verificar o alvo da mensagem;
6. persistir mensagens no RTDB com revisão/membership verificados em transação.

O fluxo mobile é `sendMessage` → endpoint de mensagens → persistência RTDB → endpoint de notificação. O aplicativo não recebe nem contém credenciais Admin.

## Concorrência na edição de grupos

Cada edição envia o estado completo pretendido e `expectedRevision`. O servidor valida o tamanho, duplicados, limite, proprietário e existência dos perfis. A transação Firestore lê o documento de grupo e seu lock. Exatamente uma edição adquire o lock; uma edição simultânea recebe HTTP 409, ou sua revisão torna-se antiga.

Depois de adquirir:

1. fechar `streams/{id}/access/state` no RTDB;
2. publicar o grupo novo no Firestore sob o mesmo lock;
3. substituir a ACL do RTDB inteira por `active`, nova revisão e novos membros;
4. remover o lock.

Não existe janela em que membros antigos possam enviar com a revisão nova. Mensagens em andamento precisam passar pela transação RTDB: o acesso fechado ou uma revisão diferente rejeita o envio. Uma gravação concluída antes do fechamento pertence ao período em que o usuário ainda era integrante.

Durante o fechamento, o cliente recebe alteração da ACL, apaga o histórico do estado da tela e cancela o listener de mensagens. Ao reabrir, reanexa o listener; um removido perde acesso à ACL/mensagens e recebe feedback. Conteúdo já entregue antes da remoção não pode ser apagado de screenshots ou cópias externas. As regras negam novos acessos.

### Recuperação de falha intermediária

Uma falha entre serviços não libera o lock automaticamente. Isso favorece autorização consistente e impede um processo antigo de publicar alterações após uma retomada por outra réplica. O custo é indisponibilidade temporária do grupo afetado até a reconciliação.

Procedimento exclusivo da equipe responsável pela API:

1. pare **todas** as réplicas/instâncias da API e confirme que não existe edição em andamento;
2. no ambiente com os segredos da API, execute o script para o ID afetado;
3. o script fecha a ACL, lê os metadados Firestore efetivamente publicados, restaura a ACL correspondente (ou remove a preparação se o grupo não chegou a existir) e elimina o lock;
4. reinicie a API e reabra a edição no aplicativo.

```bash
API_STOPPED_FOR_RECOVERY=true node --env-file=.env dist/server/src/recover.js g_ID_DO_GRUPO
```

Execute em `server` após `npm run server:build`. O script exige confirmação explícita no ambiente de que a API está parada; não ofereça esse endpoint público ao aplicativo. Nunca apague um lock manualmente com processos ainda ativos.

## Mensagens e idempotência

O mobile gera UUID antes da solicitação. Em falha de rede, mantém o mesmo ID enquanto texto/alvo não mudarem. O servidor valida participantes, alvos e conteúdo; a transação RTDB insere apenas se o ID ainda não existir. Repetir o mesmo conteúdo retorna o original; reutilizar o ID para outro conteúdo é rejeitado. O horário é gerado no servidor.

A transação ocorre no nó da conversa para validar ACL e histórico atomicamente. Essa decisão atende ao escopo acadêmico; tem custo proporcional ao histórico e não deve ser tratada como arquitetura otimizada para milhões de mensagens. Em evolução de escala, separar o armazenamento do histórico e usar escrita condicional/serialização com controle de revisão é uma mudança arquitetural a ser planejada.

O RTDB elimina arrays vazios na serialização. `messageSchema` normaliza `mentionedUserIds` ausente como `[]`, preservando a tipagem e evitando falhas em mensagens gerais. O callback inicial da transação também pode receber cache nulo; a proposta é inicializada pelo snapshot, e o servidor continua realizando a comparação e repetindo o callback em conflitos.

## Push seguro

A API recebe apenas `conversationId` e `messageId` após persistir. Confere a mensagem, remetente e participação; calcula destinatários no servidor. Registra reserva de envio em transação Firestore antes de chamar FCM. Chamadas simultâneas ou retries retornam o recibo já existente, sem outro envio.

Uma reserva sem tentativa FCM é liberada se a operação falhar. Depois de tentar enviar, a operação não é retentada em resultado de rede ambíguo: `uncertain` indica que não é possível confirmar entrega sem arriscar duplicar. Um crash após reservar pode deixar `processing`; a mensagem permanece salva, mas o push pode se perder. Isso é a limitação conhecida da escolha por no máximo uma tentativa, não uma promessa de exactly once entre Firestore e um serviço externo.

O FCM é chamado em lotes de até 500 tokens. Tokens repetidos são deduplicados. Códigos `invalid-registration-token` e `registration-token-not-registered` desativam o token somente se ele ainda for o mesmo, preservando renovações concorrentes.

A elegibilidade considera membros/política ativos no momento da preparação do envio. Notificações já aceitas pelo FCM não podem ser retiradas de um aparelho após uma remoção posterior; os dados de payload nunca concedem acesso à conversa. Ao abrir, a API e as regras revalidam a participação.

## Estado e interface

Campos e listas usam atualizações imutáveis. Schemas Zod verificam respostas HTTP e snapshots. Componentes compartilhados apresentam loading, erro, estado vazio, imagem padrão, permissão negada e falhas de envio. Diretório geral expõe dados mínimos; perfis completos passam por autorização específica.

A lista inicial do chat inclui as últimas 100 mensagens; carregar anteriores aumenta o limite em 100. Todos os listeners possuem cleanup. Não existe envio offline de mensagens: erro de conectividade mantém o texto e o ID para nova tentativa. O usuário nunca recebe confirmação de envio apenas por alterar estado local.

## Limites desta verificação

Testes automatizados cobrem regras e serviços nos emuladores. Exportação Metro verifica resolução e transpilação Android/iOS; não compila nem assina binários nativos. Sem projeto Firebase, APNs, hospedagem e dispositivos da equipe não há validação de push de produção, UI em aparelho ou disponibilidade pública. Ver pendências.
