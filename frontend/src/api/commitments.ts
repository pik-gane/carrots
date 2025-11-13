import { apiClient } from './client';
import { Commitment, ParsedCommitment, NLPParseResponse } from '../types';

export interface CreateCommitmentRequest {
  groupId: string;
  parsedCommitment: ParsedCommitment;
  naturalLanguageText?: string;
}

export interface UpdateCommitmentRequest {
  parsedCommitment?: ParsedCommitment;
  naturalLanguageText?: string;
}

export interface CommitmentsResponse {
  commitments: Commitment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CommitmentQueryParams {
  groupId?: string;
  userId?: string;
  status?: 'active' | 'revoked';
  page?: number;
  limit?: number;
}

export const commitmentsApi = {
  // Parse natural language commitment
  parse: async (data: { naturalLanguageText: string; groupId: string }): Promise<NLPParseResponse> => {
    const response = await apiClient.post<NLPParseResponse>('/api/commitments/parse', data);
    return response.data;
  },

  // Create a new commitment
  create: async (data: CreateCommitmentRequest): Promise<Commitment> => {
    const response = await apiClient.post<Commitment>('/api/commitments', data);
    return response.data;
  },

  // Get commitments with optional filters
  list: async (params?: CommitmentQueryParams): Promise<CommitmentsResponse> => {
    const response = await apiClient.get<CommitmentsResponse>('/api/commitments', { params });
    return response.data;
  },

  // Get a specific commitment
  get: async (id: string): Promise<Commitment> => {
    const response = await apiClient.get<Commitment>(`/api/commitments/${id}`);
    return response.data;
  },

  // Update a commitment
  update: async (id: string, data: UpdateCommitmentRequest): Promise<Commitment> => {
    const response = await apiClient.put<Commitment>(`/api/commitments/${id}`, data);
    return response.data;
  },

  // Revoke a commitment
  revoke: async (id: string): Promise<Commitment> => {
    const response = await apiClient.delete<Commitment>(`/api/commitments/${id}`);
    return response.data;
  },
};
