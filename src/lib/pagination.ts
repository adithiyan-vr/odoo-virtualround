import { PaginationMeta } from './api-envelope';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  q?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(request: Request | URL): PaginationParams {
  const url = request instanceof Request ? new URL(request.url) : request;
  const searchParams = url.searchParams;

  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const rawPageSize = parseInt(
    searchParams.get('pageSize') || searchParams.get('limit') || `${DEFAULT_PAGE_SIZE}`,
    10
  );

  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, isNaN(rawPageSize) ? DEFAULT_PAGE_SIZE : rawPageSize));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const q = searchParams.get('q') || searchParams.get('search') || undefined;

  let sortBy: string | undefined = undefined;
  let sortOrder: 'asc' | 'desc' = 'desc';

  const sortParam = searchParams.get('sort');
  if (sortParam) {
    const [field, direction] = sortParam.split(':');
    sortBy = field;
    if (direction?.toLowerCase() === 'asc') {
      sortOrder = 'asc';
    }
  }

  return {
    page,
    pageSize,
    skip,
    take,
    q: q?.trim(),
    sortBy,
    sortOrder,
  };
}

export function buildPaginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
