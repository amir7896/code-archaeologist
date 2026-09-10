import { resolvePagination } from './pagination.dto';

describe('resolvePagination', () => {
  it('coerces query-string page and limit to integers', () => {
    expect(resolvePagination({ page: '1' as unknown as number, limit: '100' as unknown as number })).toEqual({
      page: 1,
      limit: 100,
    });
  });

  it('falls back to defaults for missing values', () => {
    expect(resolvePagination({} as never)).toEqual({ page: 1, limit: 20 });
  });
});
