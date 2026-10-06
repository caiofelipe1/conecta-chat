import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

export function createFirebaseServices() {
  const emulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!projectId || !databaseURL)
    throw new Error('Configure FIREBASE_PROJECT_ID e FIREBASE_DATABASE_URL.');
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!emulator && (!clientEmail || !privateKey))
    throw new Error('Configure a credencial administrativa exclusivamente no servidor.');
  const app =
    getApps()[0] ??
    initializeApp({
      projectId,
      databaseURL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      ...(emulator ? {} : { credential: cert({ projectId, clientEmail, privateKey }) }),
    });
  return {
    auth: getAuth(app),
    firestore: getFirestore(app),
    database: getDatabase(app),
    messaging: getMessaging(app),
  };
}
export type FirebaseServices = ReturnType<typeof createFirebaseServices>;
