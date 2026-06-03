'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader, StatusBadge } from '@/components/shared'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { formatDateTime, toPersianNum } from '@/utils/formatters'

type SalesCustomerStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'CARD_ISSUED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PAID'
  | 'CONFIRMED'
  | 'RETURNED'

type StatusFilter = 'all' | 'PENDING_REVIEW' | 'PAID' | 'CONFIRMED' | 'RETURNED'
type CustomerAction = 'mark-paid' | 'confirm' | 'return'

interface SalesCustomer {
  // Internal, used for key/API actions only.
  id: string
  // Internal identifiers from the API shape; do not render.
  salesPartnerId?: string
  planId?: string
  userPlanId?: string | null
  firstName: string | null
  lastName: string | null
  mobile: string | null
  nationalCode: string | null
  status: SalesCustomerStatus
  paymentRef?: string | null
  paymentDescription?: string | null
  paidAt: string | null
  confirmedAt: string | null
  returnedAt: string | null
  returnReason?: string | null
  createdAt: string
  updatedAt?: string
  plan?: {
    title?: string | null
    name?: string | null
  } | null
}

interface PlanOption {
  id: string
  name: string
  status?: string
}

interface AgentOption {
  id: string
  businessName?: string | null
  user?: {
    id?: string
    mobile?: string | null
    profile?: {
      firstName?: string | null
      lastName?: string | null
    } | null
  } | null
}

interface CreateFormState {
  firstName: string
  lastName: string
  mobile: string
  nationalCode: string
  planId: string
  salesPartnerId: string
}

type AgentProfile = NonNullable<NonNullable<AgentOption['user']>['profile']>

const initialCreateForm: CreateFormState = {
  firstName: '',
  lastName: '',
  mobile: '',
  nationalCode: '',
  planId: '',
  salesPartnerId: '',
}

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'PENDING_REVIEW', label: 'در انتظار پرداخت' },
  { value: 'PAID', label: 'پرداخت‌شده' },
  { value: 'CONFIRMED', label: 'تایید شده' },
  { value: 'RETURNED', label: 'برگشتی' },
]

const statusLabels: Record<SalesCustomerStatus, string> = {
  PENDING_REVIEW: 'در انتظار پرداخت',
  APPROVED: 'تایید اولیه',
  CARD_ISSUED: 'کارت صادر شده',
  SHIPPED: 'ارسال شده',
  DELIVERED: 'تحویل شده',
  PAID: 'پرداخت‌شده',
  CONFIRMED: 'تأیید شده',
  RETURNED: 'برگشتی',
}

const statusClasses: Record<SalesCustomerStatus, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  CARD_ISSUED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  SHIPPED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  DELIVERED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  RETURNED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  return fallback
}

function getFullName(customer: SalesCustomer) {
  const firstName = customer.firstName?.trim() ?? ''
  const lastName = customer.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim() || 'مشتری فروش'
}

function getProfileName(profile?: AgentProfile | null) {
  const firstName = profile?.firstName?.trim() ?? ''
  const lastName = profile?.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim()
}

function getAgentName(agent: AgentOption) {
  return agent.businessName?.trim() || getProfileName(agent.user?.profile) || agent.user?.mobile || 'همکار فروش'
}

function getPlanName(customer: SalesCustomer) {
  return customer.plan?.title?.trim() || customer.plan?.name?.trim() || 'طرح انتخاب‌شده'
}

function getMaskedNationalCode(value: string | null) {
  if (!value) return '-'
  if (value.includes('*')) return value
  if (/^\d{10}$/.test(value)) return `${'*'.repeat(6)}${value.slice(-4)}`
  return '-'
}

function getDateOrDash(value: string | null) {
  return value ? formatDateTime(value) : '-'
}

function isFinalStatus(status: SalesCustomerStatus) {
  return status === 'CONFIRMED' || status === 'RETURNED'
}

