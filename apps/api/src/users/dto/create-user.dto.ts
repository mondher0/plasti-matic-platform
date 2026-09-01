import { createZodDto } from 'nestjs-zod';
import { CreateUserSchema } from '@plastimatic/shared';

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
