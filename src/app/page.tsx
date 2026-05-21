'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
import { ErrorBoundary, ThemeToggle } from '@/components/shared'
import { toPersianNum, formatPrice } from '@/utils/formatters'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  HeartPulse,
  Shield,
  Users,
  Star,
  CheckCircle,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Award,
  Clock,
  HeadphonesIcon,
  TrendingUp,
  UserPlus,
  CreditCard,
  BadgePercent,
  Loader2,
  Menu,
  Briefcase,
  Home as HomeIcon,
} from 'lucide-react'

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

/* ───────────── Data ───────────── */

const stats = [
  { label: 'پزشک فعال', value: '+۱,۰۰۰', icon: Stethoscope },
  { label: 'کاربر راضی', value: '+۵,۰۰۰', icon: Users },
  { label: 'رضایت مشتریان', value: '۹۸٪', icon: Star },
  { label: 'شهر تحت پوشش', value: '+۲۰', icon: MapPin },
]

const steps = [
  { title: 'ثبت‌نام رایگان', desc: 'یک حساب کاربری رایگان بسازید', icon: UserPlus },
  { title: 'خرید طرح تخفیف', desc: 'طرح مناسب خود را انتخاب کنید', icon: CreditCard },
  { title: 'مراجعه به پزشک', desc: 'به پزشک متخصص مورد نظر مراجعه کنید', icon: Stethoscope },
  { title: 'دریافت تخفیف', desc: 'تخفیف خود را هنگام پرداخت دریافت کنید', icon: BadgePercent },
]

const plans = [
  {
    name: 'برنزی',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    discount: 15,
    price: 150000,
    days: 30,
    visits: 5,
    features: ['تخفیف ۱۵ درصدی', 'اعتبار ۳۰ روزه', '۵ نوبت ویزیت', 'پشتیبانی تلفنی', 'تمام تخصص‌ها'],
    popular: false,
  },
  {
    name: 'نقره‌ای',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    discount: 25,
    price: 280000,
    days: 60,
    visits: 10,
    features: ['تخفیف ۲۵ درصدی', 'اعتبار ۶۰ روزه', '۱۰ نوبت ویزیت', 'پشتیبانی ۲۴ ساعته', 'تمام تخصص‌ها', 'ویزیت آنلاین'],
    popular: false,
  },
  {
    name: 'طلایی',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    discount: 40,
    price: 450000,
    days: 90,
    visits: -1,
    features: ['تخفیف ۴۰ درصدی', 'اعتبار ۹۰ روزه', 'نوبت نامحدود', 'پشتیبانی ویژه', 'تمام تخصص‌ها', 'ویزیت آنلاین', 'اولویت نوبت‌دهی'],
    popular: true,
  },
]

const doctors = [
  { name: 'دکتر محمد احمدی', specialty: 'متخصص قلب و عروق', city: 'تهران', exp: '۱۵ سال سابقه' },
  { name: 'دکتر فاطمه رضایی', specialty: 'متخصص پوست و مو', city: 'اصفهان', exp: '۱۰ سال سابقه' },
  { name: 'دکتر علی محمدی', specialty: 'جراح ارتوپد', city: 'شیراز', exp: '۲۰ سال سابقه' },
]

const testimonials = [
  {
    name: 'مریم حسینی',
    text: 'با طرح تخفیف طلایی، هزینه‌های درمانی خود را تا ۴۰ درصد کاهش دادم. واقعاً عالی است!',
    role: 'کاربر طرح طلایی',
  },
  {
    name: 'رضا کریمی',
    text: 'ثبت‌نام خیلی ساده بود و تخفیف بلافاصله اعمال شد. از پشتیبانی هم راضی هستم.',
    role: 'کاربر طرح نقره‌ای',
  },
  {
    name: 'زهرا موسوی',
    text: 'پزشکان متخصص و حرفه‌ای. تخفیف واقعی و بدون دردسر. به همه توصیه می‌کنم.',
    role: 'کاربر طرح برنزی',
  },
]

