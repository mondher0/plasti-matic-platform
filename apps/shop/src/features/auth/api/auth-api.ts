import type {
  AuthResponse,
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@plastimatic/shared';
import { api, uploadFile } from '@/lib/api-client';

export const authApi = {
  register: (input: RegisterInput) => api.post<AuthResponse>('/auth/register', input),
  login: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input),
  me: () => api.get<AuthUser>('/auth/me'),
  updateProfile: (input: UpdateProfileInput) => api.patch<AuthUser>('/auth/me', input),
  changePassword: (input: ChangePasswordInput) => api.patch<AuthUser>('/auth/me/password', input),
  uploadAvatar: (file: File) => uploadFile<AuthUser>('/auth/me/avatar', file),
};
