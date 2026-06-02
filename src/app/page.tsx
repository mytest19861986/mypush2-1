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
  { label: 'خانه', href: '#home' },
  { label: 'پزشکان', href: '#doctors' },
  { label: 'طرح‌ها', href: '#plans' },
  { label: 'درباره ما', href: '#about' },
]

const heroBadges = [
  { label: 'سلامت', icon: HeartPulse, className: 'right-0 top-8 md:right-2' },
  { label: 'تخفیف فعال', icon: BadgePercent, className: 'left-0 top-28 md:left-4' },
  { label: 'پشتیبانی', icon: ShieldCheck, className: 'bottom-24 right-3 md:right-10' },
  { label: 'اعتبار', icon: CheckCircle2, className: 'bottom-10 left-4 md:left-12' },
]

const coinAccents = [
  { label: '٪', className: 'left-14 top-10 size-11 text-sm [animation-delay:0.35s]' },
  { label: '٪', className: 'right-16 bottom-20 size-9 text-xs [animation-delay:1.15s]' },
  { label: '+', className: 'left-24 bottom-16 size-7 text-xs [animation-delay:1.8s]' },
]

const mobileMenuLinks = [
  ...navigationLinks,
  { label: 'حامی کارت چگونه کار می‌کند؟', href: '#how-it-works' },
]

const footerLinks = [
  { label: 'ثبت‌نام پزشک', href: '/register/doctor' },
  { label: 'ثبت‌نام همکار فروش', href: '/register/agent' },
  { label: 'ورود', href: '/auth/login' },
]

const brandName = 'حامی‌کارت'

const heroSafeCopy =
  'با تهیه طرح عضویت حامی کارت، از تخفیف‌های مشخص‌شده برای هر پزشک طرف قرارداد استفاده کنید. درصد تخفیف برای هر پزشک متفاوت است و در پروفایل پزشک نمایش داده می‌شود.'

const legalClarityText =
  'حامی کارت بیمه درمانی نیست؛ یک سامانه عضویت و تخفیف خدمات پزشکی نزد پزشکان طرف قرارداد است.'

const features = [
  {
    title: 'شبکه پزشکان طرف قرارداد',
    description: 'عضویت حامی کارت دسترسی شما به فهرست پزشکانی را ساده‌تر می‌کند که شرایط همکاری خود را در سامانه اعلام کرده‌اند.',
    icon: UsersRound,
  },
  {
    title: 'تخفیف‌های متغیر بر اساس پزشک',
    description: 'درصد تخفیف برای هر پزشک متفاوت است و پیش از مراجعه در پروفایل همان پزشک نمایش داده می‌شود.',
    icon: BadgePercent,
  },
  {
    title: 'عضویت ساده و قابل پیگیری',
    description: 'خرید طرح، وضعیت اعتبار عضویت و مسیر استفاده از خدمات از داخل حساب کاربری قابل مشاهده و پیگیری است.',
    icon: ClipboardCheck,
  },
]

const howItWorks = [
  {
    title: 'خرید طرح عضویت',
    description: 'طرح مناسب خود را انتخاب کنید و عضویت حامی کارت را از مسیر حساب کاربری فعال کنید.',
    icon: CreditCard,
  },
  {
    title: 'انتخاب پزشک طرف قرارداد',
    description: 'پروفایل پزشکان را بررسی کنید و درصد تخفیف همان پزشک را پیش از مراجعه ببینید.',
    icon: Stethoscope,
  },
  {
    title: 'دریافت تخفیف هنگام مراجعه',
    description: 'هنگام مراجعه، عضویت شما بررسی می‌شود و تخفیف ثبت‌شده همان پزشک اعمال خواهد شد.',
    icon: CheckCircle2,
  },
]

const audiences = [
  {
    title: 'کاربران',
    description: 'برای افرادی که می‌خواهند هزینه‌های درمانی خود را با یک عضویت شفاف‌تر مدیریت کنند.',
    cta: 'خرید طرح حامی کارت',
    href: '/user/plans',
    icon: UserRound,
  },
  {
    title: 'پزشکان',
    description: 'برای پزشکانی که می‌خواهند خدمات خود را در شبکه پزشکان طرف قرارداد حامی کارت معرفی کنند.',
    cta: 'ثبت‌نام پزشک',
    href: '/register/doctor',
    icon: Stethoscope,
  },
  {
    title: 'همکاران فروش',
    description: 'برای همکارانی که قصد دارند در معرفی و فروش طرح‌های عضویت حامی کارت با تیم فروش همراه شوند.',
    cta: 'ثبت‌نام همکار فروش',
    href: '/register/agent',
    icon: Briefcase,
  },
]

