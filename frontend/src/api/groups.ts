import { apiClient } from './client';
import { Group, GroupMember } from '../types';

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface GroupResponse {
  group: Group;
}

export interface GroupsResponse {
  groups: Group[];
}

export interface MembersResponse {
  members: GroupMember[];
}

export const groupsApi = {
  // Create a new group
  create: async (data: CreateGroupRequest): Promise<Group> => {
    const response = await apiClient.post<GroupResponse>('/api/groups', data);
    return response.data.group;
  },

  // Get all groups the user is a member of
  list: async (): Promise<Group[]> => {
    const response = await apiClient.get<GroupsResponse>('/api/groups');
    return response.data.groups;
  },

  // Get a specific group
  get: async (id: string): Promise<Group> => {
    const response = await apiClient.get<GroupResponse>(`/api/groups/${id}`);
    return response.data.group;
  },

  // Update a group
  update: async (id: string, data: UpdateGroupRequest): Promise<Group> => {
    const response = await apiClient.put<GroupResponse>(`/api/groups/${id}`, data);
    return response.data.group;
  },

  // Delete a group
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/groups/${id}`);
  },

  // Join a group
  join: async (id: string): Promise<Group> => {
    const response = await apiClient.post<GroupResponse>(`/api/groups/${id}/join`);
    return response.data.group;
  },

  // Leave a group
  leave: async (id: string): Promise<void> => {
    await apiClient.post(`/api/groups/${id}/leave`);
  },

  // Get group members
  getMembers: async (id: string): Promise<GroupMember[]> => {
    const response = await apiClient.get<MembersResponse>(`/api/groups/${id}/members`);
    return response.data.members;
  },
};
