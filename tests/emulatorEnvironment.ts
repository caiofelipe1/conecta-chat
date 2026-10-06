export function bypassProxyForLocalEmulators() {
  // O cliente WebSocket do RTDB ignora NO_PROXY. Só nos testes locais.
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'])
      delete process.env[key];
  }
}