const cardDetails = [
  { label: 'تخفیف فعال', value: 'نمایش در پروفایل پزشک' },
  { label: 'اعتبار', value: 'عضویت قابل پیگیری' },
  { label: 'سلامت', value: 'شبکه طرف قرارداد' },
  { label: 'پشتیبانی', value: 'راهنمای عضویت' },
]

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
      className={`hami-glass animate-hami-float absolute z-20 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-700 shadow-2xl shadow-sky-900/10 sm:px-4 sm:py-3 sm:text-sm ${className}`}
      style={style}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

function HeroVisual() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[560px] sm:h-[520px] lg:h-[580px]" aria-hidden="true">
      <div className="absolute left-10 top-8 h-44 w-44 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="absolute right-6 top-20 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="absolute bottom-10 left-14 h-48 w-48 rounded-full bg-teal-300/20 blur-3xl" />

      {heroBadges.map((badge, index) => {
        const Icon = badge.icon
        return (
          <FloatingBadge
            key={badge.label}
            label={badge.label}
            icon={<Icon className="size-4 text-teal-600" />}
            className={badge.className}
            style={{ animationDelay: `${index * 0.45}s` }}
          />
        )
      })}

      <div className="hami-card-tilt absolute left-1/2 top-1/2 z-10 w-[84%] max-w-[430px] -translate-x-1/2 -translate-y-1/2">
        <div className="relative overflow-hidden rounded-[30px] border border-white/45 bg-[linear-gradient(135deg,#047985_0%,#0d9dad_46%,#9eeef0_130%)] p-6 text-white shadow-2xl shadow-cyan-950/30 sm:p-7">
          <div className="absolute -left-20 -top-20 size-56 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-24 right-6 size-64 rounded-full bg-sky-100/20 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-28 bg-white/15 blur-2xl" />
          <div className="absolute right-8 top-24 h-1 w-32 rounded-full bg-white/45" />
          <div className="absolute right-8 top-28 h-1 w-20 rounded-full bg-orange-300/90" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white/18 text-2xl font-black shadow-inner sm:size-20 sm:text-3xl">
              H+
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">HAMICARD</p>
              <p className="mt-2 text-sm font-bold text-white/85">کارت تخفیف پزشکی</p>
            </div>
          </div>

          <div className="relative mt-20 sm:mt-24">
            <p className="text-3xl font-black sm:text-4xl">{brandName}</p>
            <p className="mt-3 text-sm font-semibold text-white/75">مدیریت عضویت و تخفیف خدمات پزشکی</p>
          </div>

          <div className="relative mt-8 grid grid-cols-2 gap-3">
            {cardDetails.map((detail) => (
              <div key={detail.label} className="rounded-2xl bg-white/14 p-3 shadow-inner shadow-white/5">
                <p className="text-sm font-black text-white">{detail.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/70">{detail.value}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex items-center justify-between border-t border-white/25 pt-5">
            <span className="text-sm font-semibold text-white/75">نزد پزشکان طرف قرارداد</span>
            <span className="rounded-xl bg-white px-4 py-2 text-sm font-black text-teal-700 shadow-lg shadow-cyan-950/10">
              تخفیف فعال
            </span>
          </div>
        </div>
      </div>

      {coinAccents.map((coin) => (
        <div
          key={`${coin.label}-${coin.className}`}
          className={`animate-hami-float absolute flex items-center justify-center rounded-full bg-yellow-300 font-black text-orange-700 shadow-lg shadow-yellow-500/20 ring-4 ring-white/70 ${coin.className}`}
        >
          {coin.label}
        </div>
      ))}
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
          <Link href="/" className="flex items-center gap-3" aria-label={brandName}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <HeartPulse className="size-5" />
            </span>
            <span className="text-lg font-black text-slate-950">{brandName}</span>
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
                className="rounded-xl border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
                onClick={goToDashboard}
              >
                داشبورد من
              </Button>
            ) : (
              <Button asChild variant="ghost" className="rounded-xl text-slate-700 hover:bg-sky-50 hover:text-teal-700">
                <Link href="/auth/login">ورود</Link>
              </Button>
            )}
            <Button asChild className="rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600">
              <Link href="/user/plans">
                خرید طرح
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
                {mobileMenuLinks.map((link) => (
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
                      <Link href="/auth/login">ورود</Link>
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
                    <Link href="#doctors">مشاهده پزشکان طرف قرارداد</Link>
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
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-[8%] top-24 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
              <div className="absolute left-[8%] top-40 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
              <div className="absolute bottom-16 right-[45%] h-64 w-64 rounded-full bg-orange-100/60 blur-3xl" />
            </div>

            <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_0.95fr] lg:min-h-[calc(100vh-4rem)] lg:gap-14 lg:px-8 lg:py-14">
              <div className="order-1 max-w-2xl text-right">
                <Badge className="mb-5 gap-2 border-teal-100 bg-white/75 px-3 py-1.5 text-teal-700 shadow-sm hover:bg-white/75">
                  <Activity className="size-4" />
                  کارت تخفیف پزشکی
                </Badge>
                <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  مدیریت هوشمند هزینه‌های درمان با عضویت در حامی کارت
                </h1>
                <p className="mt-5 inline-flex rounded-2xl bg-white/80 px-4 py-2 text-xl font-black leading-8 text-teal-700 shadow-sm shadow-sky-900/5 sm:text-2xl">
                  تا ۲۵٪ تخفیف نزد پزشکان طرف قرارداد
                </p>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                  {heroSafeCopy}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full rounded-2xl bg-orange-500 px-7 text-white shadow-xl shadow-orange-500/25 hover:bg-orange-600 sm:w-auto"
                  >
                    <Link href="/user/plans">
                      خرید طرح حامی کارت
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 w-full rounded-2xl border-teal-200 bg-white/85 px-7 text-teal-700 shadow-sm hover:bg-teal-50 sm:w-auto"
                  >
                    <Link href="#doctors">
                      مشاهده پزشکان طرف قرارداد
                      <ChevronLeft className="size-4" />
                    </Link>
                  </Button>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600">
                  <Link href="/auth/login" className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800">
                    ورود
                    <ArrowLeft className="size-4" />
                  </Link>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>نمایش درصد تخفیف در پروفایل هر پزشک</span>
                </div>
              </div>

              <div className="order-2">
                <HeroVisual />
              </div>
            </div>
          </section>

          <section id="doctors" className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <p className="text-sm font-black text-teal-700">مزیت‌های عضویت</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">چرا حامی کارت؟</h2>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {features.map((feature) => (
                  <Card
                    key={feature.title}
                    className="rounded-2xl border-sky-100 bg-white/90 shadow-[0_20px_50px_-32px_rgba(14,116,144,0.55)] backdrop-blur"
                  >
                    <CardContent className="px-6">
                      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 shadow-sm">
                        <feature.icon className="size-6" />
                      </div>
                      <h3 className="text-lg font-black text-slate-950">{feature.title}</h3>
                      <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <p className="text-sm font-black text-teal-700">فرآیند استفاده</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">حامی کارت چگونه کار می‌کند؟</h2>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {howItWorks.map((step, index) => (
                  <Card
                    key={step.title}
                    className="rounded-2xl border-sky-100 bg-white/85 shadow-[0_20px_45px_-30px_rgba(14,116,144,0.55)] backdrop-blur"
                  >
                    <CardContent className="px-6">
                      <div className="mb-5 flex items-center justify-between gap-4">
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

          <section id="plans" className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <p className="text-sm font-black text-teal-700">مخاطبان حامی کارت</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">برای چه کسانی مناسب است؟</h2>
              </div>
              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {audiences.map((audience) => (
                  <Card
                    key={audience.title}
                    className="rounded-2xl border-sky-100 bg-white/90 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.5)]"
                  >
                    <CardContent className="flex h-full flex-col px-6">
                      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <audience.icon className="size-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-950">{audience.title}</h3>
                      <p className="mt-3 flex-1 leading-7 text-slate-600">{audience.description}</p>
                      <Button asChild variant="outline" className="mt-6 rounded-xl border-teal-200 bg-white text-teal-700 hover:bg-teal-50">
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

          <section id="about" className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] border border-teal-100 bg-white/90 p-6 text-slate-900 shadow-2xl shadow-sky-900/10 backdrop-blur sm:p-8 lg:flex-row lg:items-center">
                <div className="flex gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                    <Info className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-teal-700">شفافیت محصول</p>
                    <h2 className="mt-3 max-w-3xl text-xl font-black leading-9 text-slate-950 sm:text-2xl">
                      {legalClarityText}
                    </h2>
                  </div>
                </div>
                <Button asChild size="lg" className="h-12 w-full rounded-2xl bg-orange-500 px-7 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 sm:w-auto">
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
            {brandName}
          </div>
          <div className="flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-teal-700">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
