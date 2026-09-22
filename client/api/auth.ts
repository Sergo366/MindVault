import apiClient from '@/lib/api-client';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface AuthCredentials {
  email: string;
  password?: string;
  confirmPassword?: string;
}

export const authApi = {
  signin: async (data: AuthCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signin', data);
    return response.data;
  },
  
  signup: async (data: AuthCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    return response.data;
  },
};
