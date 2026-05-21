'use client'

import { useEffect, useState } from 'react'
import { Settings, ChevronDown, ChevronUp, Users, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, EmptyState } from '@/components/shared'
import { rolesService } from '@/services'
import type { RoleItem } from '@/types'
import { PERMISSION_MODULES } from '@/constants'

export default function AdminRolesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await rolesService.getList()
        if (res.success && res.data) {
          setRoles(res.data)
        }
      } catch {
        toast({ title: 'خطا', description: 'خطا در دریافت لیست نقش‌ها', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchRoles()
  }, [toast])

  const groupPermissions = (permissions: RoleItem['permissions']) => {
    if (!permissions) return {}
    const groups: Record<string, typeof permissions> = {}
    for (const perm of permissions) {
      if (!groups[perm.module]) groups[perm.module] = []
      groups[perm.module].push(perm)
    }
    return groups
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت نقش‌ها"
        description={
          <>
            مشاهده نقش‌ها و دسترسی‌های سامانه — {roles.length} نقش
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState icon={Settings} title="داده‌ای یافت نشد" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id
            const permGroups = groupPermissions(role.permissions)
            return (
              <Card key={role.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                        <Shield className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{role.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{role.name}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      <span>{role.userCount ?? 0} کاربر</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="size-3.5" />
                      <span>{role.permissions?.length ?? 0} دسترسی</span>
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="ml-1 size-3.5" />
                        بستن دسترسی‌ها
                      </>
                    ) : (
                      <>
                        <ChevronDown className="ml-1 size-3.5" />
                        مشاهده دسترسی‌ها
                      </>
                    )}
                  </Button>
                  {isExpanded && (
                    <div className="space-y-3 border-t pt-3">
                      {Object.keys(permGroups).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">بدون دسترسی</p>
                      ) : (
                        Object.entries(permGroups).map(([module, perms]) => (
                          <div key={module}>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                              {PERMISSION_MODULES[module] || module}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map((perm) => (
                                <Badge key={perm.id} variant="secondary" className="text-xs font-normal">
                                  {perm.title || perm.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
