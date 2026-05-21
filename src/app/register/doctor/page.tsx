'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
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

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function RegisterDoctorPage() {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.medicalCode || !form.specialty || !form.clinicName) {
      toast.error('لطفاً فیلدهای الزامی را تکمیل کنید')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/doctor/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSubmitted(true)
        toast.success(data.message || 'درخواست ثبت‌نام پزشکی با موفقیت ثبت شد')
      } else {
        toast.error(data.error?.message || 'خطا در ثبت درخواست')
      }
    } catch {
      toast.error('خطای شبکه. لطفاً دوباره تلاش کنید')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="w-full max-w-md"
        >
          <Card className="border-emerald-200 dark:border-emerald-900">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">درخواست شما ثبت شد</h2>
              <p className="text-muted-foreground mb-6">
                درخواست ثبت‌نام پزشکی شما با موفقیت ارسال شد و در انتظار بررسی و تأیید مدیریت قرار گرفت.
                پس از تأیید، به پنل پزشکی دسترسی خواهید داشت.
              </p>
              <Button
                onClick={() => router.push('/user/dashboard')}
                className="w-full"
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
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="w-full max-w-2xl"
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          بازگشت
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ثبت‌نام پزشک</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              فرم ثبت‌نام پزشک در شبکه حامی کارت
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">اطلاعات حرفه‌ای</h3>
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
                      <SelectTrigger>
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
                  <h3 className="font-semibold text-sm">اطلاعات مطب</h3>
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
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="province" className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        استان
                      </Label>
                      <Input
                        id="province"
                        placeholder="مثلاً: تهران"
                        value={form.province}
                        onChange={(e) => handleChange('province', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        شهر
                      </Label>
                      <Input
                        id="city"
                        placeholder="مثلاً: تهران"
                        value={form.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                      />
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
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 3: Bio */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">درباره شما</h3>
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
                    rows={4}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12"
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
                  className="h-12"
                >
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info note */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          فیلدهای دارای ستاره <span className="text-red-500">*</span> الزامی هستند.
          پس از بررسی و تأیید مدیریت، نقش پزشکی فعال می‌شود.
        </p>
      </motion.div>
    </div>
  )
}
