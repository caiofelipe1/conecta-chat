import { groupSchema, type GroupInput } from '../../shared/domain';
import { apiRequest } from './api';
export const createGroup = (group: GroupInput) => apiRequest('/groups', 'POST', group, groupSchema);
export const updateGroup = (id: string, group: GroupInput, revision: number) =>
  apiRequest(`/groups/${id}`, 'PUT', { group, expectedRevision: revision }, groupSchema);
