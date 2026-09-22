import { useMutation, useQuery } from '@tanstack/react-query';
import { userApi, UpdateProfileDto } from '@/api/user';

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userApi.getProfile(),
  });
};

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: (data: UpdateProfileDto) => userApi.updateProfile(data),
  });
};
