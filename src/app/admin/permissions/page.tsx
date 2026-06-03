'use client'

import { useEffect, useState } from 'react'
import { FileText, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, EmptyState } from '@/components/shared'
import { apiClient } from '@/lib/api-client'
import { PERMISSION_MODULES } from '@/constants'
import type { PermissionItem } from '@/types'
import { toPersianNum } from '@/utils/formatters'

interface PermissionsGroup { [module: string]: PermissionItem[] }

export default function AdminPermissionsPage() {
  const { toast } = useToast()
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([])
  const [groupedPermissions, setGroupedPermissions] = useState<PermissionsGroup>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await apiClient.get<{ all: PermissionItem[]; grouped: PermissionsGroup }>('/permissions')
        if (res.success && res.data) {
          setAllPermissions(res.data.all)
          setGroupedPermissions(res.data.grouped)
        }
      } catch {
        toast({ title: 'خطا', description: 'خطا در دریافت لیست دسترسی‌ها', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchPermissions()
  }, [toast])

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت دسترسی‌ها"
        description={
          <>
            مشاهده و مدیریت مجوزهای قابل تخصیص به نقش‌های سامانه
            {!isLoading && (
              <span className="mr-1 font-semibold text-emerald-600">
                {toPersianNum(allPermissions.length)} دسترسی در{' '}
                {toPersianNum(Object.keys(groupedPermissions).length)} ماژول
              </span>
            )}
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border border-border/50 bg-card shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(groupedPermissions).length === 0 ? (
        <Card className="rounded-2xl border border-border/50 bg-card shadow-sm">
          <CardContent className="py-12">
            <EmptyState icon={FileText} title="داده‌ای یافت نشد" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(groupedPermissions).map(([module, permissions]) => (
            <Card
              key={module}
              className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
            >
              <CardHeader className="border-b border-border/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Key className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {PERMISSION_MODULES[module] || module}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {toPersianNum(permissions.length)} دسترسی
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Key className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <span className="block truncate font-medium">
                            {perm.title || perm.name}
                          </span>
                          <p className="mt-1 truncate font-mono text-xs text-muted-foreground" dir="ltr">
                            {perm.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
