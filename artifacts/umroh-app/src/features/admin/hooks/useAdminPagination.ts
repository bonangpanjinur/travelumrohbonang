import { useState, useMemo } from "react";

const DEFAULT_PAGE_SIZE = 20;

export function useAdminPagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(items.length / pageSize);
  const paginatedItems = useMemo(
    () => items.slice(page * pageSize, (page + 1) * pageSize),
    [items, page, pageSize]
  );

  const resetPage = () => setPage(0);

  return {
    page,
    setPage,
    totalPages,
    totalCount: items.length,
    paginatedItems,
    pageSize,
    resetPage,
  };
}