const faqItems = [
  {
    q: 'طرح تخفیف چیست؟',
    a: 'طرح تخفیف یک اشتراک زمانی است که با خرید آن، می‌توانید از خدمات درمانی با تخفیف‌های ویژه در کلینیک‌ها و مطب‌های partnered بهره‌مند شوید. تخفیف از ۱۵ تا ۴۰ درصد متغیر است.',
  },
  {
    q: 'چگونه طرح بخرم؟',
    a: 'ابتدا در سایت ثبت‌نام کنید، سپس از بخش طرح‌ها طرح مورد نظر خود را انتخاب و پرداخت آنلاین انجام دهید. تخفیف بلافاصله فعال می‌شود.',
  },
  {
    q: 'آیا طرح قابل انتقال به شخص دیگر است؟',
    a: 'خیر، طرح تخفیف غیرقابل انتقال به شخص دیگر است و فقط برای حساب کاربری خریدار فعال می‌شود. اما اعضای خانواده می‌توانند طرح جداگانه خریداری کنند.',
  },
  {
    q: 'چگونه تخفیف اعمال می‌شود؟',
    a: 'پس از خرید طرح، هنگام مراجعه به پزشک یا کلینیک partner، کد تخفیف شما به صورت خودکار اعمال می‌شود. کافی است شماره موبایل ثبت‌نام شده خود را اعلام کنید.',
  },
]

const footerLinks = [
  { title: 'درباره ما', items: ['داستان ما', 'تیم ما', 'فرصت‌های شغلی', 'بلاگ'] },
  { title: 'لینک‌های مفید', items: ['قوانین و مقررات', 'حریم خصوصی', 'شرایط استفاده', 'سوالات متداول'] },
]

/* ───────────── Component ───────────── */

