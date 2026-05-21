'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatusBadge } from '@/components/shared'
import { doctorsService } from '@/services'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Stethoscope, Save, Loader2, Phone, MapPin, Building2 } from 'lucide-react'
import type { DoctorItem } from '@/types'

export default function DoctorProfilePage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [doctorData, setDoctorData] = useState<DoctorItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    specialty: '',
    clinicName: '',
    clinicAddress: '',
    city: '',
    province: '',
    phone: '',
    bio: '',
  })

  const loadProfile = async (options?: { showPageLoader?: boolean }) => {
    if (options?.showPageLoader) setIsLoading(true)
    try {
      const res = await doctorsService.getMyProfile()
      if (res.success && res.data) {
        setDoctorData(res.data)
        setForm({
          specialty: res.data.specialty || '',
          clinicName: res.data.clinicName || '',
          clinicAddress: res.data.clinicAddress || '',
          city: res.data.city || '',
          province: res.data.province || '',
          phone: res.data.phone || '',
          bio: res.data.bio || '',
        })
      }
    } catch {
      toast({ title: 'خطا', description: 'خطا در دریافت اطلاعات پروفایل', variant: 'destructive' })
    } finally {
      if (options?.showPageLoader) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile({ showPageLoader: true })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await doctorsService.updateMyProfile(form)
      toast({ title: 'موفق', description: 'پروفایل با موفقیت بروزرسانی شد' })
      await loadProfile()
    } catch {
      toast({ title: 'خطا', description: 'خطا در بروزرسانی پروفایل', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
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
        description="مشاهده و ویرایش اطلاعات پروفایل پزشکی"
      />

      {/* Status card */}
      {doctorData && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Stethoscope className="size-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{doctorData.specialty || 'پزشک'}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <StatusBadge status={doctorData.status} />
                  {doctorData.medicalCode && (
                    <span className="text-sm text-muted-foreground font-mono">
                      کد نظام: {doctorData.medicalCode}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable fields */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Clinic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4 text-emerald-600" />
              اطلاعات مطب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">نام مطب</Label>
              <Input
                id="clinicName"
                value={form.clinicName}
                onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                placeholder="نام مطب یا کلینیک"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicAddress">آدرس مطب</Label>
              <Textarea
                id="clinicAddress"
                value={form.clinicAddress}
                onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })}
                placeholder="آدرس کامل مطب"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">شهر</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="شهر"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">استان</Label>
                <Input
                  id="province"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  placeholder="استان"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="size-3.5" />
                تلفن مطب
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="شماره تلفن"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="size-4 text-emerald-600" />
              اطلاعات حرفه‌ای
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">تخصص</Label>
              <Input
                id="specialty"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="تخصص پزشکی"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">بیوگرافی</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="توضیحات درباره تخصص و سابقه کاری"
                rows={5}
              />
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
          className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]"
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
