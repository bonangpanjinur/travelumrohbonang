import { useState, useMemo } from "react";

const PAGE_SIZE = 20;

export function useAdminPagination<T>(items: T[]) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const paginatedItems = useMemo(
    () => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [items, page]
  );

  const resetPage = () => setPage(0);

  return {
    page,
    setPage,
    totalPages,
    totalCount: items.length,
    paginatedItems,
    pageSize: PAGE_SIZE,
    resetPage,
  };
}
