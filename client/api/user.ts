import apiClient from '@/lib/api-client';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  UAH = 'UAH',
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  fullName: string | null;
  birthday: string | null;
  gender: Gender | null;
  profileImg: string | null;
  location: string | null;
  currencyPreference: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  name?: string;
  surname?: string;
  fullName?: string;
  birthday?: string;
  gender?: Gender;
  profileImg?: string;
  location?: string;
  currencyPreference?: Currency;
}

export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/user/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<UpdateProfileDto>): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>('/user/update', data);
    return response.data;
  },

  getProfilePhotoUploadUrl: async (filename: string, contentType: string): Promise<{ uploadUrl: string; fileUrl: string }> => {
    const response = await apiClient.get<{ uploadUrl: string; fileUrl: string }>('/user/upload-url', {
      params: { filename, contentType },
    });
    return response.data;
  },

  deleteProfilePhoto: async (): Promise<void> => {
    await apiClient.delete('/user/profile-photo');
  },
};
