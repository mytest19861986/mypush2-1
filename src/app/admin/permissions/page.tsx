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
            مشاهده تمامی دسترسی‌های سامانه — {allPermissions.length} دسترسی در {Object.keys(groupedPermissions).length} ماژول
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(groupedPermissions).length === 0 ? (
        <EmptyState icon={FileText} title="داده‌ای یافت نشد" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(groupedPermissions).map(([module, permissions]) => (
            <Card key={module}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Key className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{PERMISSION_MODULES[module] || module}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{permissions.length} دسترسی</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <Key className="size-3.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{perm.title || perm.name}</span>
                          <p className="text-xs text-muted-foreground font-mono">{perm.name}</p>
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
