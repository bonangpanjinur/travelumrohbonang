import { useState, useCallback } from "react";

export function useDeleteConfirm() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteExtra, setDeleteExtra] = useState<string | null>(null);

  const requestDelete = useCallback((id: string, extra?: string) => {
    setDeleteId(id);
    setDeleteExtra(extra ?? null);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteId(null);
    setDeleteExtra(null);
  }, []);

  const confirmDelete = useCallback((callback: (id: string, extra?: string) => void) => {
    if (deleteId) {
      callback(deleteId, deleteExtra ?? undefined);
    }
    setDeleteId(null);
    setDeleteExtra(null);
  }, [deleteId, deleteExtra]);

  return {
    deleteId,
    deleteExtra,
    isDeleteOpen: deleteId !== null,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
