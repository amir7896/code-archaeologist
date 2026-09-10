import { type PageQuery, type Paginated } from './types';

export async function* iteratePages<T>(
  load: (query: Required<PageQuery>) => Promise<Paginated<T>>,
  start: PageQuery = {},
): AsyncGenerator<T, void, void> {
  let page = Math.max(1, start.page ?? 1);
  const limit = Math.min(100, Math.max(1, start.limit ?? 20));

  while (true) {
    const result = await load({ page, limit });
    for (const item of result.items) {
      yield item;
    }
    if (page >= result.pagination.totalPages || result.items.length === 0) {
      return;
    }
    page += 1;
  }
}

export function emptyPage<T>(query: PageQuery = {}): Paginated<T> {
  return {
    items: [],
    pagination: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      total: 0,
      totalPages: 1,
    },
  };
}
