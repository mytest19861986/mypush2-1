'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { BrandLogo, ErrorBoundary } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
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
  { label: 'سلامت', icon: HeartPulse, className: 'right-2 top-16 md:right-10', iconClassName: 'bg-rose-50 text-rose-500' },
  { label: 'تخفیف', icon: BadgePercent, className: 'left-4 top-20 md:left-12', iconClassName: 'bg-teal-500 text-white', coinClassName: 'size-9 text-[9px]' },
  { label: 'پشتیبانی', icon: ShieldCheck, className: 'bottom-20 right-5 md:right-16', iconClassName: 'bg-indigo-50 text-indigo-500', coinClassName: 'size-8 text-[8px]' },
  { label: 'اعتبار', icon: CheckCircle2, className: 'bottom-14 left-8 md:left-20', iconClassName: 'bg-emerald-50 text-emerald-500' },
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

const REFERRAL_STORAGE_KEY = 'hamiReferralCode'
const REFERRAL_CODE_PATTERN = /^HC[A-F0-9]{10}$/

function normalizeReferralCode(value?: string | null) {
  if (!value) return null

  const normalized = value.trim().toUpperCase()
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null
}

function withReferral(href: string, referralCode?: string | null) {
  if (!referralCode) return href

  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}ref=${encodeURIComponent(referralCode)}`
}

const heroSafeCopy =
  'با تهیه طرح عضویت حامی‌کارت، از تخفیف‌های مشخص‌شده نزد پزشکان طرف قرارداد استفاده کنید. درصد تخفیف برای هر پزشک متفاوت است.'

const legalClarityText =
  'حامی‌کارت بیمه درمانی نیست؛ سامانه عضویت و تخفیف خدمات پزشکی نزد پزشکان طرف قرارداد است.'

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

function FloatingBadge({
  label,
  icon,
  className,
  iconClassName,
  coinClassName,
  style,
}: {
  label: string
  icon: ReactNode
  className: string
  iconClassName: string
  coinClassName?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`hami-float absolute z-20 ${className}`}
      style={style}
    >
      {coinClassName ? (
        <span
          className={`pointer-events-none absolute left-1/2 top-0 z-0 flex -translate-x-1/2 -translate-y-[70%] items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 font-black text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/80 ${coinClassName}`}
        >
          تومان
        </span>
      ) : null}
      <div className="hami-glass relative z-10 flex items-center gap-2 rounded-full py-1.5 pe-3 ps-1.5 text-xs font-black text-slate-700 shadow-xl shadow-sky-900/10">
        <span className={`grid size-6 place-items-center rounded-full ${iconClassName}`}>{icon}</span>
        <span>{label}</span>
      </div>
    </div>
  )
}

function HeroVisual() {
  return (
    <div className="relative mx-auto h-[320px] w-full max-w-[540px] sm:h-[390px] lg:h-[430px]" aria-hidden="true">
      <div className="hami-glow absolute left-1/2 top-1/2 h-[300px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(251,146,60,0.42),_rgba(250,204,21,0.18)_45%,_transparent_72%)] blur-2xl" />
      <div className="absolute left-1/2 top-[54%] h-56 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200/20 blur-3xl" />
      <div className="absolute right-14 top-20 h-40 w-40 rounded-full bg-cyan-200/20 blur-3xl" />

      {heroBadges.map((badge, index) => {
        const Icon = badge.icon
        return (
          <FloatingBadge
            key={badge.label}
            label={badge.label}
            icon={<Icon className="size-3.5" />}
            className={badge.className}
            iconClassName={badge.iconClassName}
            coinClassName={badge.coinClassName}
            style={{ animationDelay: `${index * 0.45}s` }}
          />
        )
      })}

      <div className="hami-float-sm absolute bottom-20 left-32 z-20 flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-[7px] font-black text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/80 [animation-delay:1.8s]">
        تومان
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 h-[190px] w-[86%] max-w-[430px] antialiased [backface-visibility:hidden] [transform-style:preserve-3d] [transform:perspective(1200px)_translate(-50%,-50%)_rotateX(8deg)_rotateY(-8deg)_rotate(-8deg)] sm:h-[220px]">
        <div className="relative h-full overflow-hidden rounded-[28px] border border-white/45 bg-[linear-gradient(135deg,#077f8c_0%,#10a3ad_58%,#71dce0_130%)] p-5 text-white shadow-[0_34px_80px_-30px_rgba(6,78,88,0.72)] sm:p-6">
          <div className="absolute -left-16 -top-20 size-52 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-20 right-8 size-56 rounded-full bg-cyan-100/22 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-24 bg-white/14 blur-2xl" />
          <div className="absolute left-4 top-[76px] h-2 w-20 rounded-full bg-white/25" />
          <div className="absolute left-4 top-[88px] h-2 w-12 rounded-full bg-yellow-300/80" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/18 text-xl font-black shadow-inner sm:size-16 sm:text-2xl">
              H+
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">HAMICARD</p>
              <p className="mt-2 text-sm font-bold text-white/85">کارت تخفیف پزشکی</p>
            </div>
          </div>

          <div className="relative mt-8 sm:mt-10">
            <p className="text-3xl font-black sm:text-4xl">{brandName}</p>
            <p className="mt-2 text-sm font-semibold text-white/75">عضویت تخفیف خدمات پزشکی</p>
          </div>

          <div className="relative mt-6 flex items-center justify-between border-t border-white/25 pt-4">
            <span className="text-sm font-semibold text-white/75">نزد پزشکان طرف قرارداد</span>
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-black text-teal-700 shadow-lg shadow-cyan-950/10">
              اعتبار فعال
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const queryReferralCode = normalizeReferralCode(
      new URLSearchParams(window.location.search).get('ref')
    )
    const storedReferralCode = normalizeReferralCode(localStorage.getItem(REFERRAL_STORAGE_KEY))
    const nextReferralCode = queryReferralCode ?? storedReferralCode

    if (nextReferralCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, nextReferralCode)
      setReferralCode(nextReferralCode)
    }
  }, [])

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

  const loginHref = withReferral('/auth/login', referralCode)
  const plansHref = withReferral('/user/plans', referralCode)

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
    <div dir="rtl" className="hami-landing min-h-screen overflow-x-hidden bg-[#fbfeff] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-sky-100/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label={brandName}>
            <BrandLogo
              showText
              priority
              className="text-slate-950"
              imageClassName="h-12"
            />
          </Link>

          <nav className="hidden items-center gap-7 text-[15px] font-medium text-slate-800 md:flex">
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
                className="h-9 rounded-full border-teal-200 bg-white px-5 text-teal-700 hover:bg-teal-50"
                onClick={goToDashboard}
              >
                داشبورد من
              </Button>
            ) : (
              <Button asChild variant="outline" className="h-9 rounded-full border-teal-200 bg-white px-5 text-teal-700 hover:bg-teal-50">
                <Link href={loginHref}>ورود</Link>
              </Button>
            )}
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
                      <Link href={loginHref}>ورود</Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    className="bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href={plansHref}>خرید طرح حامی کارت</Link>
                  </Button>
                  <Button asChild variant="ghost" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/doctors">مشاهده پزشکان طرف قرارداد</Link>
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
              <div className="absolute right-[10%] top-24 h-64 w-64 rounded-full bg-teal-100/45 blur-3xl" />
              <div className="absolute left-[12%] top-28 h-72 w-72 rounded-full bg-sky-100/45 blur-3xl" />
              <div className="absolute bottom-20 right-[45%] h-60 w-60 rounded-full bg-orange-50/80 blur-3xl" />
            </div>

            <div className="relative mx-auto grid min-h-[calc(100svh-56px)] w-full max-w-7xl items-center gap-8 px-4 pb-20 pt-12 sm:px-6 md:grid-cols-[1fr_0.92fr] lg:min-h-[calc(100vh-80px)] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-14">
              <div className="order-1 max-w-2xl text-right">
                <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-black text-orange-500 shadow-sm shadow-orange-500/5">
                  پیشنهاد ویژه
                </span>
                <p className="mt-6 flex items-baseline justify-start gap-3 text-orange-500 drop-shadow-sm">
                  <span className="text-4xl font-black leading-none sm:text-5xl lg:text-6xl">تا</span>
                  <span className="text-7xl font-black leading-none sm:text-8xl lg:text-9xl">۲۵٪</span>
                </p>
                <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  تخفیف خدمات پزشکی با {brandName}
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                  {heroSafeCopy}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-[52px] w-full rounded-full bg-orange-500 px-8 text-base font-black text-white shadow-xl shadow-orange-500/30 hover:bg-orange-600 sm:w-auto"
                  >
                    <Link href={plansHref}>
                      خرید حامی‌کارت
                      <ChevronLeft className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-[52px] w-full rounded-full border-teal-100 bg-white/75 px-7 text-teal-700 shadow-sm hover:bg-teal-50 sm:w-auto"
                  >
                    <Link href="/doctors">
                      مشاهده پزشکان
                      <ChevronLeft className="size-4" />
                    </Link>
                  </Button>
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
                        <Link href={audience.href === '/user/plans' ? plansHref : audience.href}>
                          {audience.cta}
                          <ChevronLeft className="size-4" />
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
                  <Link href={plansHref}>خرید طرح حامی کارت</Link>
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
              <Link
                key={link.href}
                href={link.href === '/auth/login' ? loginHref : link.href}
                className="hover:text-teal-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
