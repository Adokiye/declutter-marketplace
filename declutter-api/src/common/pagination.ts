import { Model, Page } from "objection";

export type PaginationQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
};

export type PaginatedResult<T> = {
  results: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export function normalizePagination(query: PaginationQuery) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

export function toPaginated<T extends Model>(pageResult: Page<T>, page: number, limit: number): PaginatedResult<T> {
  const totalPages = Math.max(Math.ceil(pageResult.total / limit), 1);
  const meta = {
    page,
    limit,
    total: pageResult.total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
  return {
    results: pageResult.results,
    ...meta,
    // Aliases for tooling that expects { data, pagination } shape.
    data: pageResult.results,
    pagination: meta
  } as PaginatedResult<T> & { data: T[]; pagination: typeof meta };
}
