import { createZodDto } from 'nestjs-zod';
import { UserQuerySchema } from '@plastimatic/shared';

export class UserQueryDto extends createZodDto(UserQuerySchema) {}
