import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, get, set } from 'firebase/database';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { bypassProxyForLocalEmulators } from './emulatorEnvironment';
let env: RulesTestEnvironment;
const claims = { firebase: { sign_in_provider: 'password' } };
beforeAll(async () => {
  bypassProxyForLocalEmulators();
  env = await initializeTestEnvironment({
    projectId: 'demo-conecta',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    database: { rules: readFileSync('database.rules.json', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice'), {
      name: 'Alice',
      email: 'alice@example.com',
      phoneNumber: '11999999999',
    });
    await setDoc(doc(context.firestore(), 'users/alice/devices/device'), { token: 'secret-token' });
    await setDoc(doc(context.firestore(), 'directory/alice'), {
      uid: 'alice',
      name: 'Alice',
      photoUrl: '',
    });
    await setDoc(doc(context.firestore(), 'groups/g_test'), {
      memberIds: ['alice', 'bob'],
      ownerId: 'alice',
      memberLimit: 2,
    });
    await setDoc(doc(context.firestore(), 'directConversations/d_test'), {
      participantIds: ['alice', 'bob'],
    });
    await set(ref(context.database(), 'streams/g_test'), {
      access: { state: 'active', revision: 1, memberIds: { alice: true, bob: true } },
      messages: { sample: { senderId: 'alice', text: 'Olá', createdAt: 1 } },
    });
  });
}, 30000);
afterAll(async () => {
  await env?.cleanup();
});
describe('regras Firestore', () => {
  it('usuário não autenticado não lê diretório', async () =>
    assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'directory/alice'))));
  it('diretório autenticado não expõe telefone/e-mail', async () =>
    assertSucceeds(
      getDoc(doc(env.authenticatedContext('bob', claims).firestore(), 'directory/alice')),
    ));
  it('perfil de terceiros não pode ser lido diretamente', async () =>
    assertFails(getDoc(doc(env.authenticatedContext('bob', claims).firestore(), 'users/alice'))));
  it('proprietário lê o próprio perfil', async () =>
    assertSucceeds(
      getDoc(doc(env.authenticatedContext('alice', claims).firestore(), 'users/alice')),
    ));
  it('tokens de outra pessoa ficam privados', async () =>
    assertFails(
      getDoc(
        doc(env.authenticatedContext('bob', claims).firestore(), 'users/alice/devices/device'),
      ),
    ));
  it('não integrante não lê grupo', async () =>
    assertFails(getDoc(doc(env.authenticatedContext('eve', claims).firestore(), 'groups/g_test'))));
  it('consulta com membership é permitida', async () =>
    assertSucceeds(
      getDocs(
        query(
          collection(env.authenticatedContext('alice', claims).firestore(), 'groups'),
          where('memberIds', 'array-contains', 'alice'),
        ),
      ),
    ));
  it('mesmo proprietário não pode contornar API escrevendo grupo', async () =>
    assertFails(
      setDoc(doc(env.authenticatedContext('alice', claims).firestore(), 'groups/g_test'), {
        memberIds: ['alice', 'bob', 'eve'],
        memberLimit: 2,
      }),
    ));
  it('usuário não altera diretamente token', async () =>
    assertFails(
      setDoc(
        doc(env.authenticatedContext('alice', claims).firestore(), 'users/alice/devices/device'),
        { token: 'forged' },
      ),
    ));
  it('outro provedor é rejeitado', async () =>
    assertFails(
      getDoc(
        doc(
          env
            .authenticatedContext('alice', { firebase: { sign_in_provider: 'google.com' } })
            .firestore(),
          'users/alice',
        ),
      ),
    ));
});
describe('regras Realtime Database', () => {
  it('integrante lê mensagens', async () =>
    assertSucceeds(
      get(ref(env.authenticatedContext('alice', claims).database(), 'streams/g_test/messages')),
    ));
  it('não integrante não lê mensagens', async () =>
    assertFails(
      get(ref(env.authenticatedContext('eve', claims).database(), 'streams/g_test/messages')),
    ));
  it('não autenticado não lê mensagens', async () =>
    assertFails(get(ref(env.unauthenticatedContext().database(), 'streams/g_test/messages'))));
  it('não permite cliente forjar remetente', async () =>
    assertFails(
      set(
        ref(env.authenticatedContext('alice', claims).database(), 'streams/g_test/messages/forged'),
        { senderId: 'bob', text: 'fraude' },
      ),
    ));
  it('não permite cliente mudar ACL', async () =>
    assertFails(
      set(
        ref(
          env.authenticatedContext('eve', claims).database(),
          'streams/g_test/access/memberIds/eve',
        ),
        true,
      ),
    ));
  it('barreira e remoção negam leitura', async () => {
    await env.withSecurityRulesDisabled((context) =>
      set(ref(context.database(), 'streams/g_test/access/state'), 'updating'),
    );
    await assertFails(
      get(ref(env.authenticatedContext('bob', claims).database(), 'streams/g_test/messages')),
    );
    await env.withSecurityRulesDisabled((context) =>
      set(ref(context.database(), 'streams/g_test/access'), {
        state: 'active',
        revision: 2,
        memberIds: { alice: true },
      }),
    );
    await assertFails(
      get(ref(env.authenticatedContext('bob', claims).database(), 'streams/g_test/messages')),
    );
    await assertSucceeds(
      get(ref(env.authenticatedContext('alice', claims).database(), 'streams/g_test/messages')),
    );
  });
});
describe('regras Storage', () => {
  it('permite imagem pequena na pasta própria', async () =>
    assertSucceeds(
      uploadBytes(
        storageRef(env.authenticatedContext('alice', claims).storage(), 'users/alice/ok.jpg'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/jpeg' },
      ),
    ));
  it('não permite escrever na pasta de terceiros', async () =>
    assertFails(
      uploadBytes(
        storageRef(env.authenticatedContext('bob', claims).storage(), 'users/alice/invalid.jpg'),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' },
      ),
    ));
  it('não aceita outros tipos de arquivo', async () =>
    assertFails(
      uploadBytes(
        storageRef(env.authenticatedContext('alice', claims).storage(), 'users/alice/program.exe'),
        new Uint8Array([1]),
        { contentType: 'application/octet-stream' },
      ),
    ));
  it('não aceita foto maior que 5 MB', async () =>
    assertFails(
      uploadBytes(
        storageRef(env.authenticatedContext('alice', claims).storage(), 'users/alice/big.jpg'),
        new Uint8Array(5 * 1024 * 1024 + 1),
        { contentType: 'image/jpeg' },
      ),
    ));
});