export default function Home() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  const displayName = user?.profile
    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || user.mobile
    : null

  const userRole = user?.roles?.[0] || null

  // Role-based dashboard redirect
  const getDashboardPath = () => {
    if (user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN')) return '/admin/dashboard'
    if (user?.roles?.includes('DOCTOR')) return '/doctor/dashboard'
    if (user?.roles?.includes('AGENT')) return '/agent/dashboard'
    return '/user/dashboard'
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-background">
      {/* ═══════════ 1. STICKY NAVBAR ═══════════ */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Right: Brand + Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 pt-12">
                <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
                <div className="flex flex-col gap-1">
                  <a
                    href="#home"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    <HomeIcon className="h-4 w-4" />
                    خانه
                  </a>
                  <a
                    href="#plans"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    طرح‌ها
                  </a>
                  <a
                    href="#doctors"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    <Stethoscope className="h-4 w-4" />
                    درباره ما
                  </a>
                  <a
                    href="#faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    <HeadphonesIcon className="h-4 w-4" />
                    سوالات متداول
                  </a>
                  <Separator className="my-2" />
                  <button
                    onClick={() => { setMobileMenuOpen(false); router.push('/register/doctor') }}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-right"
                  >
                    <Stethoscope className="h-4 w-4" />
                    ثبت‌نام پزشک
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); router.push('/register/agent') }}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-right"
                  >
                    <Briefcase className="h-4 w-4" />
                    ثبت‌نام نماینده
                  </button>
                  <Separator className="my-2" />
                  {isAuthenticated ? (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => { setMobileMenuOpen(false); router.push(getDashboardPath()) }}
                    >
                      پنل کاربری
                      <ArrowLeft className="h-4 w-4 mr-1" />
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => { setMobileMenuOpen(false); router.push('/auth/login') }}
                    >
                      ورود / ثبت‌نام
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <HeartPulse className="h-7 w-7 text-primary" />
            <span className="font-bold text-lg text-foreground">حامی کارت</span>
          </div>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#home" className="hover:text-primary transition-colors">خانه</a>
            <a href="#plans" className="hover:text-primary transition-colors">طرح‌ها</a>
            <a href="#doctors" className="hover:text-primary transition-colors">درباره ما</a>
            <a href="#faq" className="hover:text-primary transition-colors">سوالات متداول</a>
            <a href="/register/doctor" className="hover:text-primary transition-colors text-emerald-700 font-semibold">ثبت‌نام پزشک</a>
            <a href="/register/agent" className="hover:text-primary transition-colors text-emerald-700 font-semibold">ثبت‌نام نماینده</a>
          </nav>

          {/* Left: Auth + Register buttons (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated && displayName ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profile?.avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {displayName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{displayName}</span>
                  {userRole && (
                    <Badge variant="secondary" className="text-xs">{userRole}</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => router.push(getDashboardPath())}
                >
                  پنل کاربری
                  <ArrowLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => router.push('/register/doctor')}
                >
                  <Stethoscope className="h-4 w-4 ml-1" />
                  ثبت‌نام پزشک
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => router.push('/register/agent')}
                >
                  <Briefcase className="h-4 w-4 ml-1" />
                  ثبت‌نام نماینده
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => router.push('/auth/login')}
                >
                  ورود / ثبت‌نام
                </Button>
              </>
            )}
          </div>

          {/* Mobile: only login button + theme toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3"
                onClick={() => router.push(getDashboardPath())}
              >
                پنل
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3"
                onClick={() => router.push('/auth/login')}
              >
                ورود
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="flex-1">
        <ErrorBoundary>

          {/* ═══════════ 2. HERO SECTION ═══════════ */}
          <section id="home" className="relative overflow-hidden bg-gradient-to-bl from-emerald-600 to-teal-700 rounded-b-3xl">
            {/* Decorative circle */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/5 blur-2xl" />

            <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="max-w-3xl mx-auto text-center"
              >
                <motion.div variants={fadeInUp} custom={0} className="mb-6">
                  <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/20 px-4 py-1.5 text-sm">
                    <HeartPulse className="h-4 w-4 ml-1.5" />
                    سامانه تخفیف درمانی
                  </Badge>
                </motion.div>

                <motion.h1
                  variants={fadeInUp}
                  custom={1}
                  className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6"
                >
                  تخفیف ویژه خدمات درمانی
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  custom={2}
                  className="text-emerald-100 text-base sm:text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
                >
                  با خرید طرح تخفیف، از خدمات درمانی با تخفیف تا ۴۰ درصد بهره‌مند شوید
                </motion.p>

                <motion.div variants={fadeInUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8 h-12"
                    onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    مشاهده طرح‌ها
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 px-8 h-12"
                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    اطلاعات بیشتر
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ═══════════ 3. STATS BAR ═══════════ */}
          <section className="py-10 md:py-14 bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    custom={i}
                    className="text-center"
                  >
                    <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════ 4. HOW IT WORKS ═══════════ */}
          <section id="how-it-works" className="py-14 md:py-20 bg-muted/40">
            <div className="container mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="text-center mb-12"
              >
                <motion.h2 variants={fadeInUp} custom={0} className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  چگونه کار می‌کند؟
                </motion.h2>
                <motion.p variants={fadeInUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
                  در ۴ مرحله ساده از تخفیف خدمات درمانی بهره‌مند شوید
                </motion.p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
              >
                {steps.map((step, i) => (
                  <motion.div key={step.title} variants={fadeInUp} custom={i} className="relative">
                    {/* Dashed connector line (not on last item, only lg) */}
                    {i < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-10 -left-3 w-6 border-t-2 border-dashed border-primary/30" />
                    )}
                    <Card className="text-center h-full hover:shadow-lg transition-shadow border">
                      <CardHeader className="pb-3">
                        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                          <step.icon className="h-7 w-7 text-primary" />
                          <Badge className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center p-0">
                            {toPersianNum(i + 1)}
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold">{step.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ═══════════ 5. PLANS SECTION ═══════════ */}
          <section id="plans" className="py-14 md:py-20 bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="text-center mb-12"
              >
                <motion.h2 variants={fadeInUp} custom={0} className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  طرح‌های تخفیف
                </motion.h2>
                <motion.p variants={fadeInUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
                  طرح مناسب خود را انتخاب و از تخفیف ویژه خدمات درمانی بهره‌مند شوید
                </motion.p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch"
              >
                {plans.map((plan, i) => (
                  <motion.div key={plan.name} variants={fadeInUp} custom={i} className="flex">
                    <Card
                      className={`relative w-full flex flex-col hover:shadow-xl transition-all ${
                        plan.popular ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''
                      } ${plan.bg} border ${plan.border}`}
                    >
                      {plan.popular && (
                        <Badge className="absolute -top-3 right-1/2 translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold z-10">
                          پرطرفدارترین
                        </Badge>
                      )}
                      <CardHeader className="text-center pt-8 pb-2">
                        <CardTitle className={`text-xl font-bold ${plan.color}`}>{plan.name}</CardTitle>
                        <CardDescription className="mt-1">تا {toPersianNum(plan.discount)}٪ تخفیف</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col items-center text-center gap-4 pt-2">
                        <div className="text-3xl font-extrabold text-foreground">
                          {formatPrice(plan.price)}
                          <span className="text-sm font-normal text-muted-foreground mr-1">تومان</span>
                        </div>

                        <Separator />

                        <ul className="w-full space-y-3 text-right">
                          <li className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-primary shrink-0" />
                            اعتبار {toPersianNum(plan.days)} روزه
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                            {plan.visits === -1 ? 'نوبت نامحدود' : `${toPersianNum(plan.visits)} نوبت ویزیت`}
                          </li>
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter className="pt-4 pb-6 justify-center">
                        <Button
                          className={`w-full h-11 font-semibold ${
                            plan.popular
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-white text-primary border-2 border-primary hover:bg-primary/5'
                          }`}
                          onClick={() => router.push(isAuthenticated ? getDashboardPath() : '/auth/login')}
                        >
                          خرید طرح
                          <ArrowLeft className="h-4 w-4 mr-1" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ═══════════ 6. DOCTORS SECTION ═══════════ */}
          <section id="doctors" className="py-14 md:py-20 bg-muted/40">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
                {/* Left text */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={staggerContainer}
                >
                  <motion.h2 variants={fadeInUp} custom={0} className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    پزشکان متخصص ما
                  </motion.h2>
                  <motion.p variants={fadeInUp} custom={1} className="text-muted-foreground leading-relaxed mb-6">
                    شبکه گسترده‌ای از بهترین پزشکان متخصص در سراسر کشور آماده ارائه خدمات درمانی با کیفیت بالا و تخفیف ویژه به شما هستند.
                  </motion.p>
                  <motion.div variants={fadeInUp} custom={2} className="flex flex-wrap gap-4 mb-8">
                    {[
                      { icon: Shield, label: 'پزشکان معتمد' },
                      { icon: Award, label: 'برترین تخصص‌ها' },
                      { icon: Clock, label: 'نوبت‌دهی آسان' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <item.icon className="h-5 w-5 text-primary" />
                        {item.label}
                      </div>
                    ))}
                  </motion.div>
                  <motion.div variants={fadeInUp} custom={3}>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>
                      مشاهده پزشکان
                      <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                  </motion.div>
                </motion.div>

                {/* Right: Doctor cards */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={staggerContainer}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4"
                >
                  {doctors.map((doc, i) => (
                    <motion.div key={doc.name} variants={fadeInUp} custom={i}>
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="flex items-center gap-4 p-4">
                          <Avatar className="h-14 w-14 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                              {doc.name.slice(doc.name.indexOf(' ') + 1, doc.name.indexOf(' ') + 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{doc.name}</p>
                            <p className="text-xs text-primary font-medium mt-0.5">{doc.specialty}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {doc.city}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {doc.exp}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </section>

          {/* ═══════════ 7. TESTIMONIALS ═══════════ */}
          <section className="py-14 md:py-20 bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="text-center mb-12"
              >
                <motion.h2 variants={fadeInUp} custom={0} className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  نظرات کاربران
                </motion.h2>
                <motion.p variants={fadeInUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
                  ببینید کاربران ما درباره خدمات ما چه می‌گویند
                </motion.p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
              >
                {testimonials.map((t, i) => (
                  <motion.div key={t.name} variants={fadeInUp} custom={i}>
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-1 mb-4">
                          {Array.from({ length: 5 }).map((_, s) => (
                            <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t.text}</p>
                        <Separator className="mb-4" />
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                              {t.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.role}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ═══════════ 8. FAQ SECTION ═══════════ */}
          <section id="faq" className="py-14 md:py-20 bg-muted/40">
            <div className="container mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="text-center mb-12"
              >
                <motion.h2 variants={fadeInUp} custom={0} className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  سوالات متداول
                </motion.h2>
                <motion.p variants={fadeInUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
                  پاسخ سوالات رایج درباره سامانه تخفیف درمانی
                </motion.p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                custom={0}
                className="max-w-3xl mx-auto"
              >
                <Accordion type="single" collapsible className="space-y-3">
                  {faqItems.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`faq-${i}`}
                      className="bg-white dark:bg-gray-900 rounded-xl border px-6 shadow-sm data-[state=open]:shadow-md transition-shadow"
                    >
                      <AccordionTrigger className="text-right font-semibold text-foreground hover:no-underline py-5">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            </div>
          </section>

          {/* ═══════════ 9. CTA BANNER ═══════════ */}
          <section className="py-14 md:py-16 bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                custom={0}
                className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-bl from-emerald-600 to-teal-700 p-8 md:p-12 text-center relative overflow-hidden"
              >
                {/* Decorative */}
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-xl" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/10 blur-xl" />

                <div className="relative z-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    همین الان شروع کنید
                  </h2>
                  <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
                    ثبت‌نام رایگان و دریافت تخفیف تا ۴۰ درصد برای خدمات درمانی. منتظر چه هستید؟
                  </p>
                  <Button
                    size="lg"
                    className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8 h-12"
                    onClick={() => router.push('/auth/login')}
                  >
                    ثبت‌نام رایگان
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </ErrorBoundary>
      </main>

      {/* ═══════════ 10. FOOTER ═══════════ */}
      <footer className="bg-foreground text-background mt-auto">
        <div className="container mx-auto px-4 py-12 md:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Column 1: About */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <HeartPulse className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">حامی کارت</span>
              </div>
              <p className="text-sm text-background/60 leading-relaxed mb-4">
                سامانه جامع تخفیف خدمات درمانی با هدف کاهش هزینه‌های درمان و دسترسی آسان به پزشکان متخصص.
              </p>
            </div>

            {/* Column 2: Useful Links */}
            {footerLinks.map((col) => (
              <div key={col.title}>
                <h3 className="font-semibold mb-4 text-sm">{col.title}</h3>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item}>
                      <a href="#" className="text-sm text-background/60 hover:text-primary transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Column 3: Contact */}
            <div>
              <h3 className="font-semibold mb-4 text-sm">تماس با ما</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-background/60">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span dir="ltr">۰۲۱-۱۲۳۴۵۶۷۸</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-background/60">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span dir="ltr">info@hamikart.ir</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-background/60">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  تهران، خیابان ولیعصر
                </li>
                <li className="flex items-center gap-2 text-sm text-background/60">
                  <HeadphonesIcon className="h-4 w-4 text-primary shrink-0" />
                  پشتیبانی ۲۴ ساعته
                </li>
              </ul>
            </div>

            {/* Column 4: Social */}
            <div>
              <h3 className="font-semibold mb-4 text-sm">شبکه‌های اجتماعی</h3>
              <div className="flex items-center gap-3">
                {['اینستاگرام', 'تلگرام', 'واتساپ'].map((name) => (
                  <a
                    key={name}
                    href="#"
                    className="w-10 h-10 rounded-xl bg-background/10 hover:bg-primary/20 flex items-center justify-center text-xs text-background/80 hover:text-primary transition-colors"
                    aria-label={name}
                  >
                    {name.slice(0, 1)}
                  </a>
                ))}
              </div>
              <p className="text-xs text-background/40 mt-4">
                ما را در شبکه‌های اجتماعی دنبال کنید و از آخرین اخبار و تخفیف‌ها مطلع شوید.
              </p>
            </div>
          </div>

          <Separator className="my-8 bg-background/10" />

          <p className="text-center text-xs text-background/50">
            © {toPersianNum(1404)} - حامی کارت | تمامی حقوق محفوظ است
          </p>
        </div>
      </footer>
    </div>
  )
}
