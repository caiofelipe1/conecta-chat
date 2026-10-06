# Validação executada

Esta validação usa o código entregue, serviços locais do Firebase Emulator Suite e bundling Metro. Não envolve Firebase, API pública ou dispositivos da equipe.

| Verificação | Resultado |
| --- | --- |
| TypeScript do aplicativo e API | Aprovado, configuração strict |
| Testes de domínio e HTTP | 31 aprovados |
| Regras Firestore, RTDB e Storage nos emuladores | 20 aprovados |
| Integração Firestore/RTDB e transporte FCM interceptado | 15 aprovados |
| Total automatizado | 66 testes aprovados |
| Build TypeScript da API | Aprovado |
| Expo config público | Resolvido como SDK 55, Android e iOS |
| Exportação Metro Android | Aprovada; bundle Hermes gerado |
| Exportação Metro iOS | Aprovada; bundle Hermes gerado |
| Busca de uso do tipo any no código autorado | Nenhum encontrado |
| Integrantes no README e entrega.json | Cinco nomes completos e RMs preenchidos e conferidos |
| Verificador da entrega | Configuração pública preenchida; reprovado por URLs, evidências e status final ainda pendentes |

## O que os testes exercitam

- Identificação de par direto sem duplicações/colisões e proibição de conversa consigo mesmo.
- Todas as políticas de destinatários, exclusão do remetente e proteção de alvos.
- Validação de limite, duplicados, datas e proibição de foto Base64.
- Proteção HTTP Bearer, erros, payloads estritos e rejeição de destinatários/remetentes forjados.
- Regras cliente que negam dados privados, tokens e ações não autorizadas.
- Regras de foto: dono, tipo de arquivo e tamanho máximo.
- Concorrência real de transações para criação de conversa, última vaga, mensagem idempotente e push duplicado.
- Perfis compartilhados, token pertencente a uma única conta, remoção de integrantes e bloqueio de envio posterior.

## Resultados que não foram verificados

- Não houve build Gradle/Xcode ou assinatura de APK/IPA. A exportação Metro só valida o JavaScript e suas dependências; na execução inicial, avisou sobre arquivos nativos Firebase ausentes. Posteriormente, google-services.json e GoogleService-Info.plist foram recebidos e validados. A configuração Expo reconhece os caminhos e identificadores de ambos; isso não comprova compilação nem push.
- Não houve QA visual em Android/iOS, instalação em aparelhos ou screenshot real.
- Os sete campos públicos do projeto Firebase `conecta-chat-2c4f7` estão preenchidos. As imagens do Console confirmaram RTDB e Firestore criados, Authentication por e-mail/senha ativado e publicação das regras dos dois bancos. Os arquivos Android/iOS foram validados contra projeto, sender ID, databaseURL, bucket e identificadores de app.config.ts. A equipe informou https://github.com/caiofelipe1/conecta-chat; o envio do código permanece sem confirmação. Storage exige upgrade para Blaze, ainda não autorizado pela equipe; Apple/APNs e regras de Storage permanecem pendentes. Não houve teste de conexão em produção.
- Não há API pública criada nem health check remoto confirmado.
- FCM nos testes de integração usa um spy apenas no envio externo. Entrega real, APNs, segundo plano/app fechado e toque para navegar não foram comprovados.
- O Dockerfile/blueprint foram fornecidos, mas não houve build Docker ou deploy neste ambiente, que não oferece Docker.

## Como reproduzir

Na raiz, depois de `npm ci`:

```bash
npm run typecheck
npm test
npm run test:rules
npm run test:integration
npm run server:build
```

Não execute os dois comandos de emuladores simultaneamente: compartilham projeto, portas e arquivos locais. Os testes locais removem variáveis de proxy somente do processo de teste quando um emulador RTDB está configurado, pois o transporte WebSocket desse SDK não respeita NO_PROXY. Essa adaptação não altera o aplicativo/API em produção.

Após conectar serviços e aparelhos reais, siga `TESTES_MANUAIS.md`, insira as evidências, preencha as URLs e execute `npm run check:delivery`. Os integrantes já foram preenchidos. Esse último comando falhará enquanto as pendências permanecerem.
