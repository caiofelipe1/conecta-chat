import { readFileSync, existsSync } from 'node:fs';
const config = JSON.parse(readFileSync('firebaseConfig.json', 'utf8'));
const delivery = JSON.parse(readFileSync('entrega.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');
const problems = [];
for (const key of [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]) {
  if (
    typeof config[key] !== 'string' ||
    !config[key] ||
    /CONFIGURAR|PENDENTE|\.\.\./.test(config[key])
  )
    problems.push(`Configurar firebaseConfig.json: ${key}.`);
}
if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/.test(delivery.repositoryUrl))
  problems.push('Informar URL do repositório GitHub em entrega.json.');
if (!/^https:\/\//.test(delivery.apiUrl) || /localhost|127\.0\.0\.1|PENDENTE/.test(delivery.apiUrl))
  problems.push('Informar a API HTTPS pública em entrega.json.');
if (
  !Array.isArray(delivery.integrantes) ||
  delivery.integrantes.length < 1 ||
  delivery.integrantes.length > 5
)
  problems.push('Informar de 1 a 5 integrantes em entrega.json.');
else
  for (const person of delivery.integrantes) {
    if (
      typeof person.nome !== 'string' ||
      person.nome.trim().split(/\s+/).length < 2 ||
      !/^RM\d+$/i.test(person.rm ?? '')
    )
      problems.push('Preencher nome completo e RM válido de cada integrante.');
    else if (!readme.includes(person.nome) || !readme.includes(person.rm))
      problems.push(`Incluir ${person.rm} e seu nome também no README.`);
  }
for (const [label, path] of Object.entries(delivery.evidencias)) {
  if (typeof path !== 'string' || !existsSync(path))
    problems.push(`Falta evidência real: ${label}.`);
  else if (!readme.includes(path)) problems.push(`Adicionar evidência ${label} ao README.`);
}
if (readme.includes('PENDENTE DE CONFIGURAÇÃO'))
  problems.push(
    'Atualizar o status do README depois de concluir todos os testes físicos e o deploy.',
  );
if (typeof delivery.apiUrl === 'string' && /^https:\/\//.test(delivery.apiUrl)) {
  for (const endpoint of ['/health', '/ready']) {
    try {
      const response = await fetch(`${delivery.apiUrl.replace(/\/$/, '')}${endpoint}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) problems.push(`${endpoint} retornou HTTP ${response.status}.`);
    } catch {
      problems.push(`API indisponível em ${endpoint}.`);
    }
  }
}
if (problems.length) {
  console.error(
    'Entrega ainda incompleta:\n' + problems.map((problem) => `- ${problem}`).join('\n'),
  );
  process.exitCode = 1;
} else
  console.log(
    'Arquivos, integrantes, evidências e health checks presentes. Confirme que as evidências correspondem aos aparelhos e ao Firebase de produção.',
  );
