'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  // Color mapping
  const colorMap: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    INACTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    UNDER_REVIEW: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    SUSPENDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    CONFIRMED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    EXPIRED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  // Label mapping
  const labelMap: Record<string, string> = {
    ACTIVE: 'فعال',
    INACTIVE: 'غیرفعال',
    BLOCKED: 'مسدود',
    PENDING: 'در انتظار',
    UNDER_REVIEW: 'در حال بررسی',
    APPROVED: 'تأیید شده',
    REJECTED: 'رد شده',
    SUSPENDED: 'معلق',
    CONFIRMED: 'تأیید شده',
    COMPLETED: 'تکمیل شده',
    CANCELLED: 'لغو شده',
    PAID: 'پرداخت شده',
    EXPIRED: 'منقضی شده',
  }

  return (
    <Badge
      variant="secondary"
      className={cn(colorMap[status] || 'bg-muted text-muted-foreground', className)}
    >
      {label || labelMap[status] || status}
    </Badge>
  )
}
