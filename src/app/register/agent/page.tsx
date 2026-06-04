'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, type Variants } from 'framer-motion'
import { agentsService } from '@/services/agents.service'
import { ApiError } from '@/lib/api-client'
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

const easeOut = [0, 0, 0.2, 1] as const

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
}

const pageCardClassName = 'rounded-2xl border border-border/50 bg-card shadow-sm'
const fieldClassName =
  'border border-input bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary'

export default function RegisterAgentPage() {
  const router = useRouter()

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
      await agentsService.register(form)
      setSubmitted(true)
      toast.success('درخواست ثبت‌نام نمایندگی با موفقیت ثبت شد')
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'خطا در ثبت درخواست')
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
                درخواست ثبت‌نام نمایندگی شما با موفقیت ارسال شد و در انتظار بررسی و تأیید مدیریت قرار گرفت.
                پس از تأیید، به پنل نمایندگی دسترسی خواهید داشت.
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
        className="mx-auto w-full max-w-2xl"
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
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-8">ثبت‌نام نماینده</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              فرم ثبت‌نام نماینده همکاری در شبکه حامی کارت
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className={`${pageCardClassName} mb-6 bg-primary/5`}>
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <UserPlus className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm leading-6 text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">نماینده حامی کارت شوید!</p>
              <p>با ثبت‌نام به عنوان نماینده، می‌توانید پزشکان و کاربران را معرفی کرده و از پورسانت بهره‌مند شوید.</p>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className={pageCardClassName}>
          <CardContent className="p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات کاری</h3>
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
                      className={fieldClassName}
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
                      className={fieldClassName}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <Separator />

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
          پس از بررسی و تأیید مدیریت، نقش نمایندگی فعال می‌شود.
        </p>
      </motion.div>
    </div>
  )
}
