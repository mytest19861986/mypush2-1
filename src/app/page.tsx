'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
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
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  CreditCard,
  HeartPulse,
  Info,
  Loader2,
  Menu,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
} from 'lucide-react'

const navigationLinks = [
  { label: 'خانه', href: '#' },
  { label: 'پزشکان', href: '#doctors' },
  { label: 'طرح‌ها', href: '#plans' },
  { label: 'درباره ما', href: '#about' },
]

const heroBadges = [
  { label: 'سلامت', icon: HeartPulse, className: 'right-0 top-10 md:right-3' },
  { label: 'تخفیف', icon: BadgePercent, className: 'left-0 top-24 md:left-5' },
  { label: 'اعتبار فعال', icon: CheckCircle2, className: 'bottom-20 right-4 md:right-10' },
  { label: 'پزشکان طرف قرارداد', icon: Stethoscope, className: 'bottom-8 left-3 md:left-8' },
]

const howItWorks = [
  {
    title: 'خرید طرح',
    description: 'طرح مناسب خود را انتخاب کنید و عضویت حامی کارت را در حساب کاربری فعال کنید.',
    icon: CreditCard,
  },
  {
    title: 'انتخاب پزشک طرف قرارداد',
    description: 'پروفایل پزشکان را بررسی کنید و درصد تخفیف همان پزشک را پیش از مراجعه ببینید.',
    icon: Stethoscope,
  },
  {
    title: 'استفاده از تخفیف هنگام مراجعه',
    description: 'هنگام مراجعه، عضویت شما بررسی می‌شود و تخفیف همان پزشک اعمال خواهد شد.',
    icon: BadgePercent,
  },
]

const trustCards = [
  {
    title: 'شبکه پزشکان طرف قرارداد',
    description: 'دسترسی به پزشکانی که شرایط همکاری و تخفیف خدمات خود را شفاف اعلام کرده‌اند.',
    icon: UsersRound,
  },
  {
    title: 'تخفیف متغیر بر اساس پزشک',
    description: 'درصد تخفیف برای هر پزشک متفاوت است و در پروفایل پزشک نمایش داده می‌شود.',
    icon: ShieldCheck,
  },
  {
    title: 'عضویت ساده و قابل پیگیری',
    description: 'خرید طرح، وضعیت عضویت و مسیر استفاده از تخفیف از داخل حساب کاربری قابل پیگیری است.',
    icon: ClipboardCheck,
  },
]

const audiences = [
  {
    title: 'کاربران',
    description: 'برای افرادی که می‌خواهند با عضویت حامی کارت از تخفیف پزشکان طرف قرارداد استفاده کنند.',
    cta: 'خرید طرح حامی کارت',
    href: '/user/plans',
    icon: UserRound,
  },
  {
    title: 'پزشکان',
    description: 'برای پزشکانی که می‌خواهند خدمات خود را در شبکه طرف قرارداد حامی کارت معرفی کنند.',
    cta: 'ثبت‌نام پزشک',
    href: '/register/doctor',
    icon: Stethoscope,
  },
  {
    title: 'همکاران فروش',
    description: 'برای همکارانی که قصد دارند در معرفی و فروش طرح‌های حامی کارت با تیم فروش همراه شوند.',
    cta: 'ثبت‌نام همکار فروش',
    href: '/register/agent',
    icon: Briefcase,
  },
]

const cardBenefits = ['تخفیف فعال', 'پروفایل پزشک', 'عضویت قابل پیگیری']