function LoadingCustomers() {
  return (
    <>
      <Card className="hidden border-0 shadow-sm md:block">
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2 p-4 pt-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-0 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function AdminSalesCustomersPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<SalesCustomer[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [agentNames, setAgentNames] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState<{ id: string; action: CustomerAction } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm)
  const [returnTarget, setReturnTarget] = useState<SalesCustomer | null>(null)
  const [returnReason, setReturnReason] = useState('')

  const agentOptions = useMemo(
    () =>
      Object.entries(agentNames).map(([id, name]) => ({
        id,
        name,
      })),
    [agentNames]
  )

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const params = new URLSearchParams({ take: '50' })
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const res = await apiClient.get<SalesCustomer[]>(`/sales-customers?${params.toString()}`)

      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data)
      } else {
        const message = res.error?.message || res.message || 'خطا در دریافت فهرست مشتریان فروش'
        setErrorMessage(message)
        setCustomers([])
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'خطا در دریافت فهرست مشتریان فروش'))
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  const fetchCreateOptions = useCallback(async () => {
    try {
      const plansRes = await apiClient.get<PlanOption[]>('/plans')
      if (plansRes.success && Array.isArray(plansRes.data)) {
        setPlans(plansRes.data)
      }
    } catch {
      setPlans([])
    }

    try {
      const agentsRes = await apiClient.get<AgentOption[]>('/agents?status=APPROVED&limit=100')
      if (agentsRes.success && Array.isArray(agentsRes.data)) {
        const nextAgentNames: Record<string, string> = {}
        agentsRes.data.forEach((agent) => {
          nextAgentNames[agent.id] = getAgentName(agent)
        })
        setAgentNames(nextAgentNames)
      }
    } catch {
      setAgentNames({})
    }
  }, [])

  useEffect(() => {
    void fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    void fetchCreateOptions()
  }, [fetchCreateOptions])

  const updateCustomer = (updatedCustomer: SalesCustomer) => {
    setCustomers((currentCustomers) => {
      const nextCustomers = currentCustomers.map((customer) =>
        customer.id === updatedCustomer.id ? { ...customer, ...updatedCustomer } : customer
      )

      if (statusFilter !== 'all' && updatedCustomer.status !== statusFilter) {
        return nextCustomers.filter((customer) => customer.id !== updatedCustomer.id)
      }

      return nextCustomers
    })
  }

  const addCreatedCustomer = (createdCustomer: SalesCustomer) => {
    if (statusFilter !== 'all' && createdCustomer.status !== statusFilter) return
    setCustomers((currentCustomers) => [createdCustomer, ...currentCustomers])
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!createForm.planId) {
      toast({
        title: 'خطا',
        description: 'انتخاب طرح الزامی است.',
        variant: 'destructive',
      })
      return
    }

    const nationalCode = createForm.nationalCode.trim()
    if (nationalCode && !/^\d{10}$/.test(nationalCode)) {
      toast({
        title: 'خطا',
        description: 'کد ملی باید ۱۰ رقم باشد.',
        variant: 'destructive',
      })
      return
    }

    const body = {
      planId: createForm.planId,
      firstName: createForm.firstName.trim() || undefined,
      lastName: createForm.lastName.trim() || undefined,
      mobile: createForm.mobile.trim() || undefined,
      nationalCode: nationalCode || undefined,
      salesPartnerId: createForm.salesPartnerId || undefined,
    }

    setIsCreating(true)
    try {
      const createdCustomer = await apiClient.post<SalesCustomer>('/sales-customers', body)
      addCreatedCustomer(createdCustomer)
      setCreateForm(initialCreateForm)
      setCreateOpen(false)
      toast({
        title: 'موفق',
        description: 'مشتری فروش با موفقیت ثبت شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ثبت مشتری فروش'),
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleMarkPaid = async (customer: SalesCustomer) => {
    if (processing || isFinalStatus(customer.status) || customer.status === 'PAID') return

    setProcessing({ id: customer.id, action: 'mark-paid' })
    try {
      const updatedCustomer = await apiClient.patch<SalesCustomer>(
        `/sales-customers/${customer.id}/mark-paid`,
        {}
      )
      updateCustomer(updatedCustomer)
      toast({
        title: 'موفق',
        description: 'پرداخت مشتری با موفقیت ثبت شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ثبت پرداخت'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleConfirm = async (customer: SalesCustomer) => {
    if (processing || customer.status !== 'PAID') return

    setProcessing({ id: customer.id, action: 'confirm' })
    try {
      const updatedCustomer = await apiClient.patch<SalesCustomer>(
        `/sales-customers/${customer.id}/confirm`
      )
      updateCustomer(updatedCustomer)
      toast({
        title: 'موفق',
        description: 'مشتری فروش با موفقیت تأیید نهایی شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در تأیید نهایی مشتری'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReturn = async () => {
    if (!returnTarget || processing || returnTarget.status === 'CONFIRMED' || returnTarget.status === 'RETURNED') {
      return
    }

    const reason = returnReason.trim()
    setProcessing({ id: returnTarget.id, action: 'return' })
    try {
      const updatedCustomer = await apiClient.patch<SalesCustomer>(
        `/sales-customers/${returnTarget.id}/return`,
        reason ? { reason } : undefined
      )
      updateCustomer(updatedCustomer)
      setReturnTarget(null)
      setReturnReason('')
      toast({
        title: 'موفق',
        description: 'وضعیت مشتری با موفقیت برگشتی شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ثبت برگشتی'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const renderStatus = (status: SalesCustomerStatus) => (
    <StatusBadge
      status={status}
      label={statusLabels[status] || status}
      className={cn('text-xs', statusClasses[status])}
    />
  )

  const renderActions = (customer: SalesCustomer) => {
    const isProcessing = processing?.id === customer.id
    const isMarkingPaid = isProcessing && processing.action === 'mark-paid'
    const isConfirming = isProcessing && processing.action === 'confirm'
    const isReturning = isProcessing && processing.action === 'return'
    const canMarkPaid = !isFinalStatus(customer.status) && customer.status !== 'PAID'
    const canConfirm = customer.status === 'PAID'
    const canReturn = customer.status !== 'CONFIRMED' && customer.status !== 'RETURNED'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="عملیات مشتری فروش">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!canMarkPaid && !canConfirm && !canReturn ? (
            <DropdownMenuItem disabled>عملیاتی تعریف نشده</DropdownMenuItem>
          ) : (
            <>
              {canMarkPaid && (
                <DropdownMenuItem
                  disabled={!!processing}
                  onClick={() => void handleMarkPaid(customer)}
                >
                  {isMarkingPaid ? (
                    <Loader2 className="ml-2 size-4 animate-spin" />
                  ) : (
                    <Receipt className="ml-2 size-4" />
                  )}
                  ثبت پرداخت
                </DropdownMenuItem>
              )}
              {canConfirm && (
                <DropdownMenuItem
                  disabled={!!processing}
                  onClick={() => void handleConfirm(customer)}
                >
                  {isConfirming ? (
                    <Loader2 className="ml-2 size-4 animate-spin" />
                  ) : (
                    <Check className="ml-2 size-4" />
                  )}
                  تأیید نهایی
                </DropdownMenuItem>
              )}
              {canReturn && (
                <DropdownMenuItem
                  disabled={!!processing}
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setReturnTarget(customer)
                    setReturnReason('')
                  }}
                >
                  {isReturning ? (
                    <Loader2 className="ml-2 size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="ml-2 size-4" />
                  )}
                  برگشتی
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderCustomerCard = (customer: SalesCustomer) => (
    <Card key={customer.id} className="border-0 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{getFullName(customer)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{customer.mobile || '-'}</p>
          </div>
          {renderStatus(customer.status)}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">کد ملی</p>
            <p className="mt-1 font-medium" dir="ltr">{getMaskedNationalCode(customer.nationalCode)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">طرح</p>
            <p className="mt-1 font-medium">{getPlanName(customer)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">همکار فروش</p>
            <p className="mt-1 font-medium">
              {customer.salesPartnerId ? agentNames[customer.salesPartnerId] || 'همکار فروش' : 'همکار فروش'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">ثبت</p>
            <p className="mt-1 font-medium">{formatDateTime(customer.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center justify-end border-t pt-3">
          {renderActions(customer)}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت مشتریان فروش"
        description="مشتریان ثبت‌شده توسط همکاران فروش را بررسی و وضعیت آن‌ها را مدیریت کنید."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 size-4" />
                ثبت مشتری فروش
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-2xl">
              <form onSubmit={(event) => void handleCreate(event)}>
                <DialogHeader>
                  <DialogTitle>ثبت مشتری فروش</DialogTitle>
                  <DialogDescription>
                    اطلاعات مشتری را وارد کنید. قیمت، پرداخت و پورسانت در این فرم ایجاد نمی‌شود.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">نام</Label>
                    <Input
                      id="first-name"
                      value={createForm.firstName}
                      onChange={(event) => setCreateForm((form) => ({ ...form, firstName: event.target.value }))}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">نام خانوادگی</Label>
                    <Input
                      id="last-name"
                      value={createForm.lastName}
                      onChange={(event) => setCreateForm((form) => ({ ...form, lastName: event.target.value }))}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">موبایل</Label>
                    <Input
                      id="mobile"
                      value={createForm.mobile}
                      onChange={(event) => setCreateForm((form) => ({ ...form, mobile: event.target.value }))}
                      maxLength={20}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="national-code">کد ملی</Label>
                    <Input
                      id="national-code"
                      value={createForm.nationalCode}
                      onChange={(event) =>
                        setCreateForm((form) => ({
                          ...form,
                          nationalCode: event.target.value.replace(/\D/g, '').slice(0, 10),
                        }))
                      }
                      inputMode="numeric"
                      maxLength={10}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>طرح</Label>
                    <Select
                      value={createForm.planId}
                      onValueChange={(value) => setCreateForm((form) => ({ ...form, planId: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب طرح" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>همکار فروش</Label>
                    <Select
                      value={createForm.salesPartnerId || 'none'}
                      onValueChange={(value) =>
                        setCreateForm((form) => ({
                          ...form,
                          salesPartnerId: value === 'none' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختیاری" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون انتخاب</SelectItem>
                        {agentOptions.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCreating}
                    onClick={() => setCreateOpen(false)}
                  >
                    انصراف
                  </Button>
                  <Button type="submit" disabled={isCreating || plans.length === 0}>
                    {isCreating && <Loader2 className="ml-1 size-4 animate-spin" />}
                    ثبت مشتری
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingCustomers />
      ) : errorMessage ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">دریافت مشتریان فروش ناموفق بود.</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={() => void fetchCustomers()}>
              <RefreshCw className="ml-2 size-4" />
              تلاش دوباره
            </Button>
          </CardContent>
        </Card>
      ) : customers.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">هنوز مشتری فروشی ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden border-0 shadow-sm md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>مشتری</TableHead>
                      <TableHead>موبایل</TableHead>
                      <TableHead>کد ملی</TableHead>
                      <TableHead>طرح</TableHead>
                      <TableHead>همکار فروش</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>ثبت</TableHead>
                      <TableHead>پرداخت</TableHead>
                      <TableHead>تأیید</TableHead>
                      <TableHead>برگشتی</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm font-medium">
                            {getFullName(customer)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm" dir="ltr">
                            {customer.mobile || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm" dir="ltr">
                            {getMaskedNationalCode(customer.nationalCode)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm">{getPlanName(customer)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm">
                            {customer.salesPartnerId ? agentNames[customer.salesPartnerId] || 'همکار فروش' : 'همکار فروش'}
                          </span>
                        </TableCell>
                        <TableCell>{renderStatus(customer.status)}</TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTime(customer.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm text-muted-foreground">
                            {getDateOrDash(customer.paidAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm text-muted-foreground">
                            {getDateOrDash(customer.confirmedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-sm text-muted-foreground">
                            {getDateOrDash(customer.returnedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-left">{renderActions(customer)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 md:hidden">
            {customers.map(renderCustomerCard)}
          </div>
        </>
      )}

      <Dialog
        open={!!returnTarget}
        onOpenChange={(open) => {
          if (!open && !processing) {
            setReturnTarget(null)
            setReturnReason('')
          }
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت برگشتی</DialogTitle>
            <DialogDescription>
              در صورت نیاز دلیل برگشتی را ثبت کنید. این کار پرداخت، پورسانت یا کیف پول ایجاد نمی‌کند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="return-reason">دلیل برگشتی</Label>
            <Textarea
              id="return-reason"
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              placeholder="اختیاری"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReturnTarget(null)
                setReturnReason('')
              }}
              disabled={!!processing}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleReturn()}
              disabled={!returnTarget || !!processing}
            >
              {processing?.action === 'return' && (
                <Loader2 className="ml-1 size-4 animate-spin" />
              )}
              ثبت برگشتی
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
