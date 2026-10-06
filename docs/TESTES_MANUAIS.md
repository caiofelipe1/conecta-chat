# Roteiro de validação em dispositivos

Execute depois de configurar Firebase e API reais. Use contas e-mail/senha criadas pelo app; os nomes abaixo são papéis de teste, não contas pré-cadastradas.

Registre modelo/versão Android e iOS, versão do build, URL da API, data, UID das contas testadas e resultado. Não capture senhas, tokens, chaves privadas ou telas com credenciais administrativas.

## 1. Cadastro e sessão

- [ ] Cadastrar usuário A e B com nome, celular, nascimento e senha/confirmacão.
- [ ] Selecionar fotos e confirmar que só as URLs ficam no Firestore; arquivos no Storage.
- [ ] Negar permissão de foto e verificar orientação; continuar com imagem padrão.
- [ ] Senhas diferentes, senha fraca, e-mail inválido/duplicado e data inválida apresentam erros.
- [ ] Login inválido não abre conversas.
- [ ] Fechar e abrir o app recupera a sessão.
- [ ] Simular falha após criar conta: sessão permite completar o perfil sem criar outra conta.

## 2. Conversa individual

- [ ] A não aparece como opção para A iniciar conversa.
- [ ] A inicia conversa com B; B encontra a mesma conversa.
- [ ] Iniciar novamente reutiliza o mesmo ID/documento, sem duplicar.
- [ ] B recebe mensagem de A em tempo real sem refresh.
- [ ] Enviar novamente após falha de resposta conserva o mesmo ID e não duplica mensagem.
- [ ] Tocar na foto abre dados cadastrados de B.
- [ ] Usuário C, sem conversa em comum, não consegue obter o perfil completo de B pela API.
- [ ] Conta sem participação não lê mensagens pelo SDK do banco.

## 3. Grupo e concorrência

- [ ] A cria grupo com B, foto, limite 3 e política escolhida.
- [ ] A vê duas pessoas e uma vaga; B vê o grupo mas não pode gerenciá-lo.
- [ ] A aumenta o limite, adiciona e remove membros; foto abre listagem com proprietário indicado.
- [ ] Selecionar pessoa na listagem abre seu perfil autorizado.
- [ ] Reduzir limite abaixo da ocupação e adicionar com grupo cheio falham na UI e na API.
- [ ] Tentar deixar apenas proprietário falha.
- [ ] Dois dispositivos de A editam simultaneamente a última vaga: somente uma alteração conclui; a outra recebe conflito. O grupo nunca excede o limite.
- [ ] B mantém chat aberto e A remove B: mensagens são retiradas da tela, B perde o listener e não envia nem lê novos dados.
- [ ] Durante edição, integrantes veem acesso temporariamente fechado, seguido de atualização automática após publicar a ACL.
- [ ] Seleção explícita direciona push ao integrante, mas a mensagem continua no histórico do grupo para todos.

## 4. Políticas de push

Grupo com A, B e C; mensagens enviadas por A. B e C possuem dispositivos com tokens habilitados. Para facilitar a comprovação, deixe receptores em background.

| Política | Ação | Resultado esperado |
| --- | --- | --- |
| all_group_messages | Mensagem geral | B e C recebem; A não recebe |
| all_group_messages | Selecionar B | B recebe; C/A não recebem |
| mentioned_members | Mensagem sem seleção/menção | Ninguém recebe push |
| mentioned_members | Selecionar C | Somente C recebe |
| direct_messages_only | Mensagem de grupo | Ninguém recebe push |
| direct_messages_only | Mensagem direta A→B | B recebe |
| disabled | Mensagem de grupo | Ninguém recebe push |

- [ ] Reenviar `/notifications/messages` para a mesma mensagem não produz novo push.
- [ ] Outro remetente não pode solicitar push daquela mensagem.
- [ ] Um não integrante não recebe push.
- [ ] Dispositivo desabilitado não recebe push.
- [ ] FCM com token inválido desativa o registro no Firestore.
- [ ] O texto do push não revela conteúdo da mensagem nem dados pessoais.

## 5. Estados Android/iOS

- [ ] Android: app em primeiro plano recebe payload FCM e mostra faixa acionável.
- [ ] Android: app em segundo plano recebe notificação do sistema.
- [ ] Android: app fechado recebe notificação do sistema; tocar abre a conversa correta.
- [ ] iOS: repetir os três estados e confirmar assinatura/APNs corretos.
- [ ] Tocar em notificação de grupo do qual foi removido apresenta acesso negado.
- [ ] Negar permissão mantém o chat funcionando e mostra orientação.
- [ ] Ativar permissão depois nas configurações e voltar ao app registra o token.
- [ ] Renovar token mantém o dispositivo funcional e não deixa o token antigo recebendo.

Forçar parada do app nas configurações Android pode impedir entrega até o usuário reabri-lo; não confunda esse comportamento do sistema com o estado normal de app fechado. Registre a forma usada para encerrar o app.

## 6. Logout e conectividade

- [ ] Logout remove o registro atual do servidor e invalida o token FCM antes de voltar ao login.
- [ ] Listeners e telas da sessão anterior são desmontados.
- [ ] Conta diferente não vê conversas privadas da anterior.
- [ ] Sem internet, login/listagem/envio exibem feedback e envio mantém texto.
- [ ] Mensagem salva com falha ao solicitar push informa essa diferença e permite retentar somente o push.
- [ ] Foto ausente ou URL quebrada mostra avatar padrão.
- [ ] API pública permanece online sem servidor/computador local da equipe.

## Evidências

Capture todos os arquivos de `entrega.json`. Para push, use prints Android/iOS e, preferencialmente, vídeo curto demonstrando remetente, receptor em background e toque abrindo a conversa. Anote a política testada em `docs/evidencias/README.md`.
