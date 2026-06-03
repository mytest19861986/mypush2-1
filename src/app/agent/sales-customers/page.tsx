'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw, ShoppingBag, XCircle } from 'lucide-react'
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
import { PageHeader, StatusBadge } from '@/components/shared'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/utils/formatters'

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

interface SalesCustomer {
  // Internal, used for key only.
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
  paidAt: string | null
  confirmedAt: string | null
  returnedAt: string | null
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
}

interface CreateFormState {
  firstName: string
  lastName: string
  mobile: string
  nationalCode: string
  planId: string
}

const initialCreateForm: CreateFormState = {
  firstName: '',
  lastName: '',
  mobile: '',
  nationalCode: '',
  planId: '',
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
  PENDING_REVIEW: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CARD_ISSUED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  SHIPPED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  DELIVERED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  RETURNED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  return fallback
}

function getFullName(customer: SalesCustomer) {
  const firstName = customer.firstName?.trim() ?? ''
  const lastName = customer.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim() || 'مشتری'
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
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function AgentSalesCustomersPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<SalesCustomer[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm)

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
        const message = res.error?.message || res.message || 'خطا در دریافت فهرست مشتریان'
        setErrorMessage(message)
        setCustomers([])
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'خطا در دریافت فهرست مشتریان'))
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiClient.get<PlanOption[]>('/plans')
      if (res.success && Array.isArray(res.data)) {
        setPlans(res.data)
      }
    } catch {
      setPlans([])
    }
  }, [])

  useEffect(() => {
    void fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  const addCreatedCustomer = (createdCustomer: SalesCustomer, submittedPlanId: string) => {
    if (statusFilter !== 'all' && createdCustomer.status !== statusFilter) return

    const selectedPlan = plans.find((plan) => plan.id === submittedPlanId)
    setCustomers((currentCustomers) => [
      {
        ...createdCustomer,
        plan: createdCustomer.plan ?? (selectedPlan ? { title: selectedPlan.name } : undefined),
      },
      ...currentCustomers,
    ])
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

    const submittedPlanId = createForm.planId

    const body = {
      planId: submittedPlanId,
      firstName: createForm.firstName.trim() || undefined,
      lastName: createForm.lastName.trim() || undefined,
      mobile: createForm.mobile.trim() || undefined,
      nationalCode: nationalCode || undefined,
    }

    setIsCreating(true)
    try {
      const createdCustomer = await apiClient.post<SalesCustomer>('/sales-customers', body)
      addCreatedCustomer(createdCustomer, submittedPlanId)
      setCreateForm(initialCreateForm)
      setCreateOpen(false)
      toast({
        title: 'موفق',
        description: 'مشتری با موفقیت ثبت شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در ثبت مشتری'),
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const renderStatus = (status: SalesCustomerStatus) => (
    <StatusBadge
      status={status}
      label={statusLabels[status] || status}
      className={cn('text-xs', statusClasses[status])}
    />
  )

  const renderCustomerCard = (customer: SalesCustomer) => (
    <Card key={customer.id} className="border-0 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{getFullName(customer)}</p>
            <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
              {customer.mobile || '-'}
            </p>
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
            <p className="text-muted-foreground">ثبت</p>
            <p className="mt-1 font-medium">{formatDateTime(customer.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">پرداخت</p>
            <p className="mt-1 font-medium">{getDateOrDash(customer.paidAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشتریان من"
        description="مشتریان ثبت‌شده توسط شما و وضعیت آن‌ها را مشاهده کنید."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground shadow-md transition-all hover:shadow-lg">
                <Plus className="ml-2 size-4" />
                ثبت مشتری
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-2xl">
              <form onSubmit={(event) => void handleCreate(event)}>
                <DialogHeader>
                  <DialogTitle>ثبت مشتری</DialogTitle>
                  <DialogDescription>
                    اطلاعات مشتری و طرح انتخابی را ثبت کنید.
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
                  <div className="space-y-2 md:col-span-2">
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

      <div
        role="tablist"
        aria-label="فیلتر وضعیت مشتریان"
        className="flex w-full max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 sm:w-fit"
      >
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === filter.value}
            className={cn(
              'h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors',
              statusFilter === filter.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
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
              <p className="text-sm font-semibold">دریافت مشتریان ناموفق بود.</p>
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
            <p className="text-sm font-medium">هنوز مشتری‌ای ثبت نکرده‌اید.</p>
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
                      <TableHead>وضعیت</TableHead>
                      <TableHead>ثبت</TableHead>
                      <TableHead>پرداخت</TableHead>
                      <TableHead>تأیید</TableHead>
                      <TableHead>برگشتی</TableHead>
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
    </div>
  )
}
