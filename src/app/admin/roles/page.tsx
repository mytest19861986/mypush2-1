'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Users,
  Shield,
  ShieldCheck,
  Plus,
  Loader2,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
import { ApiError, apiClient } from '@/lib/api-client'
import { rolesService } from '@/services'
import type { PermissionItem, RoleItem } from '@/types'
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

const PROTECTED_PERMISSION_ROLES = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'SUPERADMIN',
  'USER',
  'AGENT',
  'DOCTOR',
])

const PROTECTED_ROLE_NOTICE = 'برای نقش‌های مدیریتی اصلی، تغییر دسترسی از این بخش غیرفعال است.'
const BASE_ROLE_NOTICE = 'این نقش پایه است و تغییر دسترسی آن می‌تواند روی کاربران زیادی اثر بگذارد.'
const SESSION_NOTICE =
  'برای اعمال کامل تغییرات، کاربران دارای این نقش باید دوباره وارد حساب شوند.'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === 'FORBIDDEN' || error.status === 403) {
      return 'شما دسترسی مدیریت دسترسی‌ها را ندارید.'
    }
    if (error.message) return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function normalizeRoleName(name: string) {
  const trimmed = name.trim()
  return /^[a-z0-9_]+$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed
}

function canonicalizeRoleName(name: string) {
  return name.trim().replace(/\s+/g, '_').toUpperCase()
}

function isProtectedPermissionRole(roleName: string) {
  return PROTECTED_PERMISSION_ROLES.has(canonicalizeRoleName(roleName))
}

function getPermissionNotice(roleName: string) {
  const normalized = canonicalizeRoleName(roleName)
  if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN' || normalized === 'SUPERADMIN') {
    return PROTECTED_ROLE_NOTICE
  }
  return BASE_ROLE_NOTICE
}

function groupPermissionsByModule(permissions: PermissionItem[]) {
  return permissions.reduce<Record<string, PermissionItem[]>>((groups, permission) => {
    if (!groups[permission.module]) {
      groups[permission.module] = []
    }
    groups[permission.module].push(permission)
    return groups
  }, {})
}

