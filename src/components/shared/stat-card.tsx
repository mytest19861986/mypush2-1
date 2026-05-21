'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: { value: number; isUp: boolean }
  className?: string
  iconClassName?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconClassName = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
}: StatCardProps) {
  const displayValue = typeof value === 'number' ? toPersianNum(value) : value

  return (
    <Card className={cn('border-0 shadow-sm overflow-hidden relative', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{displayValue}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.isUp ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trend.isUp ? '↑' : '↓'} {toPersianNum(Math.abs(trend.value))}٪
              </p>
            )}
          </div>
          <div className={cn('flex size-12 items-center justify-center rounded-xl shrink-0', iconClassName)}>
            <Icon className="size-6" />
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-l from-primary/20 to-transparent" />
    </Card>
  )
}
