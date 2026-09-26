'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Stethoscope,
  Building2,
  Search,
  Sparkles,
  MapPin,
  Star,
  Percent,
  Eye,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Edit3,
  Ban,
  Phone,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'
import { toast } from 'sonner'

interface DoctorClinicItem {
  id: string
  name: string
  firstName?: string
  lastName?: string
  mobile?: string
  medicalCode?: string
  specialty: string
  clinicName: string
  clinicAddress?: string
  location: string
  city?: string
  province?: string
  discountRate: string
  discountPercent?: number
  rating: string
  reviewsCount: number
  status: 'ACTIVE' | 'PENDING' | 'NEEDS_REVIEW' | 'INACTIVE' | 'REJECTED' | 'SUSPENDED'
  statusLabel: string
  activeContracts: string
  lastVisit: string
  avatarInitial: string
  bio?: string
}

const fallbackDoctors: DoctorClinicItem[] = [
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

export default function DoctorsClinicsPremiumPreviewPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [doctors, setDoctors] = useState<DoctorClinicItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View Modal state
  const [viewDoc, setViewDoc] = useState<DoctorClinicItem | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)

  // Edit Modal state
  const [editDoc, setEditDoc] = useState<DoctorClinicItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editSpecialty, setEditSpecialty] = useState('')
  const [editClinicName, setEditClinicName] = useState('')
  const [editClinicAddress, setEditClinicAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editProvince, setEditProvince] = useState('')
  const [editStatus, setEditStatus] = useState<string>('APPROVED')
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Status Action state
  const [statusActionDoc, setStatusActionDoc] = useState<DoctorClinicItem | null>(null)
  const [statusActionOpen, setStatusActionOpen] = useState(false)
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false)

  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    return headers
  }, [])

  // Fetch real doctors from API
  const fetchDoctors = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/doctors?limit=50', {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error('Failed to fetch doctors')
      }
      const json = await res.json()
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const mapped: DoctorClinicItem[] = json.data.map((d: any) => {
          const fn = d.user?.profile?.firstName ?? ''
          const ln = d.user?.profile?.lastName ?? ''
          const fullName = (fn || ln) ? `دکتر ${fn} ${ln}`.trim() : (d.clinicName || 'پزشک همکار')
          const loc = [d.province, d.city, d.clinicAddress].filter(Boolean).join('، ') || 'تهران'

          let statusLbl = 'فعال و تاییدشده'
          let mappedStatus: DoctorClinicItem['status'] = 'ACTIVE'
          if (d.status === 'PENDING') {
            statusLbl = 'در انتظار تایید'
            mappedStatus = 'PENDING'
          } else if (d.status === 'REJECTED' || d.status === 'SUSPENDED') {
            statusLbl = 'حساب غیرفعال / معلق'
            mappedStatus = 'SUSPENDED'
          } else {
            statusLbl = 'فعال و تاییدشده'
            mappedStatus = 'ACTIVE'
          }

          return {
            id: d.id,
            name: fullName,
            firstName: fn,
            lastName: ln,
            mobile: d.user?.mobile,
            medicalCode: d.medicalCode,
            specialty: d.specialty || 'پزشک عمومی / متخصص',
            clinicName: d.clinicName || 'مطب شخصی',
            clinicAddress: d.clinicAddress,
            location: loc,
            city: d.city,
            province: d.province,
            discountRate: `${toPersianNum(d.discountPercent ?? 30)}٪ تخفیف حامی`,
            discountPercent: d.discountPercent ?? 30,
            rating: '۴.۸',
            reviewsCount: d._count?.contracts ?? 0,
            status: mappedStatus,
            statusLabel: statusLbl,
            activeContracts: `${toPersianNum(d._count?.contracts ?? 0)} قرارداد فعال`,
            lastVisit: 'به‌تازگی',
            avatarInitial: fullName.replace('دکتر', '').trim().charAt(0) || 'د',
            bio: d.bio,
          }
        })
        setDoctors(mapped)
      } else {
        setDoctors(fallbackDoctors)
      }
    } catch {
      setDoctors(fallbackDoctors)
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  // Handle View Doctor Details
  const handleOpenView = async (doc: DoctorClinicItem) => {
    setViewDoc(doc)
    setViewModalOpen(true)
    setViewLoading(true)
    try {
      const res = await fetch(`/api/v1/doctors/${doc.id}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const detail = json.data
          setViewDoc(prev => prev ? ({
            ...prev,
            medicalCode: detail.medicalCode,
            specialty: detail.specialty,
            clinicName: detail.clinicName,
            clinicAddress: detail.clinicAddress,
            city: detail.city,
            province: detail.province,
            mobile: detail.user?.mobile || prev.mobile,
            bio: detail.bio,
          }) : null)
        }
      }
    } catch (err) {
      console.warn('View doctor fetch failed, showing cached', err)
    } finally {
      setViewLoading(false)
    }
  }

  // Handle Edit Doctor
  const handleOpenEdit = (doc: DoctorClinicItem) => {
    setEditDoc(doc)
    setEditSpecialty(doc.specialty || '')
    setEditClinicName(doc.clinicName || '')
    setEditClinicAddress(doc.clinicAddress || '')
    setEditCity(doc.city || 'تهران')
    setEditProvince(doc.province || 'تهران')
    setEditStatus(doc.status === 'ACTIVE' ? 'APPROVED' : doc.status === 'PENDING' ? 'PENDING' : 'SUSPENDED')
    setEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editDoc) return
    setIsSubmittingEdit(true)
    try {
      const res = await fetch(`/api/v1/doctors/${editDoc.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          specialty: editSpecialty.trim(),
          clinicName: editClinicName.trim(),
          clinicAddress: editClinicAddress.trim() || undefined,
          city: editCity.trim() || undefined,
          province: editProvince.trim() || undefined,
          status: editStatus,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('اطلاعات پزشک با موفقیت به‌روزرسانی شد')
        setEditModalOpen(false)
        fetchDoctors()
      } else {
        toast.error(json.message || 'خطا در ویرایش اطلاعات پزشک')
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // Handle Status Toggle (Approve / Suspend)
  const handleOpenStatusAction = (doc: DoctorClinicItem) => {
    setStatusActionDoc(doc)
    setStatusActionOpen(true)
  }

  const handleConfirmStatusToggle = async () => {
    if (!statusActionDoc) return
    setIsSubmittingStatus(true)
    const nextStatus = statusActionDoc.status === 'ACTIVE' ? 'SUSPENDED' : 'APPROVED'
    try {
      const res = await fetch(`/api/v1/doctors/${statusActionDoc.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(nextStatus === 'APPROVED' ? 'پزشک با موفقیت تأیید شد' : 'حساب پزشک معلق گردید')
        setStatusActionOpen(false)
        fetchDoctors()
      } else {
        toast.error(json.message || 'خطا در تغییر وضعیت پزشک')
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setIsSubmittingStatus(false)
    }
  }

  const filteredDoctors = doctors.filter((d) => {
    const matchSearch =
      d.name.includes(searchQuery) ||
      d.clinicName.includes(searchQuery) ||
      d.specialty.includes(searchQuery) ||
      (d.mobile && d.mobile.includes(searchQuery))
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && d.status === 'ACTIVE') ||
      (statusFilter === 'PENDING' && d.status === 'PENDING') ||
      (statusFilter === 'SUSPENDED' && d.status === 'SUSPENDED')
    return matchSearch && matchStatus
  })

  return (
    <DashboardAppShell activeMenu="doctors">
      <div className="space-y-8">
        {/* Header */}
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
              مدیریت پزشکان، قراردادها، تعرفه‌های تخفیف و بازبینی مدارک پزشکی
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDoctors}
              disabled={isLoading}
              className="gap-2 rounded-xl text-xs font-bold text-slate-700"
            >
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تازه‌سازی</span>
            </Button>
            <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                title="نمایش کارتی"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                title="نمایش جدولی"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
          <PremiumMetricCard
            title="پزشکان و مراکز همکار"
            value={toPersianNum(doctors.length.toString())}
            trend="کل رکوردها"
            isUp={true}
            icon={Stethoscope}
            variant="blue"
            badge="پزشکان"
          />
          <PremiumMetricCard
            title="پزشکان تاییدشده و فعال"
            value={toPersianNum(doctors.filter(d => d.status === 'ACTIVE').length.toString())}
            trend="دارای قرارداد معتبر"
            isUp={true}
            icon={Building2}
            variant="green"
            badge="قرارداد فعال"
          />
          <PremiumMetricCard
            title="در انتظار تایید نظام پزشکی"
            value={toPersianNum(doctors.filter(d => d.status === 'PENDING').length.toString())}
            description="صف بازبینی مدارک"
            icon={Clock}
            variant="amber"
            badge="صف بازبینی"
          />
          <PremiumMetricCard
            title="حساب‌های معلق یا غیرفعال"
            value={toPersianNum(doctors.filter(d => d.status === 'SUSPENDED').length.toString())}
            description="عدم تمدید قرارداد"
            icon={AlertTriangle}
            variant="purple"
            badge="بازبینی تعرفه"
          />
        </div>

        {/* Filter & Search Bar */}
        <Card variant="glass">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="جستجو با نام پزشک، تخصص یا مرکز درمانی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pe-10 bg-background/80 rounded-xl border-border/60"
              />
              <Search className="size-4 text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40 text-xs font-medium">
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
                  onClick={() => setStatusFilter('SUSPENDED')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'SUSPENDED' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  معلق
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Content (Table or Grid) */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDoctors.map((doc) => (
              <Card key={doc.id} variant="default" className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20">
                        {doc.avatarInitial}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground">{doc.name}</h3>
                        <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                      </div>
                    </div>
                    {doc.status === 'ACTIVE' && <Badge variant="success">فعال</Badge>}
                    {doc.status === 'PENDING' && <Badge variant="warning">در انتظار</Badge>}
                    {doc.status === 'SUSPENDED' && <Badge variant="destructive">معلق</Badge>}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="size-4 text-primary shrink-0" />
                      <span className="truncate">{doc.clinicName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4 text-primary shrink-0" />
                      <span className="truncate">{doc.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                      <Percent className="size-4 shrink-0" />
                      <span>{doc.discountRate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-xs font-mono text-muted-foreground">{doc.medicalCode || doc.id}</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="مشاهده"
                        onClick={() => handleOpenView(doc)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-primary"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="ویرایش"
                        onClick={() => handleOpenEdit(doc)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-blue-600"
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={doc.status === 'ACTIVE' ? 'تعلیق' : 'فعال‌سازی'}
                        onClick={() => handleOpenStatusAction(doc)}
                        className={`size-8 rounded-lg ${
                          doc.status === 'ACTIVE'
                            ? 'text-muted-foreground hover:text-destructive'
                            : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        {doc.status === 'ACTIVE' ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="default" className="overflow-hidden border border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 text-xs font-bold text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="py-4 px-6">پزشک / متخصص</th>
                    <th className="py-4 px-4">مرکز وابسته و آدرس</th>
                    <th className="py-4 px-4">تخفیف حامی</th>
                    <th className="py-4 px-4">شماره نظام پزشکی</th>
                    <th className="py-4 px-4">وضعیت</th>
                    <th className="py-4 px-6 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span>در حال بارگذاری لیست پزشکان...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doc) => (
                      <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6">
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => handleOpenView(doc)}
                          >
                            <div className="size-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-105 transition-transform">
                              {doc.avatarInitial}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                                {doc.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-foreground">
                          <p>{doc.clinicName}</p>
                          <p className="text-muted-foreground text-[11px] truncate max-w-[200px]">{doc.location}</p>
                        </td>
                        <td className="py-4 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {doc.discountRate}
                        </td>
                        <td className="py-4 px-4 text-xs font-mono text-muted-foreground">
                          {doc.medicalCode || 'ثبت نشده'}
                        </td>
                        <td className="py-4 px-4">
                          {doc.status === 'ACTIVE' && <Badge variant="success">فعال</Badge>}
                          {doc.status === 'PENDING' && <Badge variant="warning">در انتظار تایید</Badge>}
                          {doc.status === 'SUSPENDED' && <Badge variant="destructive">معلق</Badge>}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="مشاهده پروفایل"
                              onClick={() => handleOpenView(doc)}
                              className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="ویرایش مشخصات"
                              onClick={() => handleOpenEdit(doc)}
                              className="size-8 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit3 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={doc.status === 'ACTIVE' ? 'تعلیق حساب' : 'فعال‌سازی حساب'}
                              onClick={() => handleOpenStatusAction(doc)}
                              className={`size-8 rounded-lg transition-colors ${
                                doc.status === 'ACTIVE'
                                  ? 'text-muted-foreground hover:text-destructive hover:bg-red-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {doc.status === 'ACTIVE' ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                        هیچ پزشکی با مشخصات واردشده یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* ─── Modal 1: View Doctor Details ─── */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Stethoscope className="size-5 text-primary" />
              <span>مشخصات کامل پزشک / مرکز درمانی</span>
            </DialogTitle>
            <DialogDescription>
              اطلاعات نظام پزشکی، کلینیک، تعرفه تخفیف و قراردادهای همکار
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>در حال دریافت جزئیات پزشک...</span>
            </div>
          ) : viewDoc ? (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-4 rounded-xl border border-border/50">
                <div>
                  <span className="text-xs text-muted-foreground block">نام پزشک:</span>
                  <span className="font-bold text-foreground">{viewDoc.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">شماره نظام پزشکی:</span>
                  <span className="font-mono text-foreground">{viewDoc.medicalCode || 'ثبت نشده'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">تخصص:</span>
                  <span className="font-semibold text-foreground">{viewDoc.specialty}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">شماره تماس / موبایل:</span>
                  <span className="font-mono text-foreground">{viewDoc.mobile || 'ثبت نشده'}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground block">نام مرکز / کلینیک:</span>
                  <span className="font-bold text-foreground">{viewDoc.clinicName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground block">شهر و استان:</span>
                  <span className="text-foreground">{[viewDoc.province, viewDoc.city].filter(Boolean).join(' - ') || 'تهران'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground block">آدرس دقیق:</span>
                  <span className="text-foreground max-w-[240px] truncate">{viewDoc.clinicAddress || viewDoc.location}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground block">میزان تخفیف اعضا:</span>
                  <Badge variant="success" className="font-mono">{viewDoc.discountRate}</Badge>
                </div>
                {viewDoc.bio && (
                  <div className="text-xs pt-1 border-t border-border/30">
                    <span className="text-muted-foreground block mb-0.5">توضیحات و بیوگرافی:</span>
                    <p className="text-muted-foreground text-xs leading-relaxed">{viewDoc.bio}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setViewModalOpen(false)
                if (viewDoc) handleOpenEdit(viewDoc)
              }}
              className="gap-1.5"
            >
              <Edit3 className="size-4" />
              <span>ویرایش مشخصات</span>
            </Button>
            <Button onClick={() => setViewModalOpen(false)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Edit Doctor ─── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Edit3 className="size-5 text-blue-600" />
              <span>ویرایش اطلاعات پزشک و مطب</span>
            </DialogTitle>
            <DialogDescription>
              تغییر تخصص، نام مطب، آدرس و وضعیت قرارداد همکاری
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">تخصص پزشکی</label>
              <Input
                value={editSpecialty}
                onChange={(e) => setEditSpecialty(e.target.value)}
                placeholder="مثال: متخصص دندانپزشکی"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">نام کلینیک / مطب</label>
              <Input
                value={editClinicName}
                onChange={(e) => setEditClinicName(e.target.value)}
                placeholder="نام مرکز درمانی"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">استان</label>
                <Input
                  value={editProvince}
                  onChange={(e) => setEditProvince(e.target.value)}
                  placeholder="استان"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">شهر</label>
                <Input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="شهر"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">آدرس کامل مطب</label>
              <Input
                value={editClinicAddress}
                onChange={(e) => setEditClinicAddress(e.target.value)}
                placeholder="خیابان، پلاک، طبقه و واحد"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">وضعیت قرارداد و تأیید</label>
              <select
                aria-label="وضعیت قرارداد پزشک"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="APPROVED">تأییدشده و فعال (APPROVED)</option>
                <option value="PENDING">در انتظار بررسی مدارک (PENDING)</option>
                <option value="SUSPENDED">معلق / لغو قرارداد (SUSPENDED)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSubmittingEdit}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingEdit && <Loader2 className="size-4 animate-spin" />}
              <span>ذخیره تغییرات</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: Suspend / Activate Confirm ─── */}
      <Dialog open={statusActionOpen} onOpenChange={setStatusActionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {statusActionDoc?.status === 'ACTIVE' ? (
                <>
                  <Ban className="size-5 text-destructive" />
                  <span>تأیید تعلیق قرارداد پزشک</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <span>تأیید فعال‌سازی قرارداد پزشک</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {statusActionDoc?.status === 'ACTIVE'
                ? `آیا از تعلیق قرارداد همکاری «${statusActionDoc?.name}» اطمینان دارید؟ در این صورت نمایش این پزشک در لیست اعضای دارای تخفیف متوقف می‌شود.`
                : `آیا مایلید قرارداد «${statusActionDoc?.name}» مجدداً فعال و به شبکه همکاران متصل شود؟`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStatusActionOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleConfirmStatusToggle}
              disabled={isSubmittingStatus}
              variant={statusActionDoc?.status === 'ACTIVE' ? 'destructive' : 'default'}
              className="gap-2"
            >
              {isSubmittingStatus && <Loader2 className="size-4 animate-spin" />}
              <span>{statusActionDoc?.status === 'ACTIVE' ? 'تأیید و تعلیق' : 'تأیید و فعال‌سازی'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardAppShell>
  )
}
