import { createApp } from './app.js';
import { FirebaseBackend } from './backend.js';
import { createFirebaseServices } from './firebaseAdmin.js';
const backend = new FirebaseBackend(createFirebaseServices());
const app = createApp(backend);
const port = Number(process.env.PORT ?? '3000');
const server = app.listen(port, '0.0.0.0', () =>
  console.log(`conecta-chat-api listening on ${port}`),
);
process.on('SIGTERM', () => server.close(() => process.exit(0)));
