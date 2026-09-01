import { createZodDto } from 'nestjs-zod';
import { DateRangeQuerySchema } from '@plastimatic/shared';

export class DateRangeQueryDto extends createZodDto(DateRangeQuerySchema) {}
