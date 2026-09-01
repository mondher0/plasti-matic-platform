import type { PaginationQuery } from '@plastimatic/shared';

export function toSkipTake({ page, pageSize }: PaginationQuery) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function toPaginatedResponse<T>(items: T[], total: number, { page, pageSize }: PaginationQuery) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
