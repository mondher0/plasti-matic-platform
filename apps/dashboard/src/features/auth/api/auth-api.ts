import type {
  AuthResponse,
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  UpdateProfileInput,
} from '@plastimatic/shared';
import { api, uploadFile } from '@/lib/api-client';

export const authApi = {
  login: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input),
  me: () => api.get<AuthUser>('/auth/me'),
  updateProfile: (input: UpdateProfileInput) => api.patch<AuthUser>('/auth/me', input),
  changePassword: (input: ChangePasswordInput) => api.patch<AuthUser>('/auth/me/password', input),
  uploadAvatar: (file: File) => uploadFile<AuthUser>('/auth/me/avatar', file),
};