export default function AdminRolesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<RoleFormData>(emptyRoleForm)
  const [isSaving, setIsSaving] = useState(false)

  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null)
  const [permissionOptions, setPermissionOptions] = useState<PermissionItem[]>([])
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false)
  const [isPermissionsSaving, setIsPermissionsSaving] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const groupedPermissionOptions = useMemo(
    () => groupPermissionsByModule(permissionOptions),
    [permissionOptions]
  )

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await rolesService.getList()
        if (res.success && res.data) {
          setRoles(Array.isArray(res.data) ? res.data : [])
        }
      } catch {
        toast({ title: 'خطا', description: 'خطا در دریافت فهرست نقش‌ها', variant: 'destructive' })
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

  useEffect(() => {
    if (!permissionDialogOpen || !selectedRole) {
      return
    }

    let active = true

    async function fetchPermissions() {
      setIsPermissionsLoading(true)
      setPermissionError(null)

      try {
        const res = await apiClient.get<{ all: PermissionItem[] }>('/permissions')

        if (!res.success || !res.data) {
          const message =
            res.error?.code === 'FORBIDDEN'
              ? 'شما دسترسی مدیریت دسترسی‌ها را ندارید.'
              : res.error?.message || 'خطا در دریافت دسترسی‌ها'
          throw new Error(message)
        }

        if (!active) return
        setPermissionOptions(Array.isArray(res.data.all) ? res.data.all : [])
      } catch (error) {
        if (!active) return

        const message = getErrorMessage(error, 'خطا در دریافت دسترسی‌ها')
        setPermissionOptions([])
        setPermissionError(message)
        toast({ title: 'خطا', description: message, variant: 'destructive' })
      } finally {
        if (active) {
          setIsPermissionsLoading(false)
        }
      }
    }

    void fetchPermissions()

    return () => {
      active = false
    }
  }, [permissionDialogOpen, selectedRole, toast])

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

  const openPermissionDialog = (role: RoleItem) => {
    setSelectedRole(role)
    setSelectedPermissionIds(role.permissions?.map((permission) => permission.id) ?? [])
    setPermissionOptions([])
    setPermissionError(null)
    setPermissionDialogOpen(true)
  }

  const handlePermissionDialogOpenChange = (open: boolean) => {
    if (isPermissionsSaving) return
    setPermissionDialogOpen(open)

    if (!open) {
      setSelectedRole(null)
      setPermissionOptions([])
      setSelectedPermissionIds([])
      setPermissionError(null)
      setIsPermissionsLoading(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId]
    )
  }

  const handleSavePermissions = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedRole) return
    if (isProtectedPermissionRole(selectedRole.name)) return

    setIsPermissionsSaving(true)
    try {
      await rolesService.updatePermissions(
        selectedRole.id,
        Array.from(new Set(selectedPermissionIds))
      )

      toast({
        title: 'موفق',
        description: 'دسترسی‌های نقش با موفقیت به‌روزرسانی شد.',
      })

      setPermissionDialogOpen(false)
      setSelectedRole(null)
      setPermissionOptions([])
      setSelectedPermissionIds([])
      setPermissionError(null)
      void refreshRoles()
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ذخیره دسترسی‌ها'),
        variant: 'destructive',
      })
    } finally {
      setIsPermissionsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت نقش‌ها"
        description={
          <>
            مشاهده نقش‌ها و دسترسی‌های سازمانی — {roles.length} نقش
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
                  فقط حروف انگلیسی، عدد و زیرخط مجاز است — مثلا SUPPORT_MANAGER
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
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="توضیح کوتاه درباره کاربری این نقش"
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

      <Dialog open={permissionDialogOpen} onOpenChange={handlePermissionDialogOpenChange}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-hidden p-0 sm:max-w-3xl">
          <form onSubmit={handleSavePermissions} className="flex max-h-[90vh] flex-col">
            <div className="border-b border-border/60 px-6 pb-4 pt-6">
              <DialogHeader className="items-end text-right sm:text-right">
                <DialogTitle>مدیریت دسترسی‌های نقش</DialogTitle>
                <DialogDescription className="space-y-1 text-right">
                  <span className="block font-medium text-foreground">
                    {selectedRole?.title || 'نقش انتخاب‌شده'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {selectedRole?.name || ''}
                  </span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-hidden px-6 py-4">
              {isPermissionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-border/60 bg-muted/20 p-4"
                    >
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-3 h-3 w-64" />
                      <Skeleton className="mt-4 h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : permissionError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {permissionError}
                </div>
              ) : (
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-4 pl-1">
                    {Object.keys(groupedPermissionOptions).length === 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                        دسترسی‌ای برای نمایش وجود ندارد.
                      </div>
                    ) : (
                      Object.entries(groupedPermissionOptions).map(([module, permissions]) => (
                        <section
                          key={module}
                          className="space-y-3 rounded-2xl border border-border/60 bg-muted/15 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {PERMISSION_MODULES[module] || module}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {permissions.length} دسترسی
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            {permissions.map((permission) => {
                              const checked = selectedPermissionIds.includes(permission.id)
                              const disabled =
                                isPermissionsSaving ||
                                isPermissionsLoading ||
                                (selectedRole ? isProtectedPermissionRole(selectedRole.name) : false)

                              return (
                                <label
                                  key={permission.id}
                                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-3 transition-colors hover:bg-muted/40 has-[:checked]:border-primary/40"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => togglePermission(permission.id)}
                                    disabled={disabled}
                                    className="mt-0.5"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <span className="block min-w-0 break-words text-sm font-medium text-foreground">
                                      {permission.title || permission.name}
                                    </span>
                                    {permission.description ? (
                                      <p className="text-xs leading-relaxed text-muted-foreground">
                                        {permission.description}
                                      </p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                      {permission.name}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="border-t border-border/60 px-6 py-4">
              <div className="mb-4 rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                {selectedRole && isProtectedPermissionRole(selectedRole.name) ? (
                  <div className="flex items-start gap-2">
                    <Lock className="mt-0.5 size-3.5 shrink-0" />
                    <span>{getPermissionNotice(selectedRole.name)}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                    <span>{SESSION_NOTICE}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="submit"
                  disabled={
                    !selectedRole ||
                    isProtectedPermissionRole(selectedRole.name) ||
                    isPermissionsLoading ||
                    isPermissionsSaving
                  }
                  className="gap-2"
                >
                  {isPermissionsSaving && <Loader2 className="size-4 animate-spin" />}
                  ذخیره دسترسی‌ها
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPermissionsSaving}
                  onClick={() => handlePermissionDialogOpenChange(false)}
                >
                  انصراف
                </Button>
              </DialogFooter>
            </div>
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
            const permGroups = groupPermissionsByModule(role.permissions ?? [])

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
                    <p className="text-xs leading-relaxed text-muted-foreground">{role.description}</p>
                  )}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 justify-between rounded-xl px-3 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                      type="button"
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 justify-between rounded-xl px-3 text-xs"
                      onClick={() => openPermissionDialog(role)}
                      type="button"
                    >
                      <span>مدیریت دسترسی‌ها</span>
                      <ShieldCheck className="size-3.5" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                      {Object.keys(permGroups).length === 0 ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">بدون دسترسی</p>
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
