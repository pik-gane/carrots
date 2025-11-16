import { apiClient } from './client';
import { Message } from '../types';

export const messagesApi = {
  /**
   * Send a message to a group
   */
  send: async (groupId: string, content: string): Promise<Message> => {
    const response = await apiClient.post<{ message: Message }>(
      '/api/messages',
      { groupId, content }
    );
    return response.data.message;
  },

  /**
   * Get messages for a group
   */
  list: async (groupId: string, limit?: number, before?: string): Promise<Message[]> => {
    const params: any = { groupId };
    if (limit) params.limit = limit;
    if (before) params.before = before;

    const response = await apiClient.get<{ messages: Message[] }>(
      '/api/messages',
      { params }
    );
    return response.data.messages;
  },
};
