import { getIdToken } from '@react-native-firebase/auth';
import type { z } from 'zod';
import { auth } from './firebase';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiRequest<T>(
  path: string,
  method: string = 'GET',
  body?: unknown,
  schema?: z.ZodType<T>,
): Promise<T> {
  const user = auth().currentUser;
  if (!user) throw new ApiError(401, 'Entre na sua conta.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const request = async (refresh: boolean) =>
      fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${await getIdToken(user, refresh)}`,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
    let response = await request(false);
    if (response.status === 401) response = await request(true);
    if (response.status === 204) return undefined as T;
    const data: unknown = await response.json();
    if (!response.ok) {
      const error =
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof data.error === 'string'
          ? data.error
          : 'Não foi possível concluir a solicitação.';
      throw new ApiError(response.status, error);
    }
    return schema ? schema.parse(data) : (data as T);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(
      'Falha de conexão ou resposta inválida. Verifique sua internet e tente novamente.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
export function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'Use uma senha de pelo menos seis caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
    'auth/network-request-failed': 'Verifique sua conexão.',
    'database/permission-denied':
      'Acesso indisponível. O grupo pode estar sendo atualizado ou você foi removido.',
    'firestore/permission-denied': 'Você não tem acesso a estes dados.',
    'storage/unauthorized': 'Você não pode enviar esta foto.',
  };
  return (
    messages[code] ??
    (error instanceof Error && !code
      ? error.message
      : 'Não foi possível concluir. Tente novamente.')
  );
}
