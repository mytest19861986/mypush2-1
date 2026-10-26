'use client'

import { AdminAgentRecentCommissions } from '@/components/shared/admin-agent-recent-commissions'
import { AdminUserRoleAssignment } from '@/components/shared/admin-user-role-assignment'

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
import { JalaliIsoDateRangeFilter } from '@/components/shared/jalali-iso-date-range-filter'
import { apiClient } from '@/lib/api-client'
import { getReportErrorMessage } from '@/lib/report-client'
import { formatReportMonthRange } from '@/utils/report-month-label'

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
  AlertTriangle,
  BarChart3
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
  documentCount: number
  totalCommissionPaid: string
  rank: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  statusLabel: string
  lastSale: string
  avatarInitial: string
}

export default function AgentsPremiumPreviewPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [liveAgents, setLiveAgents] = useState<AgentMock[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  // Selected agent for details modal
  const detailRequestId = React.useRef(0)
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<any | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Status Action States
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusConfirmAction, setStatusConfirmAction] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED' | null>(null)
  const [statusReason, setStatusReason] = useState('')

  // Financial Performance Modal States
  const [perfAgent, setPerfAgent] = useState<AgentMock | null>(null)
  const [perfModalOpen, setPerfModalOpen] = useState(false)
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfData, setPerfData] = useState<{
    metrics: {
      totalAttributedSales: number
      totalEarnedCommission: number
      totalPaidCommission: number
      unpaidBalance: number
      totalPendingCommission: number
      commissionCount: number
      settlementCount: number
    }
    definitions: Record<string, string>
    monthlyBreakdown: Array<{
      yearMonth: string
      earnedCommission: number
      paidCommission: number
      referralCount: number
    }>
  } | null>(null)
  const [perfStartDate, setPerfStartDate] = useState('')
  const [perfEndDate, setPerfEndDate] = useState('')
  const [perfError, setPerfError] = useState<string | null>(null)
  const perfRequestId = React.useRef(0)

  const fetchAgentPerformance = async (agentId: string, start?: string, end?: string) => {
    const requestId = ++perfRequestId.current
    setPerfLoading(true)
    setPerfData(null)
    setPerfError(null)
    try {
      const params = new URLSearchParams()
      if (start) params.set('startDate', start)
      if (end) params.set('endDate', end)
      const q = params.toString() ? `?${params.toString()}` : ''
      const data = await apiClient.request<NonNullable<typeof perfData>>(
        'GET', `/agents/${agentId}/performance${q}`
      )
      if (!data?.metrics || typeof data.metrics.totalEarnedCommission !== 'number') throw new Error('ساختار پاسخ گزارش معتبر نیست.')
      if (requestId === perfRequestId.current) setPerfData(data)
    } catch (error: unknown) {
      if (requestId !== perfRequestId.current) return
      const message = getReportErrorMessage(error)
      setPerfError(message)
      toast.error(message)
    } finally {
      if (requestId === perfRequestId.current) setPerfLoading(false)
    }
  }

  const handleOpenPerformance = (agent: AgentMock) => {
    setPerfAgent(agent)
    setPerfData(null)
    setPerfStartDate('')
    setPerfEndDate('')
    setPerfModalOpen(true)
    fetchAgentPerformance(agent.id)
  }


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
        body: JSON.stringify({
          status,
          reason: statusReason.trim() || undefined,
        })
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
        setStatusReason('')
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
          const status = item.status === 'APPROVED' ? 'ACTIVE' : ['PENDING', 'UNDER_REVIEW'].includes(item.status) ? 'PENDING' : 'SUSPENDED'
          const initial = name ? name.charAt(0) : 'ن'
          return {
            id: item.id,
            name,
            branch: item.businessName || 'نمایندگی حامی',
            location: item.description || 'ثبت‌شده در سامانه',
            mobile,
            nationalCode,
            email: item.user?.email || null,
            activeClientsCount: item.stats?.registeredCustomers ?? 0,
            documentCount: item._count?.documents ?? 0,
            totalCommissionPaid: item.stats ? `${Number(item.stats.paidCommission).toLocaleString('fa-IR')} تومان` : 'در دسترس نیست',
            rank: status === 'ACTIVE' ? 'همکار تاییدشده' : 'در صف بررسی مدارک',
            status,
            statusLabel: ({ APPROVED: 'تأییدشده', PENDING: 'در انتظار بررسی', UNDER_REVIEW: 'در حال بررسی', REJECTED: 'ردشده', SUSPENDED: 'تعلیق' } as Record<string, string>)[item.status] || 'نامشخص',
            lastSale: item.createdAt ? new Date(item.createdAt).toLocaleDateString('fa-IR') : 'به‌تازگی',
            avatarInitial: initial,
          }
        })
        setLiveAgents(mapped)
      } else {
        setLiveAgents([])
        setApiError(json.error?.message || 'خطا در واکشی فهرست نمایندگان')
      }
    } catch (err) {
      setLiveAgents([])
      setApiError('ارتباط با سرور جهت دریافت فهرست نمایندگان برقرار نشد')
    } finally {
      setIsLoadingAgents(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const openAgentDetails = async (agentId: string) => {
    const requestId = ++detailRequestId.current
    setSelectedAgentDetail(null)
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
      if (requestId !== detailRequestId.current) return
      if (res.ok && json.success && json.data) {
        setSelectedAgentDetail(json.data)
      } else {
        toast.error(json.error?.message || 'خطا در دریافت جزئیات پرونده نماینده')
      }
    } catch {
      toast.error('ارتباط با سرور برای دریافت جزئیات برقرار نشد')
    } finally {
      if (requestId === detailRequestId.current) setIsLoadingDetail(false)
    }
  }

  const agents: AgentMock[] = liveAgents

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
            title="همکاران تأییدشده در فهرست"
            value={isLoadingAgents || apiError ? '—' : String(agents.filter(agent => agent.status === 'ACTIVE').length)}
            isUp={true}
            icon={Briefcase}
            variant="blue"
          />
          <PremiumMetricCard
            title="همکاران در انتظار در فهرست"
            value={isLoadingAgents || apiError ? '—' : String(agents.filter(agent => agent.status === 'PENDING').length)}
            isUp={true}
            icon={TrendingUp}
            variant="green"
          />
          <PremiumMetricCard
            title="مشتریان ثبت‌شده همکاران فهرست"
            value={isLoadingAgents || apiError ? '—' : String(agents.reduce((sum, agent) => sum + agent.activeClientsCount, 0))}
            isUp={true}
            icon={Users}
            variant="amber"
          />
          <PremiumMetricCard
            title="تعداد همکاران در فهرست"
            value={isLoadingAgents || apiError ? '—' : String(agents.length)}
            description="حداکثر ۵۰ مورد اخیر؛ آمار این کارت‌ها مربوط به همین فهرست است."
            icon={DollarSign}
            variant="purple"
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

      {isLoadingAgents && <p role="status" className="rounded-xl border p-6 text-center text-sm">در حال دریافت فهرست همکاران…</p>}
      {apiError && <div role="alert" className="space-y-3 rounded-xl border border-red-200 p-4 text-sm text-red-700"><p>{apiError}</p><Button type="button" variant="outline" onClick={() => void fetchAgents()}>تلاش مجدد</Button></div>}
      {!isLoadingAgents && !apiError && filteredAgents.length === 0 && <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">همکاری مطابق فیلترها یافت نشد.</p>}
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
                  {agent.status === 'PENDING' && <Badge variant="warning">{agent.statusLabel}</Badge>}
                  {agent.status === 'SUSPENDED' && <Badge variant="outline">{agent.statusLabel}</Badge>}
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
                  <p className="text-muted-foreground">مدارک ثبت‌شده:</p>
                  <p className="font-bold text-foreground mt-0.5 text-sm">{toPersianNum(agent.documentCount)} مورد</p>
                </div>
                <div>
                  <p className="text-muted-foreground">پورسانت با وضعیت پرداخت‌شده:</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 text-sm">{agent.totalCommissionPaid}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">تاریخ عضویت:</p>
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
                    className="h-8 px-2.5 sm:px-3 text-xs cursor-pointer flex-1 sm:flex-none gap-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                    onClick={() => handleOpenPerformance(agent)}
                  >
                    <BarChart3 className="size-3.5" />
                    <span>عملکرد مالی</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2.5 sm:px-3 text-xs cursor-pointer flex-1 sm:flex-none"
                    onClick={() => router.push(`/admin/agents/${encodeURIComponent(agent.id)}`)}
                  >
                    ریز عملکرد
                  </Button>

                  <Button 
                    variant="premium" 
                    size="sm" 
                    className="h-8 px-2.5 sm:px-3 text-xs cursor-pointer flex-1 sm:flex-none"
                    onClick={() => router.push(`/admin/agents/${encodeURIComponent(agent.id)}/financial`)}
                  >
                    مدیریت مالی و تسویه
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminAgentRecentCommissions />

      {/* ─── Modal: Create Agent Modal ─── */}
      <Dialog open={createAgentModalOpen} onOpenChange={setCreateAgentModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
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
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
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

              {selectedAgentDetail.userId && <AdminUserRoleAssignment key={selectedAgentDetail.userId} userId={selectedAgentDetail.userId} />}

              {/* Lifecycle Audit Trail History */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" />
                    <span>تاریخچه تغییرات و ممیزی پرونده (Audit Trail):</span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedAgentDetail.auditLogs?.length ? `${selectedAgentDetail.auditLogs.length} رویداد` : 'بدون رویداد'}
                  </span>
                </div>

                {selectedAgentDetail.auditLogs && selectedAgentDetail.auditLogs.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1 rounded-lg border border-border/40 p-2 bg-muted/20">
                    {selectedAgentDetail.auditLogs.map((log: any) => (
                      <div key={log.id} className="text-xs p-2 rounded bg-background border border-border/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                            <span className="text-muted-foreground">{log.operatorName}</span>
                            <span className="text-muted-foreground">←</span>
                            <Badge variant={log.newStatus === 'APPROVED' ? 'success' : log.newStatus === 'REJECTED' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                              {log.newStatus === 'APPROVED' ? 'تایید' : log.newStatus === 'REJECTED' ? 'رد' : 'تعلیق'}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground" dir="ltr">
                            {new Date(log.createdAt).toLocaleString('fa-IR')}
                          </span>
                        </div>
                        {log.reason && (
                          <p className="text-[11px] text-muted-foreground bg-muted/40 p-1 rounded">
                            <span className="font-semibold text-foreground">علت: </span>
                            {log.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-2 rounded text-center">
                    تاکنون هیچ رویداد تغییری برای این پرونده ثبت نشده است.
                  </p>
                )}
              </div>

              {/* Confirmation Alert Box */}
              {statusConfirmAction && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>
                      {statusConfirmAction === 'APPROVED' && 'آیا از تایید این همکار فروش و اعطای دسترسی‌های سازمانی اطمینان دارید؟'}
                      {statusConfirmAction === 'REJECTED' && 'آیا از رد درخواست همکاری و سلب دسترسی همکار اطمینان دارید؟'}
                      {statusConfirmAction === 'SUSPENDED' && 'آیا از تعلیق حساب و غیرفعال‌سازی موقت این نماینده اطمینان دارید؟'}
                    </span>
                  </div>
                  <div>
                    <Input
                      placeholder="دلیل یا توضیحات این تصمیم (اختیاری جهت ثبت در تاریخچه ممیزی)..."
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      className="text-xs h-8 bg-background border-border/60"
                      maxLength={500}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUpdatingStatus}
                      onClick={() => {
                        setStatusConfirmAction(null)
                        setStatusReason('')
                      }}
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

      {/* ─── Modal: Financial Performance Report ─── */}
      <Dialog open={perfModalOpen} onOpenChange={setPerfModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="size-5 text-emerald-600" />
              <span>گزارش عملکرد مالی و کمیسیون همکار فروش</span>
            </DialogTitle>
            <DialogDescription>
              {perfAgent?.name} ({perfAgent?.branch}) — آمار ارجاعات، پورسانت‌ها و تسویه‌حساب‌ها
            </DialogDescription>
          </DialogHeader>

          {/* Date Range Filter */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/50 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>فیلتر بازه زمانی گزارش:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPerfStartDate('')
                  setPerfEndDate('')
                  if (perfAgent) fetchAgentPerformance(perfAgent.id)
                }}
                className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
              >
                حذف فیلتر
              </Button>
            </div>
            <JalaliIsoDateRangeFilter
              from={perfStartDate}
              to={perfEndDate}
              onChange={({ from, to }) => { setPerfStartDate(from); setPerfEndDate(to) }}
            />
            <Button
              size="sm"
              onClick={() => {
                if (perfAgent) fetchAgentPerformance(perfAgent.id, perfStartDate, perfEndDate)
              }}
              disabled={perfLoading}
              className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {perfError && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p>{perfError}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { if (perfAgent) void fetchAgentPerformance(perfAgent.id, perfStartDate, perfEndDate) }}>تلاش مجدد</Button>
            </div>
          )}

          {perfLoading ? <Loader2 className="size-3.5 animate-spin ml-1" /> : <Filter className="size-3.5 ml-1" />}
              اعمال بازه تاریخی
            </Button>
          </div>

          {perfLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
              <span>در حال بارگذاری و محاسبه داده‌های مالی...</span>
            </div>
          ) : perfData ? (
            <div className="space-y-4 py-1 text-sm">
              {/* Primary Financial Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200/60 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-blue-800 dark:text-blue-300 font-medium block">ارجاع / فروش منتسب</span>
                  <span className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1 block">
                    {toPersianNum(perfData.metrics.totalAttributedSales.toString())}
                  </span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium block">کمیسیون کسب‌شده</span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block font-mono text-xs sm:text-sm">
                    {toPersianNum(perfData.metrics.totalEarnedCommission.toLocaleString())} تومان
                  </span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200/60 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-purple-800 dark:text-purple-300 font-medium block">کمیسیون پرداخت‌شده</span>
                  <span className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1 block font-mono text-xs sm:text-sm">
                    {toPersianNum(perfData.metrics.totalPaidCommission.toLocaleString())} تومان
                  </span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium block">مانده پرداخت‌نشده</span>
                  <span className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1 block font-mono text-xs sm:text-sm">
                    {toPersianNum(perfData.metrics.unpaidBalance.toLocaleString())} تومان
                  </span>
                </div>
              </div>

              {/* Monthly Earnings Distribution (including zero-earning months) */}
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <div className="bg-muted/60 px-3.5 py-2 text-xs font-bold text-foreground flex items-center justify-between">
                  <span>نمودار و توزیع درآمد ماهانه (تمامی ماه‌ها با درآمد صفر درج شده‌اند)</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {toPersianNum(perfData.monthlyBreakdown.length.toString())} ماه در بازه
                  </span>
                </div>
                <div className="p-3 bg-card space-y-2.5 max-h-48 overflow-y-auto">
                  {perfData.monthlyBreakdown.map((m) => {
                    const maxEarned = Math.max(...perfData.monthlyBreakdown.map((x) => x.earnedCommission), 1)
                    const percent = Math.min(100, Math.round((m.earnedCommission / maxEarned) * 100))
                    return (
                      <div key={m.yearMonth} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{formatReportMonthRange(m.yearMonth)}</span>
                          <span className="text-muted-foreground">
                            کسب‌شده: <strong className="text-emerald-600">{toPersianNum(m.earnedCommission.toLocaleString())}</strong> تومان | 
                            پرداخت‌شده: <strong className="text-purple-600">{toPersianNum(m.paidCommission.toLocaleString())}</strong> | 
                            ارجاع: <strong>{toPersianNum(m.referralCount.toString())}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${m.earnedCommission === 0 ? 0 : Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Metrics Definitions Footer */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 p-2.5 rounded-xl text-[11px] text-muted-foreground space-y-1">
                <p>• <strong>کمیسیون کسب‌شده:</strong> بر اساس مدل مالی پورسانت‌های تاییدشده (APPROVED) یا واریزشده (PAID) اختصاصی همکار.</p>
                <p>• <strong>کمیسیون پرداخت‌شده:</strong> مجموع تسویه‌های بانکی واریز شده (PAID) ثبت‌شده در دفترکل مالی سامانه.</p>
                <p>• <strong>عدم تداخل:</strong> محاسبات تماماً بر پایه سهم همکار فروش انجام شده و مبلغ ناخالص فروش در آن منعکس نشده است.</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              اطلاعات مالی در دسترس نیست.
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setPerfModalOpen(false)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

    </DashboardAppShell>
  )
}
