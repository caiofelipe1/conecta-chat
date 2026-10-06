import { createFirebaseServices } from './firebaseAdmin.js';
import { groupSchema } from '../../shared/domain.js';
// Executar somente após parar TODAS as réplicas da API. Não há tomada automática de locks.
if (process.env.API_STOPPED_FOR_RECOVERY !== 'true')
  throw new Error('Pare todas as réplicas e configure API_STOPPED_FOR_RECOVERY=true.');
const id = process.argv[2];
if (!id || !/^g_[A-Za-z0-9-]+$/.test(id)) throw new Error('Informe o ID do grupo.');
const firebase = createFirebaseServices();
const lock = await firebase.firestore.doc(`conversationLocks/${id}`).get();
if (!lock.exists) throw new Error('Nenhuma operação pendente neste grupo.');
await firebase.database.ref(`streams/${id}/access/state`).set('updating');
const group = await firebase.firestore.doc(`groups/${id}`).get();
if (group.exists) {
  const current = groupSchema.parse(group.data());
  await firebase.database
    .ref(`streams/${id}/access`)
    .set({
      state: 'active',
      revision: current.revision,
      memberIds: Object.fromEntries(current.memberIds.map((uid) => [uid, true])),
    });
} else await firebase.database.ref(`streams/${id}`).remove();
await lock.ref.delete();
console.log('Grupo reconciliado. A API pode ser reiniciada.');
process.exit(0);
