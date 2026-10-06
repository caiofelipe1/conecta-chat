# Conecta Chat

Aplicativo de chat individual e em grupo em React Native, Expo e TypeScript, com autenticação por e-mail/senha, mensagens no Realtime Database, perfis e grupos no Firestore e push nativo via Firebase Cloud Messaging.

## Status desta entrega

**PENDENTE DE CONFIGURAÇÃO — código implementado; ainda não é uma entrega publicável para correção.** Os cinco integrantes estão identificados abaixo. Os sete campos públicos do projeto Firebase `conecta-chat-2c4f7` estão preenchidos em `firebaseConfig.json`. As imagens do Console confirmaram a criação do Realtime Database e do Firestore, a ativação de Authentication por e-mail/senha e a publicação das regras dos dois bancos. Os arquivos `google-services.json` Android e `GoogleService-Info.plist` iOS foram recebidos e validados para `com.equipe.conectachat`. O repositório informado pela equipe é [caiofelipe1/conecta-chat](https://github.com/caiofelipe1/conecta-chat); o envio do código ainda precisa ser confirmado. Storage aguarda decisão sobre o plano Blaze. Ainda faltam as regras de Storage, a hospedagem da API, a configuração Apple/APNs e a validação em produção e nos aparelhos.

Também faltam builds nativos, execução em Android/iOS, prints reais e comprovação de push em aparelhos. Não foi fabricada nenhuma evidência. Consulte [PENDENCIAS.md](docs/PENDENCIAS.md) e execute `npm run check:delivery` antes de enviar ao professor.

## Integrantes

A equipe possui cinco integrantes, dentro do máximo permitido pelo enunciado:

- Augusto Barcelos Barros — RM565065
- Caio Felipe de Lima Bezerra — RM556197
- Juan Francisco Alves Muradas — RM555541
- Lucas Derenze Simidu — RM555931
- Sofia Fernandes — RM554873

Os mesmos dados estão em `entrega.json`. O limite de cinco é para a equipe acadêmica; a capacidade dos grupos de conversa dentro do aplicativo é configurável pelo proprietário.

## URLs da entrega

| Item | Valor atual |
| --- | --- |
| Repositório GitHub da equipe | PENDENTE |
| API pública HTTPS | PENDENTE |
| Health check | `SUA_API/health` |
| Readiness com acesso aos bancos | `SUA_API/ready` |

Atualize a tabela e `entrega.json` após publicar. A disponibilidade da API durante toda a correção é obrigatória.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| Expo SDK 55 (`~55.0.31`) | Build e execução nativa Android/iOS |
| React Native `0.83.10`, React `19.2.0` | Interface e estado |
| TypeScript `~5.9.2`, Zod 4 | Tipagem estrita e validação de dados externos |
| React Native Firebase `26.4.0` | Integração nativa dos serviços Firebase e FCM |
| React Navigation 7 | Navegação tipada |
| Expo ImagePicker e Crypto | Seleção de fotos e identificadores |
| Node.js 22+, Express 5 e Firebase Admin 13 | API própria; não usa Cloud Functions |
| Vitest, Supertest, Firebase Emulator Suite | Testes de domínio, HTTP, integração e regras |

As versões efetivamente instaladas são fixadas por `package-lock.json`. Use `npm ci` para reproduzi-las. O projeto utiliza a arquitetura nativa atual do SDK 55; não adicione `newArchEnabled: false`.

## Responsabilidades dos serviços

- **Authentication:** cadastro/login exclusivamente e-mail e senha; sessão persistida pelo SDK nativo; UID e logout.
- **Realtime Database:** histórico individual e em grupo, listeners das conversas e ACL técnica replicada pelo servidor.
- **Firestore:** perfil privado, diretório mínimo (nome/foto), grupos, integrantes, limite, política, conversas diretas, dispositivos e recibos de notificação.
- **Firebase Storage:** arquivos das fotos em `users/{uid}/{uuid}.jpg`, até 5 MB. Apenas a URL HTTPS é registrada nos documentos; não são gravadas imagens Base64 nos bancos.
- **FCM:** tokens nativos Android/iOS e entrega pelo Admin SDK na API. O Expo Push Service não é utilizado.

## Instalação

Pré-requisitos: Node.js 22+, npm, conta Firebase, Android Studio/SDK para build local Android e macOS/Xcode para build local iOS, ou conta Expo/EAS para build remoto. Os testes com emuladores desta versão do Firebase CLI usam Java 17+; Java 21 evita a descontinuação anunciada pelo CLI.

```bash
npm ci
cp .env.example .env
```

No Windows, copie `.env.example` para `.env` pelo Explorer ou use `Copy-Item .env.example .env` no PowerShell. O mesmo vale para os demais comandos `cp` abaixo.

### Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Em Authentication, habilite **somente E-mail/senha**. Não habilite Google, Apple, anônimo ou login por telefone.
3. Crie o Cloud Firestore e o Realtime Database. Anote a URL real do RTDB; ela pode ter domínio regional `firebasedatabase.app`.
4. Configure o Firebase Storage. Atualmente ele exige plano Blaze com conta de faturamento vinculada, conforme a [documentação oficial de requisitos](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024). Revise as cotas/custos antes de ativar. Não configure regras públicas para facilitar o teste.
5. Cadastre um aplicativo Web para obter os sete campos do SDK cliente. Substitua **todos** os marcadores do arquivo `firebaseConfig.json` na raiz. Esse arquivo precisa ser versionado no GitHub e pertencer ao mesmo projeto dos aplicativos nativos.
6. Cadastre o aplicativo Android com o package de `app.config.ts`/`.env`. Baixe `google-services.json` para a raiz.
7. Cadastre o aplicativo iOS com o mesmo bundle ID de `app.config.ts`/`.env`. Baixe `GoogleService-Info.plist` para a raiz. Os dois arquivos nativos já estão incluídos neste ZIP e são configurações cliente, não contas de serviço. Eles permanecem fora do Git; `.easignore` permite seu envio ao EAS Build sem incluir os segredos da API.
8. Publique as regras da raiz, selecionando seu projeto real:

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes,database,storage --project SEU_PROJECT_ID
```

9. Cadastre uma conta de serviço exclusiva para a API. Configure suas credenciais **apenas** nos segredos da hospedagem. Nunca coloque a chave no aplicativo, no GitHub, em `firebaseConfig.json` ou em `.env.example`.
10. Configure `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL` e `FIREBASE_STORAGE_BUCKET` na API com o mesmo projeto. O bucket deve ser o nome exato, sem `gs://`.

A API valida URLs de fotos: elas devem apontar para o bucket da equipe e para a pasta do usuário que salvou a foto. A interface apresenta avatar com iniciais se a foto estiver ausente ou falhar. Permissões negadas no picker produzem uma mensagem orientando a ativação nas configurações.

### Permissões da conta da API

Use uma conta exclusiva, sem papéis `Owner`/`Editor`. Conceda os papéis especializados necessários: `roles/datastore.user` para Firestore; `roles/firebasedatabase.admin` para RTDB; `roles/firebasecloudmessaging.admin` para envio; `roles/firebaseauth.viewer` para a verificação de usuário/revogação feita por `verifyIdToken(token, true)`. A API não acessa arquivos do Storage com Admin, portanto não precisa de `Storage Admin`. Valide os papéis no projeto real, incluindo os requisitos de escopo do RTDB documentados pelo Firebase. Caso a organização use papéis customizados, limite-os às operações efetivamente usadas. A conta padrão gerada pelo Console pode ter permissões mais amplas; não a aceite sem revisar.

## API: execução e publicação

Endpoints e corpos estão em [API.md](docs/API.md). A API é um serviço Express independente do aplicativo mobile.

### Execução local para desenvolvimento

```bash
cp server/.env.example server/.env
npm run server:build
cd server
node --env-file=.env dist/server/src/index.js
```

Para desenvolvimento com watch, em `server`: `node --env-file=.env --import tsx src/index.ts`. Os segredos locais ficam apenas no arquivo ignorado `server/.env`; durante a correção, eles ficam no serviço online.

### Publicação no Render

1. Envie este projeto ao repositório informado pela equipe: [caiofelipe1/conecta-chat](https://github.com/caiofelipe1/conecta-chat). Não tente fazer alterações no repositório do professor.
2. No Render, crie um Web Service com o repositório da equipe. Use runtime Docker, Dockerfile `server/Dockerfile` e contexto da raiz. Como alternativa, importe `render.yaml` pelo recurso Blueprints.
3. O blueprint está configurado com plano `starter`, que é pago. Revise o custo vigente antes de confirmar. Escolha uma hospedagem que mantenha a API disponível; não dependa de computador local ou serviço que precise ser iniciado pelo professor.
4. Defina no painel secreto da hospedagem as variáveis listadas em `server/.env.example`. `FIREBASE_PRIVATE_KEY` pode conter quebras de linha reais ou `\n` literais; o código trata esse formato. Não copie valores secretos para o README.
5. Publique e aguarde o health check `/ready` passar.
6. Abra `https://SEU_DOMINIO/health` e `/ready`: ambos devem responder HTTP 200. `/health` verifica o processo; `/ready` também testa acesso a Firestore e RTDB.
7. Preencha a URL real no README, em `entrega.json` e em `EXPO_PUBLIC_API_URL` do app. Refaça o bundle/build depois de alterar `.env`, pois variáveis públicas são embutidas no bundle.

O Dockerfile compila a API em uma imagem com usuário sem privilégios. `TRUST_PROXY=1` assume um proxy confiável imediatamente antes do Express, como no serviço descrito. Ajuste ao usar outra arquitetura de rede. O limite HTTP é por usuário autenticado; a deduplicação de push usa Firestore e continua funcionando com várias réplicas da API.

## Android e iOS: push e builds nativos

**Este aplicativo precisa de development build ou build nativo. Não funciona no Expo Go**, pois utiliza módulos nativos React Native Firebase.

### Android

1. Confirme package, `google-services.json`, `firebaseConfig.json` e API URL.
2. Use aparelho com Google Play Services ou ambiente Android compatível com FCM.
3. Execute:

```bash
npx expo prebuild --platform android
npm run android
```

O app solicita `POST_NOTIFICATIONS` no Android 13+. Se a permissão for negada, o chat continua e o aviso orienta o usuário. FCM apresenta a notificação remota quando o app está em segundo plano/fechado. Em primeiro plano, o app exibe uma faixa acionável **somente ao receber um payload real do FCM**, sem produzir uma segunda notificação local.

### iOS

1. Confirme bundle ID e `GoogleService-Info.plist`.
2. No Apple Developer, configure o identificador com Push Notifications e provisioning adequado. Para EAS, forneça a assinatura e os arquivos nativos no build da equipe.
3. Em Firebase > Configurações do projeto > Cloud Messaging, configure a chave APNs com o Key ID e o Team ID corretos. A chave APNs fica fora do repositório.
4. `app.config.ts` inclui background `remote-notification` e entitlement APNs. Builds com `EAS_BUILD_PROFILE=development` usam `development`; preview/production usam `production`. Para build local Debug iOS, defina essa variável como `development` no terminal antes do prebuild.
5. Em macOS:

```bash
EAS_BUILD_PROFILE=development npx expo prebuild --platform ios
EAS_BUILD_PROFILE=development npm run ios
```

O Firebase Messaging registra o dispositivo no APNs e solicita autorização no iOS. Teste em aparelho físico. A assinatura, a chave APNs e os entitlements precisam estar alinhados; transpilação JavaScript não comprova essa configuração.

### EAS

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
npm start
```

Distribua os builds à equipe. Em iOS, registre os aparelhos usados na distribuição interna. Não existe projeto EAS preconfigurado com conta fictícia; associe o projeto à conta real da equipe. O `eas.json` fornece perfis development, preview e production.

## Funcionalidades e fluxo

1. Cadastro com nome, e-mail, senha/confirmacão, celular, nascimento e seleção opcional de foto. Caso a conta seja criada e o salvamento do perfil falhe, a próxima sessão oferece conclusão do cadastro.
2. Login e recuperação de sessão pelo SDK Firebase; telas protegidas só são montadas após carregar o perfil.
3. Lista de conversas diretas e grupos, estado vazio, nova conversa, novo grupo, perfil próprio e logout.
4. Diretório de usuários com busca por nome, sem seleção do próprio usuário. Criar conversa direta reutiliza um ID determinístico e sem colisões por concatenação.
5. Grupo com nome, foto, proprietário, membros, limite inteiro entre 2 e 100, vagas e política. O limite de 100 é uma restrição operacional desta implementação, aplicada na UI e na API. O proprietário não pode sair nem reduzir o limite abaixo da ocupação.
6. Chat com mensagens persistidas, autor, horário, diferenciação enviada/recebida, histórico paginado em lotes de 100 e seleção explícita de integrante. Selecionar alguém também preenche `mentionedUserIds`; não é necessário interpretar `@nome` livre no texto.
7. Foto da conversa abre perfil do outro usuário ou integrantes do grupo. Selecionar integrante abre perfil completo, após autorização na API.
8. Tokens são registrados/renovados no servidor. Ao tocar em um push, o app abre a conversa indicada, e a API/regras verificam novamente a participação do usuário.
9. Logout remove o dispositivo no servidor, invalida o token FCM e encerra a sessão. Se a desativação falhar, apresenta erro e permite tentar novamente antes de concluir a saída. Desmontar as telas remove os listeners.

Mensagens direcionadas são visíveis no histórico de todos os integrantes ativos. O direcionamento altera apenas os destinatários do push.

## Políticas de notificação

| Política de grupo | Mensagem geral | Mensagem com seleção explícita |
| --- | --- | --- |
| `all_group_messages` | Todos os integrantes, exceto remetente | Selecionado(s), exceto remetente |
| `mentioned_members` | Ninguém sem menção/seleção | Apenas integrantes mencionados/selecionados |
| `direct_messages_only` | Nenhum push de grupo | Nenhum push de grupo |
| `disabled` | Nenhum push desta conversa | Nenhum push desta conversa |

Conversas individuais geram push para o outro participante com dispositivos habilitados. Não há seletor de política para conversa direta, pois o enunciado exige configuração pelo proprietário dos grupos. Tokens inválidos retornados pelo FCM são desativados. Remetente, não integrantes e dispositivos desabilitados são excluídos.

O payload contém `conversationId`, `conversationType` e `messageId`. A notificação exibe somente "Você recebeu uma nova mensagem", sem texto, nome de grupo, telefone ou nascimento.

## Concorrência e segurança

Veja [ARQUITETURA.md](docs/ARQUITETURA.md) para a decisão entre os bancos.

- Operações de grupo são serializadas por lock transacional persistente no Firestore. A revisão enviada pelo proprietário impede sobrescrever alterações de outro dispositivo.
- Antes de publicar mudanças de integrantes, o servidor fecha a ACL do RTDB (`state=updating`), bloqueando leituras/envios. Depois atualiza o Firestore e publica a ACL nova com a mesma revisão; então libera o lock. A UI limpa mensagens durante indisponibilidade e restaura o listener quando o acesso retorna.
- O grupo sempre mantém pelo menos dois membros e respeita seu limite; os checks não dependem somente de botões desabilitados.
- Mensagens só são gravadas pela API, com `senderId` derivado do token verificado. Transação RTDB confere revisão, acesso e idempotência do `messageId`.
- Regras Firestore bloqueiam writes diretos aos perfis, grupos, conversas e dispositivos. Perfis privados de terceiros são obtidos apenas pela API após verificar conversa/grupo em comum. O diretório expõe somente UID, nome e foto para usuários autenticados por senha.
- Regras RTDB permitem leitura de mensagens apenas a integrantes ativos. ACL, mensagens e metadados técnicos só podem ser alterados pelo Admin SDK da API.
- Não existe transação distribuída entre Firestore e RTDB. Uma falha no meio da edição mantém o lock e a conversa fechada; não é liberada automaticamente. Há um script de reconciliação seguro, explicado na arquitetura, para uso com todas as réplicas paradas.
- Solicitações repetidas de push reservam um recibo em transação Firestore. Uma mensagem já processada não é enviada novamente. A opção é **no máximo uma tentativa de envio por mensagem**, inclusive em respostas de rede ambíguas; não se promete entrega exatamente uma vez pelo provedor. Um crash após reservar pode deixar o recibo em `processing`, sem reenvio automático.

O Admin SDK ignora regras cliente; por isso todas as validações críticas também estão no servidor. O token é verificado com checagem de revogação e exige provedor `password`.

## Estrutura

```text
App.tsx                         autenticação e navegação
index.ts                        entrada e handler de FCM em background
firebaseConfig.json             configuração pública obrigatória do cliente
src/components/                 campos, botões, avatares, mensagens, input, seletor
src/contexts/                   sessão e perfil
src/hooks/                      conversas, chat, notificações
src/screens/                    login, cadastro, conversas, usuários, grupo, chat, membros, perfil
src/services/                   Firebase, HTTP, autenticação, usuários, grupos, chat, fotos, push
src/navigation/                 parâmetros tipados
shared/domain.ts                schemas e tipos compartilhados; políticas e IDs
server/src/                     Express, Admin SDK, backend, contratos, erros, recuperação
tests/                          domínio, API, integração, regras
docs/                           arquitetura, endpoints, testes, requisitos, pendências e evidências
scripts/check-delivery.mjs       validação de preparação para entrega
firestore.rules                 regras Firestore
database.rules.json             regras RTDB
storage.rules                   regras de imagens
render.yaml                     modelo de deploy da API
server/Dockerfile               imagem da API
entrega.json                    integrantes, URLs e caminhos das evidências
```

`useState` guarda campos/estado; `useEffect` instala e limpa listeners; `useMemo` deriva listas e vagas; `useCallback` estabiliza operações e navegação de push. Não há uso de `any` no código autorado.

## Verificação

```bash
npm run typecheck
npm test
npm run test:rules
npm run test:integration
npm run server:build
npm run check:delivery
```

Os testes Firebase usam projeto `demo-conecta`, sem credenciais reais. A integração utiliza Firestore e RTDB nos emuladores; somente o transporte FCM é interceptado nos testes automatizados. Push real **não** é simulado na aplicação. A evidência física continua obrigatória.

Resultados executados e limitações estão em [VALIDACAO.md](docs/VALIDACAO.md). O roteiro para dois ou mais usuários e aparelhos está em [TESTES_MANUAIS.md](docs/TESTES_MANUAIS.md).

## Prints e evidência de notificação

**Pendentes: capturar o aplicativo real configurado.** Coloque os arquivos abaixo após executar o roteiro de testes; eles não existem nesta versão de preparação. Não use mockups ou screenshots de outro aplicativo.

| Tela/evidência | Arquivo esperado |
| --- | --- |
| Login | `docs/evidencias/login.png` |
| Cadastro | `docs/evidencias/cadastro.png` |
| Conversas | `docs/evidencias/conversas.png` |
| Usuários | `docs/evidencias/usuarios.png` |
| Criação/edição de grupo | `docs/evidencias/grupo.png` |
| Chat em tempo real | `docs/evidencias/chat.png` |
| Perfil | `docs/evidencias/perfil.png` |
| Push Android | `docs/evidencias/push-android.png` |
| Push iOS | `docs/evidencias/push-ios.png` |

Depois de capturar, insira imagens Markdown neste README, por exemplo `![Chat](docs/evidencias/chat.png)`, e registre em `docs/evidencias/README.md` os dispositivos e resultados reais.

## Envio no Teams

Após resolver todas as pendências, envie na tarefa do professor: **link do GitHub da equipe e URL pública da API**. Mantenha ambos acessíveis e a API online durante toda a correção. O professor não deve instalar/executar o servidor ou configurar os segredos.

## Fontes oficiais

- [Enunciado original](https://github.com/anderltda/doc-react-native/blob/main/CPS/3ESPX/Segundo%20Semestre/README_TRABALHO_REACT_NATIVE_CHAT_FIREBASE_GRUPOS_PUSH.md).
- [Expo SDK 55 e compatibilidade React/React Native](https://docs.expo.dev/versions/v55.0.0/).
- [React Native Firebase: integração Expo](https://rnfirebase.io/).
- [Firebase Messaging: recebimento e tokens nativos](https://rnfirebase.io/messaging/usage).
- [Firebase Admin: verificar tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
- [RTDB Admin: transações](https://firebase.google.com/docs/database/admin/save-data).
- [Firestore: transações](https://firebase.google.com/docs/firestore/manage-data/transactions).
- [Firebase Admin: envio FCM](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk).
- [Expo ImagePicker](https://docs.expo.dev/versions/v55.0.0/sdk/imagepicker/).
- [Deploy Express no Render](https://render.com/docs/deploy-node-express-app).
- [Papéis IAM Firebase](https://firebase.google.com/docs/projects/iam/roles-predefined-product).
- [Firebase Storage: configuração e requisitos](https://firebase.google.com/docs/storage).