function FloatingBadge({
  label,
  icon,
  className,
  style,
}: {
  label: string
  icon: ReactNode
  className: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`hami-glass animate-hami-float absolute z-20 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 shadow-xl shadow-sky-900/10 ${className}`}
      style={style}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

function HeroVisual() {
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[520px] sm:h-[500px]" aria-hidden="true">
      <div className="absolute inset-6 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/20 blur-3xl" />

      {heroBadges.map((badge, index) => {
        const Icon = badge.icon
        return (
          <FloatingBadge
            key={badge.label}
            label={badge.label}
            icon={<Icon className="size-4 text-teal-600" />}
            className={badge.className}
            style={{ animationDelay: `${index * 0.55}s` }}
          />
        )
      })}

      <div className="hami-card-tilt absolute left-1/2 top-1/2 z-10 w-[82%] max-w-[390px] -translate-x-1/2 -translate-y-1/2">
        <div className="relative overflow-hidden rounded-[28px] border border-white/40 bg-[linear-gradient(135deg,#07899a_0%,#16a7b5_48%,#dffcff_130%)] p-6 text-white shadow-[0_35px_80px_-25px_rgba(6,95,109,0.55)]">
          <div className="absolute -left-16 -top-16 size-44 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-20 right-8 size-56 rounded-full bg-sky-200/25 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-24 bg-white/15 blur-2xl" />

          <div className="relative flex items-start justify-between">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white/18 text-2xl font-black shadow-inner">
              H+
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">HAMICARD</p>
              <p className="mt-2 text-sm font-bold text-white/85">کارت تخفیف پزشکی</p>
            </div>
          </div>

          <div className="relative mt-16">
            <p className="text-3xl font-black">حامی کارت</p>
            <p className="mt-2 text-sm text-white/75">عضویت تخفیف خدمات پزشکی</p>
          </div>

          <div className="relative mt-8 grid grid-cols-3 gap-2">
            {cardBenefits.map((benefit) => (
              <div key={benefit} className="rounded-xl bg-white/14 px-3 py-2 text-center text-[11px] font-bold text-white/90">
                {benefit}
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex items-center justify-between border-t border-white/25 pt-5">
            <span className="text-sm text-white/75">نزد پزشکان طرف قرارداد</span>
            <span className="rounded-lg bg-white px-3 py-1 text-sm font-black text-teal-700">تا ۲۵٪</span>
          </div>
        </div>
      </div>

      <div className="animate-hami-float absolute left-12 top-8 flex size-10 items-center justify-center rounded-full bg-orange-400 text-xs font-black text-white shadow-lg shadow-orange-500/20 [animation-delay:0.35s]">
        ٪
      </div>
      <div className="animate-hami-float absolute bottom-16 right-14 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 [animation-delay:1.15s]">
        <Check className="size-4" />
      </div>
    </div>
  )
}

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
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-sky-50 text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="hami-landing min-h-screen overflow-x-hidden bg-medical-mesh text-slate-900">
      <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="حامی کارت">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <HeartPulse className="size-5" />
            </span>
            <span className="text-lg font-black text-slate-950">حامی کارت</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
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
              </Button>
            ) : (
              <Button asChild variant="ghost" className="text-slate-700 hover:bg-sky-50 hover:text-teal-700">
                <Link href="/auth/login">ورود به حساب</Link>
              </Button>
            )}
            <Button asChild className="bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600">
              <Link href="/user/plans">
                خرید طرح حامی کارت
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
                    className="rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700"
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
                    <Link href="/user/plans">خرید طرح حامی کارت</Link>
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
          <section id="home" className="relative overflow-hidden">
            <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-14">
              <div className="max-w-2xl">
                <Badge className="mb-5 gap-2 border-teal-100 bg-white/75 px-3 py-1.5 text-teal-700 shadow-sm hover:bg-white/75">
                  <Activity className="size-4" />
                  کارت تخفیف پزشکی
                </Badge>
                <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  تا ۲۵٪ تخفیف نزد پزشکان طرف قرارداد
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                  با خرید طرح حامی کارت، از تخفیف‌های مشخص‌شده برای هر پزشک طرف قرارداد استفاده کنید.
                </p>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  درصد تخفیف برای هر پزشک متفاوت است و در پروفایل پزشک نمایش داده می‌شود.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="h-12 bg-orange-500 px-7 text-white shadow-xl shadow-orange-500/25 hover:bg-orange-600">
                    <Link href="/user/plans">
                      خرید طرح حامی کارت
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 border-teal-200 bg-white/80 px-7 text-teal-700 shadow-sm hover:bg-teal-50">
                    <Link href="#doctors">
                      مشاهده پزشکان طرف قرارداد
                      <ChevronLeft className="size-4" />
                    </Link>
                  </Button>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600">
                  <Link href="/auth/login" className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800">
                    ورود به حساب
                    <ArrowLeft className="size-4" />
                  </Link>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <Link href="/register/doctor" className="hover:text-teal-700">
                    ثبت‌نام پزشک
                  </Link>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <Link href="/register/agent" className="hover:text-teal-700">
                    ثبت‌نام همکار فروش
                  </Link>
                </div>
              </div>

              <HeroVisual />
            </div>
          </section>

          <section id="how-it-works" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <p className="text-sm font-black text-teal-700">چطور کار می‌کند</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">مسیر استفاده از حامی کارت ساده است</h2>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {howItWorks.map((step, index) => (
                  <Card key={step.title} className="rounded-xl border-sky-100 bg-white/85 shadow-[0_20px_45px_-30px_rgba(14,116,144,0.55)] backdrop-blur">
                    <CardContent className="px-6">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
                          <step.icon className="size-6" />
                        </div>
                        <span className="text-3xl font-black text-orange-200">۰{index + 1}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-950">{step.title}</h3>
                      <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section id="doctors" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl rounded-[28px] border border-teal-100 bg-white/80 p-6 shadow-[0_25px_70px_-45px_rgba(14,116,144,0.65)] backdrop-blur sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div>
                  <p className="text-sm font-black text-teal-700">پزشکان طرف قرارداد</p>
                  <h2 className="mt-3 text-3xl font-black text-slate-950">تخفیف شفاف، وابسته به پروفایل هر پزشک</h2>
                  <p className="mt-4 leading-8 text-slate-600">
                    درصد تخفیف برای هر پزشک متفاوت است و در پروفایل پزشک نمایش داده می‌شود. حامی کارت به شما کمک می‌کند پیش از مراجعه، شرایط استفاده از تخفیف را روشن‌تر ببینید.
                  </p>
                  <Button asChild className="mt-6 bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">
                    <Link href="#doctors">مشاهده پزشکان طرف قرارداد</Link>
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {trustCards.map((feature) => (
                    <Card key={feature.title} className="rounded-xl border-sky-100 bg-sky-50/50 shadow-none">
                      <CardContent className="px-5">
                        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                          <feature.icon className="size-5" />
                        </div>
                        <h3 className="font-black text-slate-950">{feature.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="plans" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
              {audiences.map((audience) => (
                <Card key={audience.title} className="rounded-xl border-sky-100 bg-white/90 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.5)]">
                  <CardContent className="flex h-full flex-col px-6">
                    <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
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
          </section>

          <section id="about" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/15 sm:p-8 lg:flex-row lg:items-center">
                <div className="flex gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-orange-300">
                    <Info className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-orange-300">شفافیت محصول</p>
                    <h2 className="mt-3 max-w-3xl text-2xl font-black leading-10 sm:text-3xl">
                      حامی کارت بیمه درمانی نیست؛ یک سامانه عضویت و تخفیف خدمات پزشکی نزد پزشکان طرف قرارداد است.
                    </h2>
                  </div>
                </div>
                <Button asChild size="lg" className="h-12 w-full bg-orange-500 px-7 text-white hover:bg-orange-600 sm:w-auto">
                  <Link href="/user/plans">خرید طرح حامی کارت</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
      </ErrorBoundary>

      <footer className="border-t border-sky-100 bg-white/85 px-4 py-8 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 font-black text-slate-800">
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
