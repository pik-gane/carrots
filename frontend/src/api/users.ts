import { apiClient } from './client';
import { User } from '../types';

export interface UpdateUserRequest {
  username?: string;
  email?: string;
}

export interface UpdateUserResponse {
  message: string;
  user: User;
}

export interface GetUserResponse {
  user: User;
}

export const usersApi = {
  // Get user by ID
  getUser: async (userId: string): Promise<User> => {
    const response = await apiClient.get<GetUserResponse>(`/api/users/${userId}`);
    return response.data.user;
  },

  // Update user profile
  updateUser: async (userId: string, data: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.put<UpdateUserResponse>(`/api/users/${userId}`, data);
    return response.data.user;
  },

  // Delete user account
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/users/${userId}`);
  },
};
