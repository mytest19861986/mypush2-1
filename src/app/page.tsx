'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { ErrorBoundary } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Activity,
  ArrowLeft,
  BadgePercent,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  HeartPulse,
  Loader2,
  Menu,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
} from 'lucide-react'

const navigationLinks = [
  { label: 'مزایا', href: '#benefits' },
  { label: 'مراحل', href: '#how-it-works' },
  { label: 'مخاطبان', href: '#audiences' },
]

const stats = [
  {
    label: 'شبکه پزشکان طرف قرارداد',
    value: 'در حال توسعه',
    icon: Stethoscope,
  },
  {
    label: 'اعضای حامی کارت',
    value: 'رو به رشد',
    icon: UsersRound,
  },
  {
    label: 'تخفیف خدمات درمانی',
    value: 'تا ۲۰٪',
    icon: BadgePercent,
  },
]

const benefits = [
  {
    title: 'عضویت ساده برای خدمات درمانی',
    description: 'پس از خرید طرح، دسترسی شما به تخفیف مراکز طرف قرارداد طبق شرایط هر خدمت فعال می‌شود.',
    icon: CreditCard,
  },
  {
    title: 'تمرکز روی تجربه درمانی آرام',
    description: 'حامی کارت تلاش می‌کند مسیر انتخاب طرح و استفاده از تخفیف درمانی شفاف و قابل پیگیری باشد.',
    icon: ShieldCheck,
  },
  {
    title: 'مناسب برای نیازهای روزمره سلامت',
    description: 'برای مراجعه‌های پزشکی، کلینیکی و خدماتی که در شبکه طرف قرارداد تعریف شده‌اند.',
    icon: HeartPulse,
  },
]

const steps = [
  {
    title: 'انتخاب طرح',
    description: 'طرح مناسب خود را در صفحه خرید حامی کارت بررسی و انتخاب کنید.',
    icon: ClipboardCheck,
  },
  {
    title: 'فعال شدن عضویت',
    description: 'پس از تکمیل خرید، عضویت درمانی شما در حساب کاربری ثبت می‌شود.',
    icon: Sparkles,
  },
  {
    title: 'استفاده هنگام مراجعه',
    description: 'در مراجعه به مراکز طرف قرارداد، وضعیت عضویت برای دریافت تخفیف بررسی می‌شود.',
    icon: BadgePercent,
  },
]

const stepNumbers = ['۱', '۲', '۳']

const audiences = [
  {
    title: 'کاربران',
    description: 'برای افرادی که می‌خواهند هزینه بخشی از خدمات درمانی را با عضویت تخفیفی مدیریت کنند.',
    cta: 'خرید حامی کارت',
    href: '/user/plans',
    icon: UserRound,
  },
  {
    title: 'پزشکان',
    description: 'برای پزشکان و مراکزی که قصد دارند در شبکه خدمات درمانی حامی کارت حضور داشته باشند.',
    cta: 'ثبت‌نام پزشک',
    href: '/register/doctor',
    icon: Stethoscope,
  },
  {
    title: 'همکاران فروش',
    description: 'برای همکارانی که می‌خواهند در معرفی و فروش حامی کارت با تیم فروش همراه شوند.',
    cta: 'ثبت‌نام همکار فروش',
    href: '/register/agent',
    icon: Briefcase,
  },
]

