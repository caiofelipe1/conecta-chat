import { z } from 'zod';
import { directorySchema, userSchema, type ProfileInput } from '../../shared/domain';
import { apiRequest } from './api';
export const fetchUsers = () => apiRequest('/users', 'GET', undefined, z.array(directorySchema));
export const fetchProfile = (uid: string) =>
  apiRequest(`/users/${uid}`, 'GET', undefined, userSchema);
export const saveProfile = (input: ProfileInput) =>
  apiRequest('/users/me', 'POST', input, userSchema);
