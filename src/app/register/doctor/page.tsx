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
import { Badge } from '@/components/ui/badge'
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
  Users,
  Award,
  Sparkles,
  HelpCircle,
  Clock,
  ChevronDown,
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

const pageCardClassName = 'rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden'
const fieldClassName =
  'h-11 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600'
const selectTriggerClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-800 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-teal-600 focus-visible:border-teal-600'

export default function RegisterDoctorPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
      toast.success('درخواست عضویت در شبکه سلامت با موفقیت ثبت شد')
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
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-50 p-4 text-foreground" dir="rtl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="w-full max-w-lg"
        >
          <Card className={`${pageCardClassName} border-teal-200 shadow-md`}>
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 shadow-inner">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900">درخواست عضویت شما در شبکه سلامت ثبت شد</h2>
              <p className="text-slate-600 text-xs leading-relaxed max-w-md mx-auto">
                مدارک و اطلاعات نظام پزشکی شما جهت احراز صلاحیت حرفه‌ای به کارشناسان شبکه سلامت حامی‌کارت ارسال شد. 
                پس از بررسی و فعال‌سازی حساب، به پیشخوان مدیریت بیماران و خدمات دسترسی خواهید داشت.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => router.push('/user/dashboard')}
                  className="h-11 w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                >
                  ورود به پورتال کاربری
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50/60 pb-16 text-foreground" dir="rtl">
      {/* ─── 1. Hero مخصوص پزشکان (Doctor Acquisition Hero) ─── */}
      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-teal-800/80">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs text-teal-100 transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              بازگشت
            </button>
            <Badge className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-2xs font-bold px-3 py-1">
              ✓ درگاه رسمی همکاری پزشکان و مراکز درمانی
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-sm">
              <Stethoscope className="size-4 text-emerald-300" />
              <span>پیوستن به شبکه سلامت حامی‌کارت</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              به شبکه‌ای از مراجعین وفادار و مدیریت‌شده بپیوندید
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed max-w-2xl font-normal">
              پروفایل حرفه‌ای خود را در شبکه سلامت حامی‌کارت فعال کرده و در بستری استاندارد، شفاف و بدون واسطه به جامعه گسترده اعضای تحت پوشش سلامت خدمات ارائه دهید.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-8 space-y-8">
        {/* ─── 2. مزایای همکاری برای پزشک (Value Proposition Grid) ─── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`${pageCardClassName} p-5 hover:shadow-md transition-shadow`}>
            <div className="size-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 border border-teal-100">
              <Users className="size-5 text-teal-700" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">دسترسی به بیماران جدید</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ارتباط با جامعه هدف گسترده‌ای از اعضای متعهد و دارای عضویت فعال سلامت در شهر و منطقه شما.
            </p>
          </Card>

          <Card className={`${pageCardClassName} p-5 hover:shadow-md transition-shadow`}>
            <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-100">
              <ShieldCheck className="size-5 text-emerald-700" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">تعامل حرفه‌ای و شفاف</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              مدیریت شفاف مراجعین با احراز هویت یکپارچه و رعایت استانداردهای اخلاقی و حرفه‌ای پزشکی.
            </p>
          </Card>

          <Card className={`${pageCardClassName} p-5 hover:shadow-md transition-shadow`}>
            <div className="size-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 border border-teal-100">
              <Award className="size-5 text-teal-700" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">ارتقای اعتبار و برند مطب</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              نمایش رسمی پروفایل تاییدشده پزشک و کلینیک به عنوان عضو رسمی شبکه سلامت حامی‌کارت.
            </p>
          </Card>
        </section>

        {/* ─── 3. روند عضویت و تایید (4-Step Onboarding Workflow) ─── */}
        <Card className={`${pageCardClassName} p-6 bg-white border border-slate-200`}>
          <div className="flex items-center gap-2 mb-5">
            <Clock className="size-4 text-teal-700" />
            <h2 className="font-bold text-sm text-slate-900">مراحل پیوستن به شبکه پزشکان همکار</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center space-y-1">
              <span className="inline-block size-6 rounded-full bg-teal-700 text-white text-xs font-bold leading-6 mb-1">۱</span>
              <p className="font-bold text-xs text-slate-800">ثبت فرم اطلاعات</p>
              <p className="text-2xs text-slate-500 leading-normal">تکمیل مشخصات نظام پزشکی و مطب</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center space-y-1">
              <span className="inline-block size-6 rounded-full bg-teal-700 text-white text-xs font-bold leading-6 mb-1">۲</span>
              <p className="font-bold text-xs text-slate-800">بررسی و استعلام</p>
              <p className="text-2xs text-slate-500 leading-normal">احراز هویت و صلاحیت حرفه‌ای</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center space-y-1">
              <span className="inline-block size-6 rounded-full bg-teal-700 text-white text-xs font-bold leading-6 mb-1">۳</span>
              <p className="font-bold text-xs text-slate-800">تایید عضویت رسمی</p>
              <p className="text-2xs text-slate-500 leading-normal">دریافت نشان رسمی شبکه سلامت</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center space-y-1">
              <span className="inline-block size-6 rounded-full bg-emerald-600 text-white text-xs font-bold leading-6 mb-1">۴</span>
              <p className="font-bold text-xs text-slate-800">شروع پذیرش اعضا</p>
              <p className="text-2xs text-slate-500 leading-normal">مدیریت مراجعین در پنل پزشک</p>
            </div>
          </div>
        </Card>

        {/* Auth Guidance Notice */}
        {!isAuthenticated && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <p className="font-bold text-teal-950">جهت ارسال رسمی درخواست همکاری پزشکی، ورود به حساب کاربری الزامی است.</p>
              <p className="text-teal-700 font-medium">ابتدا وارد حساب کاربری خود شوید یا حساب اولیه بسازید، سپس فرم درخواست را ثبت فرمایید.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/auth/login" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold shadow-xs hover:bg-teal-800 transition-colors">
                ورود به حساب
              </Link>
              <Link href="/register/user" className="px-4 py-2 rounded-xl bg-white border border-teal-200 text-teal-800 text-xs font-bold shadow-xs hover:bg-slate-50 transition-colors">
                ثبت‌نام اولیه
              </Link>
            </div>
          </div>
        )}

        {/* ─── 4. فرم ثبت درخواست (Professional Registration Form) ─── */}
        <Card className={`${pageCardClassName} border border-slate-200`}>
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5">
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Stethoscope className="size-4 text-teal-700" />
              <span>فرم ثبت درخواست عضویت پزشک در شبکه سلامت</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              اطلاعات واردشده جهت اعتبارسنجی و تشکیل پرونده همکاری در سامانه حامی‌کارت استفاده می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* بخش ۱: اطلاعات حرفه‌ای و نظام پزشکی */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  <h3 className="text-xs font-bold text-slate-800">۱. مشخصات تخصصی و نظام پزشکی</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medicalCode" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Hash className="h-3.5 w-3.5 text-teal-600" />
                      شماره نظام پزشکی <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="medicalCode"
                      placeholder="مثال: ۱۲۳۴۵"
                      value={form.medicalCode}
                      onChange={(e) => handleChange('medicalCode', e.target.value)}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                      تخصص اصلی <span className="text-rose-500">*</span>
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

              <Separator className="bg-slate-100" />

              {/* بخش ۲: اطلاعات مطب و مرکز درمانی */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building className="h-4 w-4 text-teal-700" />
                  <h3 className="text-xs font-bold text-slate-800">۲. اطلاعات مطب یا کلینیک همکار</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Building className="h-3.5 w-3.5 text-teal-600" />
                      نام مطب یا مرکز درمانی <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="clinicName"
                      placeholder="مثال: کلینیک تخصصی دکتر ..."
                      value={form.clinicName}
                      onChange={(e) => handleChange('clinicName', e.target.value)}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-teal-600" />
                      آدرس دقیق مطب
                    </Label>
                    <Input
                      id="clinicAddress"
                      placeholder="خیابان، پلاک، طبقه و واحد"
                      value={form.clinicAddress}
                      onChange={(e) => handleChange('clinicAddress', e.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="province" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
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
                      <Label htmlFor="city" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
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
                    <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-teal-600" />
                      شماره تماس پذیرش مطب
                    </Label>
                    <Input
                      id="phone"
                      placeholder="مثال: ۰۲۱۱۲۳۴۵۶۷۸"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* بخش ۳: بیوگرافی و سوابق */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-teal-700" />
                  <h3 className="text-xs font-bold text-slate-800">۳. سوابق علمی و بالینی</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <FileText className="h-3.5 w-3.5 text-teal-600" />
                    خلاصه سوابق و بیوگرافی حرفه‌ای
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="سوابق دانشگاهی، تجارب تشخیصی و خدمات درمانی قابل ارائه به اعضای شبکه سلامت..."
                    value={form.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    className="min-h-24 rounded-xl border border-slate-200 bg-white text-xs shadow-2xs leading-relaxed focus-visible:ring-teal-600"
                    rows={4}
                  />
                </div>
              </div>

              {/* اکشن ثبت */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      در حال ارسال درخواست عضویت...
                    </>
                  ) : (
                    <>
                      ثبت و ارسال درخواست عضویت در شبکه سلامت
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ─── 5. سوالات متداول پزشکان (Doctor FAQ Accordion) ─── */}
        <Card className={`${pageCardClassName} p-6 border border-slate-200`}>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="size-4 text-teal-700" />
            <h2 className="font-bold text-sm text-slate-900">پرسش‌های متداول پزشکان و مراکز درمانی</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: 'عضویت در شبکه سلامت حامی‌کارت چه تعهداتی برای پزشک ایجاد می‌کند؟',
                a: 'پزشکان محترم متعهد به رعایت بالاترین استانداردهای اخلاقی و بالینی و ارائه خدمات طبق توافق‌نامه کیفی به اعضای دارای عضویت فعال حامی‌کارت هستند.'
              },
              {
                q: 'فرآیند احراز صلاحیت و تایید چقدر زمان می‌برد؟',
                a: 'پس از ثبت مشخصات، استعلام شماره نظام پزشکی و مدارک ظرف مدت ۲۴ الی ۴۸ ساعت کاری توسط تیم نظارت شبکه سلامت انجام می‌شود.'
              },
              {
                q: 'آیا امکان تعیین یا ویرایش ساعات پذیرش و مشخصات مطب وجود دارد؟',
                a: 'بله، پس از تایید حساب، پنل اختصاصی پزشک برای مدیریت اطلاعات مطب، آدرس، تلفن و گزارش مراجعین در دسترس خواهد بود.'
              }
            ].map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-3.5 text-right flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100/60 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`size-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-teal-700' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="p-3.5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* ─── 6. CTA نهایی و تعهد اعتماد ─── */}
        <div className="rounded-2xl bg-gradient-to-r from-teal-800 to-emerald-800 p-6 text-white text-center space-y-3 shadow-sm">
          <Sparkles className="size-6 text-emerald-300 mx-auto" />
          <h3 className="font-black text-base text-white">پیوستن به معتبرترین شبکه مراقبت و سلامت</h3>
          <p className="text-xs text-teal-100 max-w-lg mx-auto leading-relaxed">
            در چارچوبی شفاف، منضبط و حرفه‌ای، خدمات تشخیصی و درمانی خود را به هزاران عضو شبکه سلامت حامی‌کارت معرفی کنید.
          </p>
        </div>
      </div>
    </div>
  )
}
