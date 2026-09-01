import { createZodDto } from 'nestjs-zod';
import { ChangePasswordSchema, LoginSchema, RegisterSchema, UpdateProfileSchema } from '@plastimatic/shared';

export class RegisterDto extends createZodDto(RegisterSchema) {}
export class LoginDto extends createZodDto(LoginSchema) {}
export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
