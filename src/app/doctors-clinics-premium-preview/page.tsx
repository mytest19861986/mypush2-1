'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Stethoscope,
  Building2,
  FileCheck2,
  TrendingUp,
  Search,
  Filter,
  Sparkles,
  MapPin,
  Star,
  ShieldCheck,
  CalendarCheck,
  Percent,
  Plus,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LayoutGrid,
  List
} from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'

import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'

interface DoctorClinicMock {
  id: string
  name: string
  specialty: string
  clinicName: string
  location: string
  discountRate: string
  rating: string
  reviewsCount: number
  status: 'ACTIVE' | 'PENDING' | 'NEEDS_REVIEW' | 'INACTIVE'
  statusLabel: string
  activeContracts: string
  lastVisit: string
  avatarInitial: string
}

export default function DoctorsClinicsPremiumPreviewPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const doctorsList: DoctorClinicMock[] = [
    {
      id: 'DOC-101',
      name: 'دکتر علیرضا افشارزاده',
      specialty: 'جراحی فک و صورت و ایمپلنت',
      clinicName: 'کلینیک فوق‌تخصصی ونک',
      location: 'تهران، میدان ونک',
      discountRate: '۴۰٪ تخفیف حامی',
      rating: '۴.۹',
      reviewsCount: 184,
      status: 'ACTIVE',
      statusLabel: 'فعال و تاییدشده',
      activeContracts: 'طرح طلایی و نقره‌ای',
      lastVisit: '۱۰ دقیقه پیش',
      avatarInitial: 'ع'
    },
    {
      id: 'DOC-102',
      name: 'دکتر مریم شریفی',
      specialty: 'متخصص دندانپزشکی ترمیمی و زیبایی',
      clinicName: 'مرکز دندانپزشکی مهرگان',
      location: 'تهران، سعادت‌آباد',
      discountRate: '۳۵٪ تخفیف حامی',
      rating: '۴.۸',
      reviewsCount: 142,
      status: 'ACTIVE',
      statusLabel: 'فعال و تاییدشده',
      activeContracts: 'طرح طلایی',
      lastVisit: 'امروز ۱۶:۱۵',
      avatarInitial: 'م'
    },
    {
      id: 'DOC-103',
      name: 'دکتر کامران نادری',
      specialty: 'متخصص چشم و جراحی لیزیک',
      clinicName: 'بیمارستان و چشم‌پزشکی نگاه',
      location: 'تهران، خیابان شریعتی',
      discountRate: '۳۰٪ تخفیف حامی',
      rating: '۴.۷',
      reviewsCount: 96,
      status: 'PENDING',
      statusLabel: 'در انتظار تایید مدارک',
      activeContracts: 'در صف بازبینی',
      lastVisit: 'دیروز',
      avatarInitial: 'ک'
    },
    {
      id: 'DOC-104',
      name: 'دکتر هدی رضایی',
      specialty: 'متخصص پوست، مو و لیزر',
      clinicName: 'کلینیک تخصصی درماتولوژی آسا',
      location: 'تهران، پاسداران',
      discountRate: '۲۵٪ تخفیف حامی',
      rating: '۴.۶',
      reviewsCount: 75,
      status: 'NEEDS_REVIEW',
      statusLabel: 'نیازمند بررسی تعرفه',
      activeContracts: 'تمدید سالانه',
      lastVisit: '۳ روز پیش',
      avatarInitial: 'ه'
    },
  ]

  const filteredDoctors = doctorsList.filter((d) => {
    const matchSearch = d.name.includes(searchQuery) || d.clinicName.includes(searchQuery) || d.specialty.includes(searchQuery)
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <DashboardAppShell activeMenu="doctors">
      <div className="space-y-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                شبکه مراکز درمانی و پزشکان همکار
              </h1>
              <Badge variant="premium">
                <Sparkles className="size-3.5 text-primary" />
                <span>Healthcare Network v2</span>
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              پایش و ارزیابی پزشکان، کلینیک‌های طرف قرارداد، سقف تخفیف‌ها و اعتبار سنجی مجوزهای پزشکی
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                title="نمای کارتی"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                title="نمای جدولی"
              >
                <List className="size-4" />
              </button>
            </div>

            <Button variant="premium" size="sm" className="hidden sm:inline-flex gap-2 rounded-xl text-xs font-bold shadow-xs">
              <Plus className="size-4" />
              <span>ثبت پزشک / مرکز همکار</span>
            </Button>
          </div>
        </div>

        {/* Floating Action Button for Mobile (<640px) */}
        <div className="fixed bottom-6 end-6 z-40 sm:hidden">
          <Button
            variant="premium"
            size="lg"
            className="rounded-full shadow-xl text-xs font-bold gap-2 px-5 py-3 h-12 bg-[#0D5C58] hover:bg-[#0a4845] text-white flex items-center border border-white/20"
          >
            <Plus className="size-5" />
            <span>ثبت پزشک همکار</span>
          </Button>
        </div>

        {/* ─── KPI Section ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
          <PremiumMetricCard
            title="پزشکان فعال همکار"
            value="۳۲۸"
            trend="+۸ پزشک در این ماه"
            isUp={true}
            icon={Stethoscope}
            variant="green"
            badge="شبکه درمان"
          />
          <PremiumMetricCard
            title="مراکز و کلینیک‌های معتبر"
            value="۱۴۲"
            trend="پوشش ۱۲ منطقه کلیدی"
            isUp={true}
            icon={Building2}
            variant="blue"
            badge="شعب طرف قرارداد"
          />
          <PremiumMetricCard
            title="قراردادهای رسمی فعال"
            value="۴۵۶"
            description="تضمین تعرفه تا پایان سال"
            icon={FileCheck2}
            variant="amber"
            badge="تعهد تعرفه‌ای"
          />
          <PremiumMetricCard
            title="مراجعات ثبت‌شده ماه جاری"
            value="۳,۴۹۰"
            trend="↑ ۱۵.۳٪ رشد پذیرش"
            isUp={true}
            icon={TrendingUp}
            variant="purple"
            badge="تراکنش درمان"
          />
        </div>

      {/* ─── Search & Filter Bar ─── */}
      <Card variant="glass">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Input
              placeholder="جستجو با نام پزشک، نام مرکز یا تخصص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pe-10 bg-background/80 rounded-xl border-border/60"
            />
            <Search className="size-4 text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40 text-xs font-medium shrink-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
              >
                همه وضعیت‌ها
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ACTIVE' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
              >
                فعال
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'PENDING' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
              >
                در انتظار
              </button>
              <button
                onClick={() => setStatusFilter('NEEDS_REVIEW')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'NEEDS_REVIEW' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
              >
                نیازمند بررسی
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Content View: Grid or Table ─── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredDoctors.map((doc) => (
            <Card key={doc.id} variant="premium" className="group hover:border-primary/40 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/20 to-teal-500/10 text-primary font-extrabold text-lg flex items-center justify-center border border-primary/20 shadow-xs">
                      {doc.avatarInitial}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.specialty}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {doc.status === 'ACTIVE' && <Badge variant="success">فعال</Badge>}
                    {doc.status === 'PENDING' && <Badge variant="warning">در صف تایید</Badge>}
                    {doc.status === 'NEEDS_REVIEW' && <Badge variant="destructive">بازبینی تعرفه</Badge>}
                    
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="size-3.5 fill-amber-500" />
                      <span>{doc.rating}</span>
                      <span className="text-muted-foreground font-normal">({toPersianNum(doc.reviewsCount)})</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 text-xs">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <span className="truncate">{doc.clinicName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/80">
                    <MapPin className="size-4 text-primary shrink-0" />
                    <span className="truncate">{doc.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Percent className="size-4 shrink-0" />
                    <span>{doc.discountRate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-4 shrink-0" />
                    <span>آخرین ثبت: {doc.lastVisit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs font-mono text-muted-foreground">{doc.id}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                      سوابق مراجعات
                    </Button>
                    <Button variant="premium" size="sm" className="h-8 px-3 text-xs">
                      مدیریت قرارداد
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card variant="default" className="overflow-hidden border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-xs font-bold text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-4 px-6">پزشک / متخصص</th>
                  <th className="py-4 px-4">مرکز وابسته</th>
                  <th className="py-4 px-4">سقف تخفیف</th>
                  <th className="py-4 px-4">امتیاز</th>
                  <th className="py-4 px-4">وضعیت</th>
                  <th className="py-4 px-6 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20">
                          {doc.avatarInitial}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-foreground">
                      <p>{doc.clinicName}</p>
                      <p className="text-muted-foreground text-[11px]">{doc.location}</p>
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {doc.discountRate}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-amber-500">
                      ★ {doc.rating}
                    </td>
                    <td className="py-4 px-4">
                      {doc.status === 'ACTIVE' && <Badge variant="success">فعال</Badge>}
                      {doc.status === 'PENDING' && <Badge variant="warning">در انتظار</Badge>}
                      {doc.status === 'NEEDS_REVIEW' && <Badge variant="destructive">نیازمند بازبینی</Badge>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        مشاهده پروفایل
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </div>
    </DashboardAppShell>
  )
}
