'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatusBadge } from '@/components/shared'
import { doctorsService } from '@/services'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Percent,
  Phone,
  Save,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { getCitiesByProvince, getProvinceNames } from '@/constants/iran-locations'
import { toPersianNum } from '@/utils/formatters'
import type { DoctorItem, DoctorStatus } from '@/types'

const locationNoneValue = '__none__'
const provinceNames = getProvinceNames()
const cardClassName =
  'rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60'
const inputClassName = 'h-11 rounded-xl'

const statusMeta: Record<
  DoctorStatus,
  {
    label: string
    title: string
    description: string
    icon: typeof CheckCircle2
    iconClassName: string
    badgeClassName: string
  }
> = {
  APPROVED: {
    label: 'تایید شده',
    title: 'پروفایل شما تایید شده است',
    description: 'اطلاعات مطب و تخصص شما برای کاربران حامی‌کارت قابل مشاهده است.',
    icon: CheckCircle2,
    iconClassName:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    badgeClassName:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  PENDING: {
    label: 'در انتظار بررسی',
    title: 'پروفایل در انتظار بررسی است',
    description: 'پس از بررسی اطلاعات توسط تیم حامی‌کارت، وضعیت پروفایل به‌روزرسانی می‌شود.',
    icon: Clock,
    iconClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    badgeClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  REJECTED: {
    label: 'رد شده',
    title: 'پروفایل نیاز به بازبینی دارد',
    description: 'اطلاعات واردشده را بررسی و در صورت نیاز اصلاح کنید.',
    icon: AlertTriangle,
    iconClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    badgeClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300',
  },
  SUSPENDED: {
    label: 'تعلیق شده',
    title: 'پروفایل در وضعیت تعلیق است',
    description: 'برای ادامه نمایش خدمات، وضعیت حساب باید توسط پشتیبانی بررسی شود.',
    icon: AlertTriangle,
    iconClassName: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
    badgeClassName: 'bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300',
  },
}

export default function DoctorProfilePage() {
  const { toast } = useToast()
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
  const cityOptions = getCitiesByProvince(form.province)

  const handleProvinceChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      province: value === locationNoneValue ? '' : value,
      city: '',
    }))
  }

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
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-md rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    )
  }

  const status = doctorData ? statusMeta[doctorData.status] : null
  const StatusIcon = status?.icon || ShieldCheck
  const discountPercent = doctorData?.discountPercent ?? 0

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="پروفایل پزشک"
        description="مدیریت اطلاعات تخصصی، مطب و تنظیمات تخفیف حامی‌کارت"
      />

      {doctorData && (
        <Card className={`overflow-hidden ${cardClassName}`}>
          <CardContent className="p-0">
            <div className="bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-background p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${status?.iconClassName || 'bg-muted text-muted-foreground'}`}>
                    <StatusIcon className="size-7" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold">
                        {doctorData.specialty || 'پزشک حامی‌کارت'}
                      </h2>
                      {status && (
                        <StatusBadge
                          status={doctorData.status}
                          label={status.label}
                          className={status.badgeClassName}
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {status?.title || 'وضعیت پروفایل'}
                    </p>
                  </div>
                </div>

                {doctorData.medicalCode && (
                  <div className="rounded-2xl border border-white/60 bg-background/70 px-4 py-3 text-sm shadow-sm dark:border-slate-800/60">
                    <p className="text-xs text-muted-foreground">کد نظام پزشکی</p>
                    <p className="mt-1 font-semibold" dir="ltr">
                      {doctorData.medicalCode}
                    </p>
                  </div>
                )}
              </div>
              {status?.description && (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {status.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="size-4 text-emerald-600" />
              اطلاعات فردی و تخصصی
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
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">بیوگرافی</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="توضیحات درباره تخصص و سابقه کاری"
                rows={7}
                className="min-h-40 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-emerald-600" />
              اطلاعات مطب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinicName">نام مطب</Label>
                <Input
                  id="clinicName"
                  value={form.clinicName}
                  onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                  placeholder="نام مطب یا کلینیک"
                  className={inputClassName}
                />
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
                  className={inputClassName}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">استان</Label>
                <Select
                  value={form.province || locationNoneValue}
                  onValueChange={handleProvinceChange}
                >
                  <SelectTrigger id="province" className={inputClassName}>
                    <SelectValue placeholder="انتخاب استان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={locationNoneValue}>انتخاب نشده</SelectItem>
                    {provinceNames.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">شهر</Label>
                <Select
                  value={form.city || locationNoneValue}
                  onValueChange={(value) =>
                    setForm({ ...form, city: value === locationNoneValue ? '' : value })
                  }
                  disabled={!form.province}
                >
                  <SelectTrigger id="city" className={inputClassName}>
                    <SelectValue placeholder="انتخاب شهر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={locationNoneValue}>انتخاب نشده</SelectItem>
                    {cityOptions.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicAddress">آدرس مطب</Label>
              <Textarea
                id="clinicAddress"
                value={form.clinicAddress}
                onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })}
                placeholder="آدرس کامل مطب"
                rows={4}
                className="min-h-28 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="size-4 text-emerald-600" />
            تنظیمات تخفیف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100/70 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">درصد تخفیف حامی‌کارت</p>
              <p className="text-sm leading-6 text-muted-foreground">
                درصد تخفیفی که برای کاربران حامی‌کارت نمایش داده می‌شود.
              </p>
            </div>
            <div className="flex min-w-32 items-center justify-center rounded-2xl bg-background px-5 py-4 shadow-sm dark:bg-card">
              <span className="text-4xl font-black text-emerald-700 dark:text-emerald-400">
                {toPersianNum(discountPercent)}
              </span>
              <span className="mr-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                ٪
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-10 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 w-full gap-2 rounded-xl bg-emerald-600 px-6 shadow-sm hover:bg-emerald-700 sm:w-auto sm:min-w-44"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="size-4" />
              ذخیره تغییرات
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