export default function Home() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  const getDashboardPath = () => {
    if (user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN')) return '/admin/dashboard'
    if (user?.roles?.includes('DOCTOR')) return '/doctor/dashboard'
    if (user?.roles?.includes('AGENT')) return '/agent/dashboard'
    if (user?.roles?.includes('USER') || user?.roles?.includes('NORMAL_USER')) return '/user/dashboard'
    return '/no-access'
  }

  const goToDashboard = () => {
    router.push(getDashboardPath())
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[linear-gradient(180deg,#f8fcff_0%,#eff8fb_42%,#ffffff_100%)] text-slate-900"
    >
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="حامی کارت">
            <span className="flex size-10 items-center justify-center rounded-lg bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <HeartPulse className="size-5" />
            </span>
            <span className="text-lg font-bold text-slate-950">حامی کارت</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {navigationLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-teal-700">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <Button
                type="button"
                variant="outline"
                className="border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
                onClick={goToDashboard}
              >
                داشبورد من
                <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <Button asChild variant="ghost" className="text-slate-700 hover:bg-slate-100 hover:text-teal-700">
                <Link href="/auth/login">ورود به حساب</Link>
              </Button>
            )}
            <Button asChild className="bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">
              <Link href="/user/plans">
                خرید حامی کارت
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="باز کردن منو">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white pt-10">
              <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
              <div className="flex flex-col gap-2">
                {navigationLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-4 grid gap-2">
                  {isAuthenticated ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        goToDashboard()
                      }}
                    >
                      داشبورد من
                    </Button>
                  ) : (
                    <Button asChild variant="outline" onClick={() => setMobileMenuOpen(false)}>
                      <Link href="/auth/login">ورود به حساب</Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    className="bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/user/plans">خرید حامی کارت</Link>
                  </Button>
                  <Button asChild variant="ghost" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/register/doctor">ثبت‌نام پزشک</Link>
                  </Button>
                  <Button asChild variant="ghost" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/register/agent">ثبت‌نام همکار فروش</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <ErrorBoundary>
        <main>
          <section className="relative overflow-hidden">
            <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 md:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-16">
              <div className="max-w-2xl">
                <Badge className="mb-5 border-teal-100 bg-teal-50 px-3 py-1.5 text-teal-700 hover:bg-teal-50">
                  <Activity className="size-4" />
                  عضویت تخفیف خدمات درمانی
                </Badge>
                <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  حامی کارت، همراه هوشمند شما برای تخفیف خدمات درمانی
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                  با خرید حامی کارت، یک عضویت تخفیفی درمانی دریافت می‌کنید تا در مراکز طرف قرارداد، بخشی از هزینه خدمات سلامت را طبق شرایط هر خدمت کاهش دهید.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="h-12 bg-orange-500 px-7 text-white shadow-xl shadow-orange-500/20 hover:bg-orange-600">
                    <Link href="/user/plans">
                      خرید حامی کارت
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 border-teal-200 bg-white px-7 text-teal-700 hover:bg-teal-50">
                    <Link href="/auth/login">ورود به حساب</Link>
                  </Button>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-lg py-8">
                <div className="relative rounded-[2rem] border border-white bg-white/70 p-4 shadow-2xl shadow-teal-900/10 backdrop-blur">
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#0f8f9a_0%,#1aa6b7_44%,#eafcff_100%)] p-6 text-white shadow-xl shadow-teal-700/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-white/75">HAMICARD</p>
                        <h2 className="mt-2 text-2xl font-black">حامی کارت</h2>
                      </div>
                      <div className="flex size-12 items-center justify-center rounded-lg bg-white/16">
                        <HeartPulse className="size-7" />
                      </div>
                    </div>
                    <div className="mt-12 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/65">نوع عضویت</p>
                        <p className="mt-1 font-bold">درمانی</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/65">وضعیت</p>
                        <p className="mt-1 font-bold">آماده استفاده</p>
                      </div>
                    </div>
                    <div className="mt-8 flex items-center justify-between border-t border-white/20 pt-5">
                      <span className="text-sm text-white/75">خدمات طرف قرارداد</span>
                      <span className="rounded-md bg-white px-3 py-1 text-sm font-bold text-teal-700">تا ۲۰٪</span>
                    </div>
                  </div>
                </div>

                <div className="absolute right-0 top-3 rounded-lg border border-emerald-100 bg-white px-4 py-3 shadow-xl shadow-emerald-900/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-800">تخفیف فعال</span>
                  </div>
                </div>

                <div className="absolute bottom-1 left-2 rounded-lg border border-sky-100 bg-white px-4 py-3 shadow-xl shadow-sky-900/10">
                  <p className="text-xs text-slate-500">پوشش خدمات</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">پزشکی و درمانی</p>
                </div>
              </div>
            </div>
          </section>

          <section className="px-4 pb-12 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5 md:grid-cols-3">
              {stats.map((stat) => (
                <Card key={stat.label} className="rounded-lg border-slate-100 bg-slate-50/70 py-5 shadow-none">
                  <CardContent className="flex items-center gap-4 px-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <stat.icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="benefits" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-teal-700">مزایای حامی کارت</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">عضویتی شفاف برای مدیریت بهتر هزینه‌های درمان</h2>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {benefits.map((benefit) => (
                  <Card key={benefit.title} className="rounded-lg border-slate-200 bg-white shadow-sm">
                    <CardContent className="px-6">
                      <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                        <benefit.icon className="size-6" />
                      </div>
                      <h3 className="text-lg font-black text-slate-950">{benefit.title}</h3>
                      <p className="mt-3 leading-7 text-slate-600">{benefit.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                <div>
                  <p className="text-sm font-bold text-teal-700">چطور کار می‌کند</p>
                  <h2 className="mt-3 text-3xl font-black text-slate-950">از خرید عضویت تا استفاده از تخفیف</h2>
                  <p className="mt-4 leading-8 text-slate-600">
                    فرآیند استفاده از حامی کارت ساده نگه داشته شده تا کاربر بتواند مسیر خرید، فعال‌سازی و مراجعه را با اطمینان دنبال کند.
                  </p>
                </div>
                <div className="grid gap-4">
                  {steps.map((step, index) => (
                    <Card key={step.title} className="rounded-lg border-slate-200 bg-white shadow-sm">
                      <CardContent className="flex gap-4 px-6">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                          <step.icon className="size-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-orange-500">مرحله {stepNumbers[index]}</span>
                          <h3 className="mt-1 text-lg font-black text-slate-950">{step.title}</h3>
                          <p className="mt-2 leading-7 text-slate-600">{step.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="audiences" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-teal-700">مناسب برای کاربران، پزشکان، همکاران فروش</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">هر نقش، مسیر روشن خودش را دارد</h2>
              </div>
              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {audiences.map((audience) => (
                  <Card key={audience.title} className="rounded-lg border-slate-200 bg-white shadow-sm">
                    <CardContent className="flex h-full flex-col px-6">
                      <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <audience.icon className="size-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-950">{audience.title}</h3>
                      <p className="mt-3 flex-1 leading-7 text-slate-600">{audience.description}</p>
                      <Button asChild variant="outline" className="mt-6 border-teal-200 bg-white text-teal-700 hover:bg-teal-50">
                        <Link href={audience.href}>
                          {audience.cta}
                          <ArrowLeft className="size-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-lg bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/15 sm:p-8 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-bold text-orange-300">شروع عضویت درمانی</p>
                <h2 className="mt-3 text-2xl font-black sm:text-3xl">حامی کارت را انتخاب کنید و مسیر استفاده از تخفیف درمانی را شروع کنید.</h2>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild size="lg" className="h-12 bg-orange-500 px-7 text-white hover:bg-orange-600">
                  <Link href="/user/plans">خرید حامی کارت</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-white/25 bg-white/10 px-7 text-white hover:bg-white/20 hover:text-white">
                  <Link href="/auth/login">ورود به حساب</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
      </ErrorBoundary>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <HeartPulse className="size-5 text-teal-600" />
            حامی کارت
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/register/doctor" className="hover:text-teal-700">
              ثبت‌نام پزشک
            </Link>
            <Link href="/register/agent" className="hover:text-teal-700">
              ثبت‌نام همکار فروش
            </Link>
            <Link href="/auth/login" className="hover:text-teal-700">
              ورود به حساب
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
