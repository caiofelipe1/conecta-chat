# Rastreabilidade do enunciado

Legenda: **implementado** significa código disponível e verificações automatizadas aplicáveis; não significa execução comprovada em aparelho ou serviço de produção. **Pendente externo** depende de contas, dados e recursos não fornecidos.

| Requisito | Implementação | Situação |
| --- | --- | --- |
| Expo SDK 55+, React Native e TypeScript | package.json, app.config.ts, tsconfig.json | Implementado |
| Android/iOS | Config nativa, Firebase Messaging e EAS | Arquivos Android/iOS recebidos e validados; Apple/APNs, builds e dispositivos pendentes |
| E-mail/senha exclusivamente | authService, FirebaseBackend.verifyToken, regras | Implementado |
| Cadastro completo e confirmação | RegisterScreen, schemas, API perfil | Implementado |
| Recuperação da sessão/logout | AuthContext, unregisterNotifications | Implementado |
| Usuários reais, busca e impedir si mesmo | UsersScreen/UserSelector, startDirect | Implementado |
| Exatamente dois participantes e sem duplicar par | ID determinístico + transação Firestore | Implementado e teste concorrente |
| Perfil por foto e autorização compartilhada | ChatScreen, MembersScreen, ProfileScreen, API profile | Implementado e autorização testada |
| Grupos com nome, proprietário, foto e membros | GroupFormScreen e API group | Implementado |
| Limite inteiro, vagas, redução e concorrência | groupInputSchema, UI, lock + revisão | Implementado e teste concorrente |
| Mensagens no RTDB, incluindo direcionadas | sendMessage, schemas, ChatInput | Implementado e integração testada |
| Atualização em tempo real e cleanup | useChat e useConversations | Implementado; comportamento em aparelho pendente |
| Firestore funcional para perfil/metadados/tokens | API + listeners nativos | Implementado e integração testada |
| Fotos em armazenamento e URL nos bancos | photoService, Storage e regras | Implementado; upload nativo em aparelho pendente |
| Permissões e imagem padrão | choosePhoto, Avatar, registerNotifications | Implementado |
| API própria, sem Cloud Functions | server Express, Dockerfile, render.yaml | Implementado; deploy pendente |
| API valida token e mensagem; calcula receptores | verifyToken, notify, resolveRecipients | Implementado e testado |
| Duplicação de notificações | notificationReceipts transacional | Implementado e teste concorrente |
| Quatro políticas obrigatórias | resolveRecipients e seleção no grupo | Implementado e testes de políticas |
| Remetente excluído, ativos e tokens inválidos | notify e device registry | Implementado |
| Payload abre conversa | useNotifications e navegação tipada | Implementado; toque em aparelho pendente |
| Regras privadas de bancos, perfil e dispositivos | firestore.rules/database.rules/storage.rules | Implementado; regras testadas em emuladores |
| Removidos bloqueados | API membership + barreira/ACL RTDB | Implementado e testado |
| Loading, vazio, erro, conectividade, push negado | Componentes, services e hooks | Implementado; QA visual em aparelho pendente |
| Hooks, imutabilidade e componentização | src organizado e tipos compartilhados | Implementado; typecheck aprovado |
| Sem any | Código autorado, strict TypeScript | Verificado por busca e compilação |
| firebaseConfig.json exato, público, real | Arquivo com os sete campos | Sete campos públicos preenchidos com dados fornecidos pela equipe; conexão de produção ainda não validada |
| .env.example app/API e nenhum Admin no mobile | Exemplos, gitignore, API env | Implementado |
| Credenciais mínimas na hospedagem | README e variáveis da API | Pendente externo |
| README e integrantes/RMs | README + entrega.json | Cinco integrantes identificados; dentro do máximo de cinco |
| URL pública da API | README + entrega.json + check-delivery | Publicação e URL real pendentes |
| Prints e push real | Roteiro e diretório de evidências | Pendente externo |
| GitHub acessível + links Teams | Instruções de publicação/envio | Pendente externo |

Fonte: [enunciado](https://github.com/anderltda/doc-react-native/blob/main/CPS/3ESPX/Segundo%20Semestre/README_TRABALHO_REACT_NATIVE_CHAT_FIREBASE_GRUPOS_PUSH.md), lido nesta implementação. Não há credenciais de equipe ou publicações inventadas.
