'use client'

import { useEffect, useState } from 'react'
import { contractsService } from '@/services'
import { PageHeader, StatusBadge } from '@/components/shared'
import { toPersianNum, formatPrice, formatDate, getDisplayName } from '@/utils/formatters'
import { CONTRACT_STATUS_LABELS } from '@/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Activity,
  Calendar,
  Stethoscope,
  AlertCircle,
  RefreshCw,
  Filter,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ContractItem } from '@/types'

// ---------- Contract Detail Dialog ----------

function ContractDetailDialog({
  contract,
  open,
  onOpenChange,
}: {
  contract: ContractItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!contract) return null

  const doctorName = contract.doctor?.user?.profile
    ? getDisplayName({ profile: contract.doctor.user.profile })
    : 'نامشخص'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            جزئیات قرارداد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Doctor Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              اطلاعات پزشک
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">نام پزشک:</span>
                <p className="font-medium">{doctorName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">تخصص:</span>
                <p className="font-medium">
                  {contract.doctor?.specialty || 'نامشخص'}
                </p>
              </div>
              {contract.doctor?.clinicName && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">مطب:</span>
                  <p className="font-medium">{contract.doctor.clinicName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Diagnosis & Notes */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-semibold">توضیحات</h4>
            <div className="space-y-2 text-sm">
              {contract.diagnosis && (
                <div>
                  <span className="text-muted-foreground">تشخیص:</span>
                  <p className="mt-0.5">{contract.diagnosis}</p>
                </div>
              )}
              {contract.patientNote && (
                <div>
                  <span className="text-muted-foreground">توضیحات بیمار:</span>
                  <p className="mt-0.5">{contract.patientNote}</p>
                </div>
              )}
              {contract.doctorNote && (
                <div>
                  <span className="text-muted-foreground">گزارش پزشک:</span>
                  <p className="mt-0.5">{contract.doctorNote}</p>
                </div>
              )}
              {!contract.diagnosis &&
                !contract.patientNote &&
                !contract.doctorNote && (
                  <p className="text-muted-foreground">توضیحاتی ثبت نشده</p>
                )}
            </div>
          </div>

          {/* Financial */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold">اطلاعات مالی</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">مبلغ کل:</span>
                <p className="font-medium">{formatPrice(contract.totalAmount)} تومان</p>
              </div>
              <div>
                <span className="text-muted-foreground">مبلغ تخفیف:</span>
                <p className="font-medium text-emerald-600">
                  {formatPrice(contract.discountAmount)} تومان
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">طرح:</span>
                <p className="font-medium">{contract.userPlan?.plan?.name || 'نامشخص'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">درصد تخفیف:</span>
                <p className="font-medium">
                  {toPersianNum(contract.userPlan?.plan?.discountPercent || 0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              تاریخ ایجاد: {formatDate(contract.createdAt)}
            </div>
            {contract.confirmedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                تایید: {formatDate(contract.confirmedAt)}
              </div>
            )}
            {contract.completedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                تکمیل: {formatDate(contract.completedAt)}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">وضعیت:</span>
            <StatusBadge
              status={contract.status}
              label={CONTRACT_STATUS_LABELS[contract.status] || contract.status}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Mobile Contract Card ----------

function MobileContractCard({
  contract,
  onView,
}: {
  contract: ContractItem
  onView: () => void
}) {
  const doctorName = contract.doctor?.user?.profile
    ? getDisplayName({ profile: contract.doctor.user.profile })
    : 'نامشخص'

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Stethoscope className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{doctorName}</p>
              <p className="text-xs text-muted-foreground">
                {contract.doctor?.specialty || 'تخصص نامشخص'}
              </p>
            </div>
          </div>
          <StatusBadge
            status={contract.status}
            label={CONTRACT_STATUS_LABELS[contract.status] || contract.status}
          />
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(contract.createdAt)}
          </div>
          {contract.diagnosis && (
            <div className="flex items-center gap-1">
              <Activity className="size-3" />
              {contract.diagnosis}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">
              {formatPrice(contract.totalAmount)}
            </span>{' '}
            تومان
            {contract.discountAmount > 0 && (
              <span className="text-emerald-600 mr-2">
                ({formatPrice(contract.discountAmount)} تخفیف)
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onView}>
            جزئیات
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Contracts Page ----------

export default function UserContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchContracts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await contractsService.getMyContracts()
      if (res.success && res.data) {
        setContracts(res.data as ContractItem[])
      } else {
        const errorMsg = (res as any).error?.message || 'خطا در دریافت اطلاعات قراردادها'
        console.error('[Contracts fetch error]', res)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('[Contracts fetch exception]', err)
      const msg = err instanceof Error ? err.message : 'خطا در ارتباط با سرور'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  // ---------- Filter ----------

  const filteredContracts =
    statusFilter === 'ALL'
      ? contracts
      : contracts.filter((c) => c.status === statusFilter)

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-xs" />
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    )
  }

  // ---------- Error ----------

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <AlertCircle className="size-12 text-destructive" />
          <p className="font-medium text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchContracts}>
            <RefreshCw className="ml-2 size-4" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="قراردادها و سابقه ویزیت"
        description="مشاهده تمام قراردادها و سابقه ویزیت‌های شما"
        action={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="ml-2 size-4" />
              <SelectValue placeholder="فیلتر وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه</SelectItem>
              <SelectItem value="PENDING">در انتظار</SelectItem>
              <SelectItem value="CONFIRMED">تایید شده</SelectItem>
              <SelectItem value="COMPLETED">تکمیل شده</SelectItem>
              <SelectItem value="CANCELLED">لغو شده</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="px-3 py-1.5">
          <FileText className="ml-1 size-3" />
          کل: {toPersianNum(contracts.length)}
        </Badge>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1.5">
          در انتظار: {toPersianNum(contracts.filter((c) => c.status === 'PENDING').length)}
        </Badge>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1.5">
          تکمیل شده: {toPersianNum(contracts.filter((c) => c.status === 'COMPLETED').length)}
        </Badge>
      </div>

      {/* Empty State */}
      {filteredContracts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="size-7" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {statusFilter === 'ALL'
                ? 'هنوز قراردادی ثبت نشده است.'
                : `قراردادی با وضعیت "${CONTRACT_STATUS_LABELS[statusFilter as keyof typeof CONTRACT_STATUS_LABELS] || statusFilter}" یافت نشد.`}
            </p>
            {statusFilter !== 'ALL' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter('ALL')}
              >
                نمایش همه قراردادها
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {filteredContracts.length > 0 && (
        <>
          {/* Desktop */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>پزشک</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>تشخیص</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => {
                    const doctorName = contract.doctor?.user?.profile
                      ? getDisplayName({ profile: contract.doctor.user.profile })
                      : 'نامشخص'

                    return (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{doctorName}</p>
                            <p className="text-xs text-muted-foreground">
                              {contract.doctor?.specialty || ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(contract.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {contract.diagnosis || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">
                              {formatPrice(contract.totalAmount)}
                            </span>
                            <span className="text-muted-foreground mr-1">
                              تومان
                            </span>
                            {contract.discountAmount > 0 && (
                              <span className="text-xs text-emerald-600 block">
                                {formatPrice(contract.discountAmount)} تخفیف
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={contract.status}
                            label={CONTRACT_STATUS_LABELS[contract.status] || contract.status}
                          />
                        </TableCell>
                        <TableCell className="text-left">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedContract(contract)
                              setDetailOpen(true)
                            }}
                          >
                            جزئیات
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredContracts.map((contract) => (
              <MobileContractCard
                key={contract.id}
                contract={contract}
                onView={() => {
                  setSelectedContract(contract)
                  setDetailOpen(true)
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <ContractDetailDialog
        contract={selectedContract}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
