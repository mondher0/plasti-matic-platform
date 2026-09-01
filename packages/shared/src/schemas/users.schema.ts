import { z } from 'zod';
import { RoleSchema, UserStatusSchema } from './enums';
import { PaginationQuerySchema } from './common.schema';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: RoleSchema,
  status: UserStatusSchema,
  createdAt: z.coerce.date(),
  avatarUrl: z.string().url().nullable(),
  mustChangePassword: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

export const UserQuerySchema = PaginationQuerySchema.extend({
  role: RoleSchema.optional(),
  status: UserStatusSchema.optional(),
  // Matches first name, last name, or email.
  search: z.string().optional(),
});
export type UserQuery = z.infer<typeof UserQuerySchema>;

const COMPANY_EMAIL_DOMAIN = '@plasti-matic.com';

/** Admin-created dashboard accounts only — never `CUSTOMER` (that's shop
 *  self-registration, a separate flow entirely) — and restricted to the
 *  company's own email domain, so this can't be used to hand dashboard
 *  access to an outside address. */
export const CreateUserSchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => email.toLowerCase().endsWith(COMPANY_EMAIL_DOMAIN), {
      message: `Seules les adresses email de l'entreprise (${COMPANY_EMAIL_DOMAIN}) peuvent être utilisées`,
    }),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.enum(['ADMIN', 'STAFF']),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/** The plaintext temporary password is only ever present in this one
 *  response — never stored, never returned again afterward. */
export const CreateUserResponseSchema = z.object({
  user: UserSchema,
  temporaryPassword: z.string(),
});
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
