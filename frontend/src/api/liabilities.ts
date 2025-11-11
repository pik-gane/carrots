import { apiClient } from './client';
import { Liability } from '../types';

export interface LiabilitiesResponse {
  liabilities: Liability[];
  calculatedAt: string;
}

export interface UserLiabilitiesResponse {
  liabilities: Array<{
    id: string;
    groupId: string;
    groupName: string;
    action: string;
    amount: number;
    unit: string;
    calculatedAt: string;
    effectiveCommitmentIds: string[];
  }>;
}

export const liabilitiesApi = {
  // Get liabilities for all users in a group
  getGroupLiabilities: async (groupId: string): Promise<LiabilitiesResponse> => {
    const response = await apiClient.get<LiabilitiesResponse>(`/api/groups/${groupId}/liabilities`);
    return response.data;
  },

  // Get liabilities for a specific user
  getUserLiabilities: async (userId: string, groupId?: string): Promise<UserLiabilitiesResponse> => {
    const params = groupId ? { groupId } : undefined;
    const response = await apiClient.get<UserLiabilitiesResponse>(`/api/users/${userId}/liabilities`, { params });
    return response.data;
  },
};
