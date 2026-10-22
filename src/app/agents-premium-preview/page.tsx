'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { toast } from 'sonner'
import {
  Briefcase,
  TrendingUp,
  Users,
  DollarSign,
  Search,
  Filter,
  Sparkles,
  MapPin,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Download,
  CreditCard,
  Building,
  UserCheck,
  Plus,
  Loader2,
  Phone,
  IdCard,
  Eye,
  RefreshCw,
  UserX,
  AlertTriangle
} from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'

import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'

interface AgentMock {
  id: string
  name: string
  branch: string
  location: string
  mobile?: string
  nationalCode?: string
  email?: string
  activeClientsCount: number
  totalSalesVolume: string
  totalCommissionPaid: string
  rank: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  statusLabel: string
  lastSale: string
  avatarInitial: string
}

interface SaleActivityMock {
  id: string
  clientName: string
  clientMobile: string
  planName: string
  agentName: string
  amount: string
  commission: string
  status: 'PAID' | 'PENDING' | 'REJECTED'
  statusLabel: string
  time: string
}

export default function AgentsPremiumPreviewPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [liveAgents, setLiveAgents] = useState<AgentMock[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  // Selected agent for details modal
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<any | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Status Action States
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusConfirmAction, setStatusConfirmAction] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED' | null>(null)

  const handleUpdateAgentStatus = async (status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    if (!selectedAgentDetail?.id || isUpdatingStatus) return
    setIsUpdatingStatus(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken')
        if (token) headers['X-App-Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`/api/v1/agents/${selectedAgentDetail.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      })
      const json = await res.json()

      if (res.ok && json.success) {
        toast.success(
          status === 'APPROVED'
            ? 'پرونده همکار فروش با موفقیت تایید شد و دسترسی همکار فعال گردید'
            : status === 'REJECTED'
            ? 'درخواست همکاری با موفقیت رد شد'
            : 'وضعیت نماینده با موفقیت به حالت تعلیق تغییر یافت'
        )
        setStatusConfirmAction(null)
        // Refresh agent detail and list
        await openAgentDetails(selectedAgentDetail.id)
        await fetchAgents()
      } else {
        toast.error(json.error?.message || 'خطا در تغییر وضعیت همکار فروش')
      }
    } catch (err) {
      toast.error('ارتباط با سرور جهت تغییر وضعیت نماینده برقرار نشد')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const fetchAgents = React.useCallback(async () => {
    setIsLoadingAgents(true)
    setApiError(null)
    try {
      const headers: Record<string, string> = {}
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken')
        if (token) headers['X-App-Authorization'] = `Bearer ${token}`
      }
      const res = await fetch('/api/v1/agents?limit=50', { headers })
      const json = await res.json()
      if (res.ok && json.success && Array.isArray(json.data)) {
        const mapped: AgentMock[] = json.data.map((item: any, idx: number) => {
          const profile = item.user?.profile
          const name = profile?.firstName || profile?.lastName
            ? `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
            : item.businessName || `همکار شماره ${idx + 1}`
          const mobile = item.user?.mobile || 'ثبت نشده'
          const nationalCode = profile?.nationalCode || 'نامشخص'
          const status = item.status === 'APPROVED' ? 'ACTIVE' : item.status === 'PENDING' ? 'PENDING' : 'SUSPENDED'
          const initial = name ? name.charAt(0) : 'ن'
          return {
            id: item.id,
            name,
            branch: item.businessName || 'نمایندگی حامی',
            location: item.description || 'ثبت‌شده در سامانه',
            mobile,
            nationalCode,
            email: item.user?.email || null,
            activeClientsCount: item._count?.documents || 0,
            totalSalesVolume: 'به‌روزرسانی خودکار',
            totalCommissionPaid: 'محاسبه در دوره تسویه',
            rank: status === 'ACTIVE' ? 'همکار تاییدشده' : 'در صف بررسی مدارک',
            status,
            statusLabel: status === 'ACTIVE' ? 'فعال و تاییدشده' : 'در صف احراز هویت',
            lastSale: item.createdAt ? new Date(item.createdAt).toLocaleDateString('fa-IR') : 'به‌تازگی',
            avatarInitial: initial,
          }
        })
        setLiveAgents(mapped)
      } else {
        setApiError(json.error?.message || 'خطا در واکشی فهرست نمایندگان')
      }
    } catch (err) {
      setApiError('ارتباط با سرور جهت دریافت فهرست نمایندگان برقرار نشد')
    } finally {
      setIsLoadingAgents(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const openAgentDetails = async (agentId: string) => {
    setIsLoadingDetail(true)
    setDetailModalOpen(true)
    try {
      const headers: Record<string, string> = {}
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken')
        if (token) headers['X-App-Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`/api/v1/agents/${agentId}`, { headers })
      const json = await res.json()
      if (res.ok && json.success && json.data) {
        setSelectedAgentDetail(json.data)
      } else {
        toast.error(json.error?.message || 'خطا در دریافت جزئیات پرونده نماینده')
      }
    } catch {
      toast.error('ارتباط با سرور برای دریافت جزئیات برقرار نشد')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const agents: AgentMock[] = liveAgents.length > 0 ? liveAgents : [
    {
      id: 'AG-201',
      name: 'پیمان حسینی',
      branch: 'شعبه مرکزی غرب تهران',
      location: 'تهران، صادقیه',
      mobile: '۰۹۱۲***۸۸۱۱',
      nationalCode: '۰۰۱****۴۵۶',
      activeClientsCount: 342,
      totalSalesVolume: '۳۸۰,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۵۷,۰۰۰,۰۰۰ تومان',
      rank: 'رتبه ۱ فروش (VIP)',
      status: 'ACTIVE',
      statusLabel: 'فعال و تاییدشده',
      lastSale: '۱۵ دقیقه پیش',
      avatarInitial: 'پ'
    },
    {
      id: 'AG-202',
      name: 'الهام سلیمی',
      branch: 'نمایندگی منطقه سعادت‌آباد',
      location: 'تهران، سعادت‌آباد',
      mobile: '۰۹۱۹***۴۴۲۲',
      nationalCode: '۰۴۵****۷۸۹',
      activeClientsCount: 285,
      totalSalesVolume: '۳۱۰,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۴۶,۵۰۰,۰۰۰ تومان',
      rank: 'رتبه ۲ فروش',
      status: 'ACTIVE',
      statusLabel: 'فعال و تاییدشده',
      lastSale: '۲ ساعت پیش',
      avatarInitial: 'ا'
    },
    {
      id: 'AG-203',
      name: 'شرکت خدمات نوین مهر',
      branch: 'نمایندگی حقوقی و سازمانی',
      location: 'تهران، مطهری',
      mobile: '۰۹۱۲***۳۳۲۲',
      nationalCode: '۱۰۱۰****۹۹۰',
      activeClientsCount: 520,
      totalSalesVolume: '۵۴۰,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۸۱,۰۰۰,۰۰۰ تومان',
      rank: 'نماینده طلایی سازمانی',
      status: 'ACTIVE',
      statusLabel: 'قرارداد کلان',
      lastSale: 'امروز ۱۱:۰۰',
      avatarInitial: 'ش'
    },
    {
      id: 'AG-204',
      name: 'فرهاد بهرامی',
      branch: 'دفتر نمایندگی شرق',
      location: 'تهران، تهرانپارس',
      mobile: '۰۹۳۵***۵۵۴۴',
      nationalCode: '۰۰۷****۱۲۳',
      activeClientsCount: 64,
      totalSalesVolume: '۵۸,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۸,۷۰۰,۰۰۰ تومان',
      rank: 'همکار در حال توسعه',
      status: 'PENDING',
      statusLabel: 'در صف احراز مدارک',
      lastSale: '۳ روز پیش',
      avatarInitial: 'ف'
    },
  ]

  const recentSales: SaleActivityMock[] = [
    {
      id: 'TX-901',
      clientName: 'سارا میرزایی',
      clientMobile: '۰۹۱۲***۸۸۱۱',
      planName: 'طرح طلایی یک‌ساله',
      agentName: 'پیمان حسینی',
      amount: '۲,۵۰۰,۰۰۰ تومان',
      commission: '۳۷۵,۰۰۰ تومان',
      status: 'PAID',
      statusLabel: 'تسویه دستی انجام‌شده (نمونه نمایشی)',
      time: '۱۵ دقیقه پیش'
    },
    {
      id: 'TX-902',
      clientName: 'حمیدرضا کیانی',
      clientMobile: '۰۹۱۹***۴۴۲۲',
      planName: 'طرح نقره‌ای خانواده',
      agentName: 'الهام سلیمی',
      amount: '۱,۸۰۰,۰۰۰ تومان',
      commission: '۲۷۰,۰۰۰ تومان',
      status: 'PAID',
      statusLabel: 'تسویه دستی انجام‌شده (نمونه نمایشی)',
      time: '۱ ساعت پیش'
    },
    {
      id: 'TX-903',
      clientName: 'نیلوفر امینی',
      clientMobile: '۰۹۳۵***۱۱۹۹',
      planName: 'طرح دندانپزشکی انفرادی',
      agentName: 'شرکت خدمات نوین مهر',
      amount: '۱,۲۰۰,۰۰۰ تومان',
      commission: '۱۸۰,۰۰۰ تومان',
      status: 'PENDING',
      statusLabel: 'در انتظار بررسی واریز دستی (نمونه نمایشی)',
      time: '۳ ساعت پیش'
    },
  ]

  // Create Agent Modal state
  const [createAgentModalOpen, setCreateAgentModalOpen] = useState(false)
  const [createAgentMobile, setCreateAgentMobile] = useState('')
  const [createAgentFirstName, setCreateAgentFirstName] = useState('')
  const [createAgentLastName, setCreateAgentLastName] = useState('')
  const [createAgentNationalCode, setCreateAgentNationalCode] = useState('')
  const [createAgentBusinessName, setCreateAgentBusinessName] = useState('')
  const [createAgentDescription, setCreateAgentDescription] = useState('')
  const [createAgentAddress, setCreateAgentAddress] = useState('')
  const [isSubmittingCreateAgent, setIsSubmittingCreateAgent] = useState(false)

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createAgentMobile.trim() || !createAgentFirstName.trim() || !createAgentLastName.trim() || !createAgentBusinessName.trim()) {
      toast.error('لطفاً فیلدهای الزامی (موبایل، نام، نام خانوادگی و نام تجاری) را تکمیل کنید')
      return
    }
    setIsSubmittingCreateAgent(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken')
        if (token) headers['X-App-Authorization'] = `Bearer ${token}`
      }
      const res = await fetch('/api/v1/admin/agents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mobile: createAgentMobile.trim(),
          firstName: createAgentFirstName.trim(),
          lastName: createAgentLastName.trim(),
          nationalCode: createAgentNationalCode.trim() || undefined,
          businessName: createAgentBusinessName.trim(),
          description: createAgentDescription.trim() || undefined,
          address: createAgentAddress.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('پرونده نماینده با موفقیت در وضعیت در انتظار بررسی (PENDING) ثبت شد')
        setCreateAgentModalOpen(false)
        setCreateAgentMobile('')
        setCreateAgentFirstName('')
        setCreateAgentLastName('')
        setCreateAgentNationalCode('')
        setCreateAgentBusinessName('')
        setCreateAgentDescription('')
        setCreateAgentAddress('')
      } else {
        toast.error(json.error?.message || json.message || 'خطا در ثبت نماینده')
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setIsSubmittingCreateAgent(false)
    }
  }

  const filteredAgents = agents.filter((a) => {
    const matchSearch = a.name.includes(searchQuery) || a.branch.includes(searchQuery) || a.location.includes(searchQuery)
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <DashboardAppShell activeMenu="agents" requireAdmin={false}>
      <div className="space-y-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                مرکز رشد و مدیریت شبکه نمایندگان فروش
              </h1>
              <Badge variant="premium">
                <Sparkles className="size-3.5 text-primary" />
                <span>Sales Network Intelligence v2</span>
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              پایش لحظه‌ای عملکرد فروش، مدیریت خطوط کمیسیون، تسویه‌های مالی و جذب نمایندگان حقوقی و حقیقی
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-bold text-slate-700">
              <Download className="size-4" />
              <span>خروجی مالی کمیسیون</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateAgentModalOpen(true)}
              className="hidden sm:inline-flex gap-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="size-4" />
              <span>ثبت قرارداد نماینده جدید</span>
            </Button>
          </div>
        </div>

        {/* Floating Action Button for Mobile (<640px) */}
        <div className="fixed bottom-6 end-6 z-40 sm:hidden">
          <Button
            variant="default"
            size="lg"
            onClick={() => setCreateAgentModalOpen(true)}
            className="rounded-full shadow-xl text-xs font-bold gap-2 px-5 py-3 h-12 bg-[#0D5C58] hover:bg-[#0a4845] text-white flex items-center border border-white/20 cursor-pointer"
          >
            <Plus className="size-5" />
            <span>ثبت نماینده جدید</span>
          </Button>
        </div>

        {/* ─── KPI Section ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
          <PremiumMetricCard
            title="همکاران فعال (نمونه نمایشی)"
            value="۸۶"
            trend="داده‌های دمو"
            isUp={true}
            icon={Briefcase}
            variant="blue"
            badge="نمونه نمایشی"
          />
          <PremiumMetricCard
            title="حجم فروش کل (نمونه نمایشی)"
            value="۱,۴۲۰M"
            unit="تومان"
            trend="داده‌های دمو"
            isUp={true}
            icon={TrendingUp}
            variant="green"
            badge="نمونه نمایشی"
          />
          <PremiumMetricCard
            title="مشتریان فعال (نمونه نمایشی)"
            value="۱,۷۴۰"
            trend="داده‌های دمو"
            isUp={true}
            icon={Users}
            variant="amber"
            badge="نمونه نمایشی"
          />
          <PremiumMetricCard
            title="مجموع کمیسیون‌ها (نمونه نمایشی)"
            value="۲۱۸.۵M"
            unit="تومان"
            description="محاسبه سیستمی / تسویه دستی"
            icon={DollarSign}
            variant="purple"
            badge="نمونه نمایشی"
          />
        </div>

      {/* ─── Filter & Search ─── */}
      <Card variant="glass">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Input
              placeholder="جستجو بر اساس نام نماینده، شعبه یا منطقه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pe-10 bg-background/80 rounded-xl border-border/60"
            />
            <Search className="size-4 text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
            >
              همه نمایندگان
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
              در انتظار تایید
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Agent Performance Showcase Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} variant="premium" className="group hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/20 to-teal-500/10 text-primary font-extrabold text-lg flex items-center justify-center border border-primary/20 shadow-xs">
                    {agent.avatarInitial}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{agent.branch}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {agent.status === 'ACTIVE' && <Badge variant="success">همکار تاییدشده</Badge>}
                  {agent.status === 'PENDING' && <Badge variant="warning">در صف احراز</Badge>}
                  <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary bg-primary/5">
                    {agent.rank}
                  </Badge>
                </div>
              </div>

              {/* Contact & Identity Info Badge Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <Phone className="size-3.5 text-primary" />
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold" dir="ltr">{agent.mobile || 'ثبت نشده'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <IdCard className="size-3.5 text-teal-600 dark:text-teal-400" />
                  <span>کد ملی:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold" dir="ltr">{agent.nationalCode || 'ثبت نشده'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                <div>
                  <p className="text-muted-foreground">مشتریان جذب‌شده:</p>
                  <p className="font-bold text-foreground mt-0.5 text-sm">{toPersianNum(agent.activeClientsCount)} نفر</p>
                </div>
                <div>
                  <p className="text-muted-foreground">مجموع حجم فروش:</p>
                  <p className="font-bold text-foreground mt-0.5 text-sm">{agent.totalSalesVolume}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">کمیسیون تسویه‌شده:</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 text-sm">{agent.totalCommissionPaid}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">آخرین فعالیت ثبت‌شده:</p>
                  <p className="font-semibold text-foreground mt-0.5">{agent.lastSale}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-border/40 gap-2">
                <span className="text-xs font-mono text-muted-foreground">{agent.id}</span>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 px-2.5 sm:px-3 text-xs cursor-pointer flex-1 sm:flex-none gap-1.5"
                    onClick={() => openAgentDetails(agent.id)}
                  >
                    <Eye className="size-3.5 text-primary" />
                    <span>مشاهده پرونده</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2.5 sm:px-3 text-xs cursor-pointer flex-1 sm:flex-none"
                    onClick={() => router.push(`/admin/sales-customers?agent=${encodeURIComponent(agent.name)}`)}
                  >
                    ریز عملکرد
                  </Button>
                  <Button 
                    variant="premium" 
                    size="sm" 
                    className="h-8 px-2.5 sm:px-3 text-xs cursor-pointer flex-1 sm:flex-none"
                    onClick={() => router.push(`/admin/commissions?agent=${encodeURIComponent(agent.name)}`)}
                  >
                    مدیریت مالی و تسویه
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Sales Activity Table ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span>آخرین تراکنش‌ها و فروش‌های ارجاعی نمایندگان (نمونه نمایشی)</span>
          </h2>
          <span className="text-xs text-muted-foreground">پرداخت و تسویه به صورت دستی با تایید مدیر</span>
        </div>

        <Card variant="default" className="overflow-hidden border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-xs font-bold text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-4 px-6">مشتری ارجاعی</th>
                  <th className="py-4 px-4">طرح انتخابی</th>
                  <th className="py-4 px-4">نماینده معرف</th>
                  <th className="py-4 px-4">مبلغ تراکنش</th>
                  <th className="py-4 px-4">سهم کمیسیون</th>
                  <th className="py-4 px-4">وضعیت تسویه</th>
                  <th className="py-4 px-6 text-center">زمان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-foreground">{sale.clientName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sale.clientMobile}</div>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-foreground">
                      {sale.planName}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-muted-foreground">
                      {sale.agentName}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold font-mono text-foreground">
                      {sale.amount}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {sale.commission}
                    </td>
                    <td className="py-4 px-4">
                      {sale.status === 'PAID' ? (
                        <Badge variant="success">تسویه دستی انجام‌شده (نمونه آزمایشی)</Badge>
                      ) : (
                        <Badge variant="warning">در انتظار بررسی واریز دستی (نمونه آزمایشی)</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-muted-foreground text-center font-mono">
                      {sale.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ─── Modal: Create Agent Modal ─── */}
      <Dialog open={createAgentModalOpen} onOpenChange={setCreateAgentModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Plus className="size-5 text-primary" />
              <span>ثبت پرونده و قرارداد نماینده جدید</span>
            </DialogTitle>
            <DialogDescription>
              ایجاد پرونده نماینده با وضعیت اولیه «در انتظار بررسی» (PENDING) جهت احراز شرایط و صدور کد کارگزاری
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAgent} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">نام نماینده / رابط *</label>
                <Input
                  value={createAgentFirstName}
                  onChange={(e) => setCreateAgentFirstName(e.target.value)}
                  placeholder="مثال: پیمان"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">نام خانوادگی *</label>
                <Input
                  value={createAgentLastName}
                  onChange={(e) => setCreateAgentLastName(e.target.value)}
                  placeholder="مثال: حسینی"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">شماره موبایل *</label>
                <Input
                  type="tel"
                  dir="ltr"
                  value={createAgentMobile}
                  onChange={(e) => setCreateAgentMobile(e.target.value)}
                  placeholder="09121234567"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">نام تجاری یا عنوان دفتر *</label>
                <Input
                  value={createAgentBusinessName}
                  onChange={(e) => setCreateAgentBusinessName(e.target.value)}
                  placeholder="مثال: نمایندگی البرز مرکزی"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">کد ملی (اختیاری)</label>
              <Input
                dir="ltr"
                maxLength={10}
                value={createAgentNationalCode}
                onChange={(e) => setCreateAgentNationalCode(e.target.value)}
                placeholder="۱۰ رقم"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">آدرس دفتر / محل فعالیت</label>
              <Input
                value={createAgentAddress}
                onChange={(e) => setCreateAgentAddress(e.target.value)}
                placeholder="شهر، خیابان و شماره دفتر"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">توضیحات و سوابق فعالیت</label>
              <Input
                value={createAgentDescription}
                onChange={(e) => setCreateAgentDescription(e.target.value)}
                placeholder="توضیحات مختصر در مورد حیطه و سابقه فروش"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateAgentModalOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={isSubmittingCreateAgent} className="gap-2">
                {isSubmittingCreateAgent && <Loader2 className="size-4 animate-spin" />}
                <span>ثبت پرونده نماینده</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ─── Agent Detail Modal Dialog ─── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="size-5 text-primary" />
              <span>مشخصات و پرونده کامل همکار فروش</span>
            </DialogTitle>
            <DialogDescription>
              اطلاعات هویتی، تماس و وضعیت سیستمی نماینده در سامانه مرکزی
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">در حال بارگذاری اطلاعات پرونده نماینده...</p>
            </div>
          ) : selectedAgentDetail ? (
            <div className="space-y-4 py-2 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <div className="size-12 rounded-xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20">
                  {selectedAgentDetail.businessName?.charAt(0) || 'ن'}
                </div>
                <div>
                  <h4 className="font-bold text-base text-foreground">{selectedAgentDetail.businessName}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">شناسه سیستمی: <span className="font-mono">{selectedAgentDetail.id}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-muted-foreground">نام و نام خانوادگی:</p>
                  <p className="font-bold text-foreground mt-1 text-sm">
                    {selectedAgentDetail.user?.profile?.firstName || ''} {selectedAgentDetail.user?.profile?.lastName || 'ثبت‌نشده'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-muted-foreground">شماره تماس همراه:</p>
                  <p className="font-bold font-mono text-foreground mt-1 text-sm text-primary" dir="ltr">
                    {selectedAgentDetail.user?.mobile || 'ثبت‌نشده'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-muted-foreground">کد ملی نماینده:</p>
                  <p className="font-bold font-mono text-foreground mt-1 text-sm text-teal-600 dark:text-teal-400" dir="ltr">
                    {selectedAgentDetail.user?.profile?.nationalCode || 'ثبت‌نشده'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-muted-foreground">وضعیت پرونده:</p>
                  <p className="font-bold mt-1 text-sm">
                    {selectedAgentDetail.status === 'APPROVED' ? (
                      <Badge variant="success">همکار تاییدشده</Badge>
                    ) : selectedAgentDetail.status === 'PENDING' ? (
                      <Badge variant="warning">در صف احراز هویت (در انتظار تایید)</Badge>
                    ) : selectedAgentDetail.status === 'REJECTED' ? (
                      <Badge variant="destructive">رد شده</Badge>
                    ) : (
                      <Badge variant="secondary">معلق‌شده</Badge>
                    )}
                  </p>
                </div>
              </div>

              {selectedAgentDetail.description && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
                  <p className="text-muted-foreground">توضیحات و زمینه فعالیت:</p>
                  <p className="text-foreground mt-1 leading-relaxed">{selectedAgentDetail.description}</p>
                </div>
              )}

              <div className="text-[11px] text-muted-foreground space-y-1 pt-2 border-t border-border/40">
                <p>تاریخ عضویت: {new Date(selectedAgentDetail.createdAt).toLocaleDateString('fa-IR')}</p>
                <p>تعداد اسناد و قراردادهای ثبت‌شده: {selectedAgentDetail._count?.documents || 0} مورد</p>
              </div>

              {/* Confirmation Alert Box */}
              {statusConfirmAction && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>
                      {statusConfirmAction === 'APPROVED' && 'آیا از تایید این همکار فروش و اعطای دسترسی‌های سازمانی اطمینان دارید؟'}
                      {statusConfirmAction === 'REJECTED' && 'آیا از رد درخواست همکاری و سلب دسترسی همکار اطمینان دارید؟'}
                      {statusConfirmAction === 'SUSPENDED' && 'آیا از تعلیق حساب و غیرفعال‌سازی موقت این نماینده اطمینان دارید؟'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUpdatingStatus}
                      onClick={() => setStatusConfirmAction(null)}
                      className="h-7 text-xs"
                    >
                      انصراف
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isUpdatingStatus}
                      className={`h-7 text-xs gap-1.5 ${
                        statusConfirmAction === 'APPROVED'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : statusConfirmAction === 'REJECTED'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                      onClick={() => handleUpdateAgentStatus(statusConfirmAction)}
                    >
                      {isUpdatingStatus && <Loader2 className="size-3 animate-spin" />}
                      <span>تایید و اعمال نهایی</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-center py-6 text-muted-foreground">اطلاعاتی برای نمایش یافت نشد</p>
          )}

          <DialogFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedAgentDetail && selectedAgentDetail.status === 'PENDING' && !statusConfirmAction && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isUpdatingStatus}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-xs"
                    onClick={() => setStatusConfirmAction('APPROVED')}
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>تایید همکار فروش</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUpdatingStatus}
                    className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1.5 text-xs"
                    onClick={() => setStatusConfirmAction('REJECTED')}
                  >
                    <UserX className="size-3.5" />
                    <span>رد درخواست</span>
                  </Button>
                </>
              )}

              {selectedAgentDetail && selectedAgentDetail.status === 'APPROVED' && !statusConfirmAction && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isUpdatingStatus}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 gap-1.5 text-xs"
                  onClick={() => setStatusConfirmAction('SUSPENDED')}
                >
                  <AlertTriangle className="size-3.5" />
                  <span>تعلیق همکار</span>
                </Button>
              )}

              {selectedAgentDetail && (selectedAgentDetail.status === 'REJECTED' || selectedAgentDetail.status === 'SUSPENDED') && !statusConfirmAction && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isUpdatingStatus}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-xs"
                  onClick={() => setStatusConfirmAction('APPROVED')}
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>تایید مجدد همکار</span>
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => {
                setStatusConfirmAction(null)
                setDetailModalOpen(false)
              }}
            >
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardAppShell>
  )
}
