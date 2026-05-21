'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Briefcase,
  ArrowLeft,
  Loader2,
  Building,
  FileText,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
} from 'lucide-react'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function RegisterAgentPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    businessName: '',
    description: '',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.businessName.trim()) {
      toast.error('لطفاً نام کسب‌وکار را وارد کنید')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/agents/register', {
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
        toast.success('درخواست ثبت‌نام نمایندگی با موفقیت ثبت شد')
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
                درخواست ثبت‌نام نمایندگی شما با موفقیت ارسال شد و در انتظار بررسی و تأیید مدیریت قرار گرفت.
                پس از تأیید، به پنل نمایندگی دسترسی خواهید داشت.
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
        className="w-full max-w-lg"
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
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ثبت‌نام نماینده</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              فرم ثبت‌نام نماینده همکاری در شبکه حامی کارت
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5 mb-6">
          <CardContent className="p-4 flex items-start gap-3">
            <UserPlus className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">نماینده حامی کارت شوید!</p>
              <p>با ثبت‌نام به عنوان نماینده، می‌توانید پزشکان و کاربران را معرفی کرده و از پورسانت بهره‌مند شوید.</p>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">اطلاعات کسب‌وکار</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" />
                      نام کسب‌وکار <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="businessName"
                      placeholder="مثلاً: نمایندگی سلامت پارس"
                      value={form.businessName}
                      onChange={(e) => handleChange('businessName', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      توضیحات
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="توضیح مختصری درباره فعالیت و زمینه کاری خود بنویسید..."
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <Separator />

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
          پس از بررسی و تأیید مدیریت، نقش نمایندگی فعال می‌شود.
        </p>
      </motion.div>
    </div>
  )
}
