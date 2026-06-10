'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Settings, ChevronDown, ChevronUp, Users, Shield, Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, EmptyState } from '@/components/shared'
import { ApiError } from '@/lib/api-client'
import { rolesService } from '@/services'
import type { RoleItem } from '@/types'
import { PERMISSION_MODULES } from '@/constants'

interface RoleFormData {
  name: string
  title: string
  description: string
}

const emptyRoleForm: RoleFormData = {
  name: '',
  title: '',
  description: '',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function normalizeRoleName(name: string) {
  const trimmed = name.trim()
  return /^[a-z0-9_]+$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed
}

export default function AdminRolesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<RoleFormData>(emptyRoleForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await rolesService.getList()
        if (res.success && res.data) {
          setRoles(Array.isArray(res.data) ? res.data : [])
        }
      } catch {
        toast({ title: 'خطا', description: 'خطا در دریافت لیست نقش‌ها', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchRoles()
  }, [toast])

  const refreshRoles = useCallback(async () => {
    const res = await rolesService.getList()
    if (res.success && res.data) {
      setRoles(Array.isArray(res.data) ? res.data : [])
    }
  }, [])

  const openCreateDialog = () => {
    setFormData(emptyRoleForm)
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (isSaving) return
    setDialogOpen(open)
  }

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = normalizeRoleName(formData.name)
    const title = formData.title.trim()
    const description = formData.description.trim()

    if (!name) {
      toast({ title: 'خطا', description: 'نام سیستمی نقش الزامی است', variant: 'destructive' })
      return
    }

    if (!title) {
      toast({ title: 'خطا', description: 'عنوان نمایشی نقش الزامی است', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      await rolesService.create({
        name,
        title,
        description: description || undefined,
      })
      toast({ title: 'موفق', description: 'نقش جدید با موفقیت ایجاد شد' })
      setDialogOpen(false)
      setFormData(emptyRoleForm)
      await refreshRoles()
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ایجاد نقش جدید'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

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

      <div className="flex justify-end">
        <Button onClick={openCreateDialog} className="w-full gap-2 sm:w-auto">
          <Plus className="size-4" />
          افزودن نقش
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent dir="rtl" className="sm:max-w-xl">
          <form onSubmit={handleCreateRole} className="space-y-5">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle>افزودن نقش</DialogTitle>
              <DialogDescription>
                بعد از ساخت نقش، در مرحله بعد می‌توانید دسترسی‌های آن را تنظیم کنید.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">نام سیستمی نقش</Label>
                <Input
                  id="role-name"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="مثلا SUPPORT_MANAGER"
                  autoComplete="off"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  فقط حروف انگلیسی، اعداد و زیرخط مجاز است — مثلا SUPPORT_MANAGER
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-title">عنوان نمایشی نقش</Label>
                <Input
                  id="role-title"
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="مثلا مدیر پشتیبانی"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">توضیحات</Label>
                <Textarea
                  id="role-description"
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="توضیح کوتاه درباره کاربرد این نقش"
                  disabled={isSaving}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-start">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                ایجاد نقش
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setDialogOpen(false)}
              >
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border border-border/50 bg-card shadow-sm">
              <CardHeader className="p-5 pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent className="p-5 pt-0">
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
              <Card
                key={role.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Shield className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{role.title}</CardTitle>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{role.name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3 p-5 pt-0">
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/30 p-3 text-sm text-muted-foreground">
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
                    className="h-9 w-full justify-between rounded-xl px-3 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                  >
                    {isExpanded ? (
                      <>
                        <span>بستن دسترسی‌ها</span>
                        <ChevronUp className="size-3.5" />
                      </>
                    ) : (
                      <>
                        <span>مشاهده دسترسی‌ها</span>
                        <ChevronDown className="size-3.5" />
                      </>
                    )}
                  </Button>
                  {isExpanded && (
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                      {Object.keys(permGroups).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">بدون دسترسی</p>
                      ) : (
                        Object.entries(permGroups).map(([module, perms]) => (
                          <div key={module} className="space-y-2">
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
