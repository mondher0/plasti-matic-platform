import { z } from 'zod';
import { RoleSchema } from './enums';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().url().nullable(),
  // True for an admin-created account until its first real password change
  // — the dashboard blocks every other route while this is true (see
  // ProtectedRoute), never set for a self-registered shop customer.
  mustChangePassword: z.boolean(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: AuthUserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const UpdateUserRoleSchema = z.object({
  role: RoleSchema,
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
