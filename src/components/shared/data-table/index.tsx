'use client'

import { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, ChevronLeft, Inbox } from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'

export interface Column<T> {
  key: string
  header: string
  className?: string
  hidden?: boolean
  hiddenOn?: 'sm' | 'md' | 'lg'
  render?: (row: T, index: number) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  emptyIcon?: ReactNode
  page?: number
  totalPages?: number
  total?: number
  onPageChange?: (page: number) => void
  rowKey?: (row: T) => string
  rowClassName?: string
  actions?: (row: T) => ReactNode
  actionsHeader?: string
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = 'داده‌ای یافت نشد',
  emptyIcon,
  page = 1,
  totalPages = 1,
  total,
  onPageChange,
  rowKey,
  rowClassName,
  actions,
  actionsHeader = 'عملیات',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        {emptyIcon || <Inbox className="mb-3 size-12 text-muted-foreground/50" />}
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => {
                if (col.hidden) return null
                return (
                  <TableHead
                    key={col.key}
                    className={col.hiddenOn ? `hidden ${col.hiddenOn}:table-cell` : undefined}
                  >
                    {col.header}
                  </TableHead>
                )
              })}
              {actions && (
                <TableHead className="text-left">{actionsHeader}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow
                key={rowKey ? rowKey(row) : String(idx)}
                className={`${rowClassName || 'group'}`}
              >
                {columns.map((col) => {
                  if (col.hidden) return null
                  const value = (row as Record<string, unknown>)[col.key]
                  return (
                    <TableCell
                      key={col.key}
                      className={col.hiddenOn ? `hidden ${col.hiddenOn}:table-cell` : col.className}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : value != null
                          ? String(value)
                          : '—'}
                    </TableCell>
                  )
                })}
                {actions && (
                  <TableCell className="text-left">
                    {actions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      {total !== undefined && (
        <span className="text-sm text-muted-foreground">
          {toPersianNum(total)} مورد
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          صفحه {toPersianNum(page)} از {toPersianNum(totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight className="ml-1 size-4" />
          قبلی
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          بعدی
          <ChevronLeft className="mr-1 size-4" />
        </Button>
      </div>
    </div>
  )
}
