'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Save, Loader2, Phone, CreditCard, Shield } from 'lucide-react'

export default function UserProfilePage() {
  const { toast } = useToast()
  const { user, initialize } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    nationalCode: '',
  })

  useEffect(() => {
    // Initialize form from auth store data immediately (fallback)
    if (user?.profile) {
      setForm({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        nationalCode: (user.profile as any).nationalCode || '',
      })
    }

    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/me')
        if (res.success && res.data) {
          setForm({
            firstName: (res.data as any).profile?.firstName || '',
            lastName: (res.data as any).profile?.lastName || '',
            nationalCode: (res.data as any).profile?.nationalCode || '',
          })
        }
      } catch {
        // Form already initialized from store data above
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const saved = await apiClient.put('/users/profile', form) as Record<string, string | null>
      // Update form with saved data immediately
      setForm({
        firstName: saved.firstName || '',
        lastName: saved.lastName || '',
        nationalCode: saved.nationalCode || '',
      })
      await initialize()
      toast({ title: 'موفق', description: 'پروفایل با موفقیت بروزرسانی شد' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بروزرسانی پروفایل'
      toast({ title: 'خطا', description: msg, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const fullName = user?.profile
    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || user.mobile
    : user?.mobile || 'کاربر'

  const userInitials = user?.profile
    ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
    : (user?.mobile || '').slice(-2)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل"
        description="مشاهده و ویرایش اطلاعات حساب کاربری"
      />

      {/* User info card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 ring-4 ring-primary/10">
              {user?.profile?.avatar && (
                <AvatarImage src={user.profile.avatar} alt={fullName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {userInitials || 'ک'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{fullName}</h2>
              <p className="text-sm text-muted-foreground">{user?.mobile}</p>
              {user?.roles && user.roles.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable fields */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4 text-primary" />
              اطلاعات شخصی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">نام</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="نام"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">نام خانوادگی</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="نام خانوادگی"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationalCode" className="flex items-center gap-2">
                <CreditCard className="size-3.5" />
                کد ملی
              </Label>
              <Input
                id="nationalCode"
                value={form.nationalCode}
                onChange={(e) => setForm({ ...form, nationalCode: e.target.value })}
                placeholder="کد ملی ۱۰ رقمی"
                dir="ltr"
                maxLength={10}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Info (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              اطلاعات حساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="size-3.5" />
                شماره موبایل
              </Label>
              <Input value={user?.mobile || ''} disabled className="bg-muted/50" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input value={user?.email || '—'} disabled className="bg-muted/50" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>وضعیت حساب</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user?.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {user?.status === 'ACTIVE' ? 'فعال' : user?.status === 'INACTIVE' ? 'غیرفعال' : 'مسدود'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="ml-2 size-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="ml-2 size-4" />
              ذخیره تغییرات
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
