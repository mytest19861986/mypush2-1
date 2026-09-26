'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, type Variants } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
import { doctorsService } from '@/services/doctors.service'
import { ApiError } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Stethoscope,
  ArrowLeft,
  Loader2,
  Building,
  MapPin,
  Phone,
  Hash,
  FileText,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { getCitiesByProvince, getProvinceNames } from '@/constants/iran-locations'

const specialties = [
  { value: 'عمومی', label: 'عمومی' },
  { value: 'قلب و عروق', label: 'قلب و عروق' },
  { value: 'ارتوپدی', label: 'ارتوپدی' },
  { value: 'پوست و مو', label: 'پوست و مو' },
  { value: 'اطفال', label: 'اطفال' },
  { value: 'مغز و اعصاب', label: 'مغز و اعصاب' },
  { value: 'گوش حلق بینی', label: 'گوش حلق بینی' },
  { value: 'چشم‌پزشکی', label: 'چشم‌پزشکی' },
  { value: 'زنان و زایمان', label: 'زنان و زایمان' },
  { value: 'اورولوژی', label: 'اورولوژی' },
  { value: 'روان‌پزشکی', label: 'روان‌پزشکی' },
  { value: 'غدد و متابولیسم', label: 'غدد و متابولیسم' },
  { value: 'گوارش و کبد', label: 'گوارش و کبد' },
  { value: 'ریه و تنفسی', label: 'ریه و تنفسی' },
  { value: 'جراحی عمومی', label: 'جراحی عمومی' },
  { value: 'دندان‌پزشکی', label: 'دندان‌پزشکی' },
]

const easeOut = [0, 0, 0.2, 1] as const
const locationNoneValue = '__none__'
const provinceNames = getProvinceNames()

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
}

const pageCardClassName = 'rounded-2xl border border-border/50 bg-card shadow-sm'
const fieldClassName =
  'border border-input bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary'
const selectTriggerClassName =
  'w-full border border-input bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary'

export default function RegisterDoctorPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    medicalCode: '',
    specialty: '',
    clinicName: '',
    clinicAddress: '',
    city: '',
    province: '',
    phone: '',
    bio: '',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleProvinceChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      province: value === locationNoneValue ? '' : value,
      city: '',
    }))
  }

  const handleCityChange = (value: string) => {
    handleChange('city', value === locationNoneValue ? '' : value)
  }

  const cityOptions = getCitiesByProvince(form.province)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.medicalCode || !form.specialty || !form.clinicName) {
      toast.error('لطفاً فیلدهای الزامی را تکمیل کنید')
      return
    }

    if (!isAuthenticated) {
      toast.error('برای ثبت درخواست پزشکی، لطفاً ابتدا وارد حساب کاربری خود شوید')
      router.push('/auth/login')
      return
    }

    setLoading(true)
    try {
      await doctorsService.register(form)
      setSubmitted(true)
      toast.success('درخواست ثبت‌نام پزشکی با موفقیت ثبت شد')
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          toast.error('نشست شما منقضی شده است. لطفاً وارد شوید')
          router.push('/auth/login')
        } else {
          toast.error(error.message || 'خطا در ثبت درخواست')
        }
      } else {
        toast.error('خطای شبکه. لطفاً دوباره تلاش کنید')
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background p-4 text-foreground">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="w-full max-w-md"
        >
          <Card className={`${pageCardClassName} border-primary/20`}>
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">درخواست شما ثبت شد</h2>
              <p className="text-muted-foreground mb-6">
                درخواست ثبت‌نام پزشکی شما با موفقیت ارسال شد و در انتظار بررسی و تأیید مدیریت قرار گرفت.
                پس از تأیید، به پنل پزشکی دسترسی خواهید داشت.
              </p>
              <Button
                onClick={() => router.push('/user/dashboard')}
                className="h-11 w-full rounded-xl font-semibold shadow-sm"
              >
                بازگشت به داشبورد
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="mx-auto w-full max-w-3xl"
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          بازگشت
        </button>

        {/* Header */}
        <div className={`${pageCardClassName} mb-6 flex items-start gap-4 p-5 sm:items-center sm:p-6`}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-8">ثبت‌نام پزشک</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              فرم ثبت‌نام پزشک در شبکه حامی کارت
            </p>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold">برای ارسال مدارک و درخواست همکاری پزشکی باید حساب کاربری داشته باشید.</p>
              <p className="text-xs opacity-90 mt-0.5">ابتدا وارد شوید یا ثبت‌نام کنید، سپس فرم زیر را ارسال فرمایید.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/auth/login" className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90">
                ورود به حساب
              </Link>
              <Link href="/register/user" className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground text-xs font-bold shadow-xs hover:bg-muted">
                ثبت‌نام اولیه
              </Link>
            </div>
          </div>
        )}

        {/* Form Card */}
        <Card className={pageCardClassName}>
          <CardContent className="p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات تخصصی</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medicalCode" className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" />
                      کد نظام پزشکی <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="medicalCode"
                      placeholder="مثلاً: ۱۲۳۴۵"
                      value={form.medicalCode}
                      onChange={(e) => handleChange('medicalCode', e.target.value)}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty" className="flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5" />
                      تخصص <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.specialty}
                      onValueChange={(v) => handleChange('specialty', v)}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue placeholder="انتخاب تخصص" />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 2: Clinic Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات مطب</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" />
                      نام مطب / کلینیک <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="clinicName"
                      placeholder="مثلاً: کلینیک آریا"
                      value={form.clinicName}
                      onChange={(e) => handleChange('clinicName', e.target.value)}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      آدرس مطب
                    </Label>
                    <Input
                      id="clinicAddress"
                      placeholder="آدرس کامل مطب"
                      value={form.clinicAddress}
                      onChange={(e) => handleChange('clinicAddress', e.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="province" className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        استان
                      </Label>
                      <Select
                        value={form.province || locationNoneValue}
                        onValueChange={handleProvinceChange}
                      >
                        <SelectTrigger id="province" className={selectTriggerClassName}>
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
                      <Label htmlFor="city" className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        شهر
                      </Label>
                      <Select
                        value={form.city || locationNoneValue}
                        onValueChange={handleCityChange}
                        disabled={!form.province}
                      >
                        <SelectTrigger id="city" className={selectTriggerClassName}>
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
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      تلفن مطب
                    </Label>
                    <Input
                      id="phone"
                      placeholder="مثلاً: ۰۲۱-۱۲۳۴۵۶۷۸"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 3: Bio */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات فردی</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    بیوگرافی
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="خلاصه‌ای از سوابق و تخصص‌های خود را بنویسید..."
                    value={form.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    className={fieldClassName}
                    rows={4}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 flex-1 rounded-xl font-semibold shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      ثبت درخواست
                      <ArrowLeft className="h-4 w-4 mr-1" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
                >
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info note */}
        <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
          فیلدهای دارای ستاره <span className="text-red-500">*</span> الزامی هستند.
          پس از بررسی و تأیید مدیریت، نقش پزشکی فعال می‌شود.
        </p>
      </motion.div>
    </div>
  )
}
