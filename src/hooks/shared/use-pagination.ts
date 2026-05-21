import { useState, useCallback } from 'react'

interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
}

interface UsePaginationReturn {
  page: number
  pageSize: number
  totalPages: number
  total: number
  setPage: (page: number) => void
  setTotalPages: (totalPages: number) => void
  setTotal: (total: number) => void
  nextPage: () => void
  prevPage: () => void
  canNextPage: boolean
  canPrevPage: boolean
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 20 } = options
  const [page, setPageState] = useState(initialPage)
  const [pageSize] = useState(initialPageSize)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, Math.min(newPage, totalPages)))
  }, [totalPages])

  const nextPage = useCallback(() => {
    setPage(page + 1)
  }, [page, setPage])

  const prevPage = useCallback(() => {
    setPage(page - 1)
  }, [page, setPage])

  return {
    page,
    pageSize,
    totalPages,
    total,
    setPage,
    setTotalPages,
    setTotal,
    nextPage,
    prevPage,
    canNextPage: page < totalPages,
    canPrevPage: page > 1,
  }
}
