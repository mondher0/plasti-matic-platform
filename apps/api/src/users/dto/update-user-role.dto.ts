import { createZodDto } from 'nestjs-zod';
import { UpdateUserRoleSchema } from '@plastimatic/shared';

export class UpdateUserRoleDto extends createZodDto(UpdateUserRoleSchema) {}
