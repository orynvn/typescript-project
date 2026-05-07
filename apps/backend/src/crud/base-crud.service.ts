export type PaginationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export class BaseCrudService {
  protected buildPagination(query: PaginationQuery): { skip: number; take: number } {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    return {
      skip: (page - 1) * limit,
      take: limit
    };
  }
}
