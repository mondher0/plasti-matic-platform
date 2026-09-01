import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { useAuth } from '@/features/auth/auth-context';

/** Profile-field edit — refreshes the in-memory user (header name/email)
 *  immediately on success, no re-login needed. */
export function useUpdateProfile() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: updateUser,
  });
}

/** Also clears `mustChangePassword` on success (see auth.service.ts) —
 *  refreshing the in-memory user here is what makes a forced-password-change
 *  redirect (ProtectedRoute) release immediately, no reload/re-login. */
export function useChangePassword() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: updateUser,
  });
}

/** Uploads immediately on file selection and saves in the same request —
 *  there's no separate "Save" step for the photo, see avatar-upload.tsx. */
export function useUploadAvatar() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: authApi.uploadAvatar,
    onSuccess: updateUser,
  });
}
