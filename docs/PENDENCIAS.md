# Pendências obrigatórias para concluir a entrega

Código e testes são fornecidos. Os cinco nomes completos e RMs já estão incluídos no README e em entrega.json. Os sete campos públicos de firebaseConfig.json estão preenchidos. As imagens do Console confirmaram RTDB e Firestore criados e Authentication por e-mail/senha ativado. google-services.json Android e GoogleService-Info.plist iOS foram recebidos e validados para o mesmo projeto e identificador com.equipe.conectachat. As pendências abaixo dependem de configuração dos demais serviços, publicação e execução nos dispositivos da equipe.

| Pendência | Como concluir | Comprovação |
| --- | --- | --- |
| Storage | Decidir sobre faturamento Blaze e criar o bucket de fotos no projeto `conecta-chat-2c4f7`; o Console confirmou que exige upgrade | Bucket, regras e upload real |
| Builds nativos | Produzir e instalar builds Android/iOS com os dois arquivos de configuração já incluídos | Builds e execução nos aparelhos |
| Regras de Storage e validação dos bancos | Publicar storage.rules após criar o bucket; imagens confirmaram publicação de Firestore e RTDB, mas falta testar acessos reais | Upload e testes de acesso em produção |
| API publicada | Criar serviço com Docker/blueprint; configurar segredos no painel | URLs `/health` e `/ready` online |
| URL do app | Definir `EXPO_PUBLIC_API_URL` com HTTPS real | App chama a API hospedada |
| Push Android | Autorizar notificações; registrar token FCM | Aparelho recebe com app em background/fechado |
| Push iOS | Configurar Apple/APNs, assinatura e token FCM | Aparelho recebe com app em background/fechado |
| Evidências reais | Executar roteiro e capturar prints | Imagens em `docs/evidencias` e no README |
| Código no GitHub | Enviar o código para https://github.com/caiofelipe1/conecta-chat e confirmar acesso | Arquivos disponíveis ao professor |
| Entrega Teams | Enviar GitHub + API na tarefa correta | Envio pela própria equipe |

## Ordem de conclusão

1. Concluir Storage quando a equipe decidir sobre faturamento; integrantes e configurações públicas Web/Android/iOS já estão preenchidos.
2. Enviar o código ao GitHub informado e configurar a API no servidor online; publicar as regras de Storage após criar o bucket.
3. Publicar a API e confirmar health/readiness públicos.
4. Configurar cliente/nativos, produzir builds e instalar nos aparelhos.
5. Rodar os testes manuais de segurança, políticas e push.
6. Inserir evidências e atualizar o status do README.
7. Executar `npm run check:delivery`. Ele deve passar com arquivos/URLs reais.
8. Enviar os dois links pelo Teams e manter a API disponível durante a correção.

O enunciado prevê nota zero para a entrega sem nomes/RMs e zero no item de push se a API estiver indisponível. O ZIP fornecido por si só não substitui os links, o Firebase real, os builds e as evidências.
