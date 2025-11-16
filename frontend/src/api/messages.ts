import axios from 'axios';
import { Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const messagesApi = {
  /**
   * Send a message to a group
   */
  send: async (groupId: string, content: string): Promise<Message> => {
    const response = await axios.post<{ message: Message }>(
      `${API_URL}/api/messages`,
      { groupId, content },
      { withCredentials: true }
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

    const response = await axios.get<{ messages: Message[] }>(
      `${API_URL}/api/messages`,
      {
        params,
        withCredentials: true,
      }
    );
    return response.data.messages;
  },
};
