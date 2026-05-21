'use client'

import { useState, useEffect, useMemo } from 'react'
import { contractsService } from '@/services/contracts.service'
import { doctorsService } from '@/services/doctors.service'
import { getEffectiveDiscountPercent } from '@/lib/doctor-discount'
import { PageHeader, DataTable, SearchFilterBar, StatusBadge, StatCard } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Loader2,
  User,
  CalendarDays,
  Percent,
  CheckCircle2,
  Hash,
  FileOutput,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatPrice, toPersianNum, formatDate, getDisplayName } from '@/utils/formatters'
import { CONTRACT_STATUS_LABELS } from '@/constants'
import type { ContractItem } from '@/types'
import type { Column } from '@/components/shared/data-table'
import { motion } from 'framer-motion'

// ---------- Types ----------

interface PreFilledData {
  patient: {
    id: string
    name: string
    nationalCode: string
    mobile: string
  } | null
  plan: {
    id: string
    planName: string
    discountPercent: number
    remainingUses: number
  } | null
}

interface ContractFormData {
  diagnosis: string
  doctorNote: string
  patientNote: string
  totalAmount: string
}

// ---------- Animation ----------

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

// ---------- Component ----------

export default function DoctorContractsPage() {
  const { toast } = useToast()

  // State
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preFilled, setPreFilled] = useState<PreFilledData>({ patient: null, plan: null })
  const [submitting, setSubmitting] = useState(false)
  const [doctorDiscountPercent, setDoctorDiscountPercent] = useState(0)

  // Form state
  const [form, setForm] = useState<ContractFormData>({
    diagnosis: '',
    doctorNote: '',
    patientNote: '',
    totalAmount: '',
  })

  // ---------- Fetch Contracts ----------

  useEffect(() => {
    doctorsService.getMyProfile().then((res) => {
      if (res.success && res.data) {
        setDoctorDiscountPercent(res.data.discountPercent ?? 0)
      }
    })
  }, [])

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await contractsService.getDoctorContracts({ limit: 50 })
        if (res.success && res.data) {
          setContracts(Array.isArray(res.data) ? res.data : [])
        }
      } catch {
        setContracts([])
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
  }, [])

  // ---------- Check sessionStorage for pre-filled data ----------

  useEffect(() => {
    try {
      const patientStr = sessionStorage.getItem('contract_patient')
      const planStr = sessionStorage.getItem('contract_plan')
      if (patientStr && planStr) {
        setPreFilled({
          patient: JSON.parse(patientStr),
          plan: JSON.parse(planStr),
        })
        setDialogOpen(true)
        sessionStorage.removeItem('contract_patient')
        sessionStorage.removeItem('contract_plan')
      }
    } catch {
      // ignore
    }
  }, [])

  // ---------- Filtered Contracts ----------

  const filteredContracts = useMemo(() => {
    let result = contracts

    if (filterStatus !== 'ALL') {
      result = result.filter(c => c.status === filterStatus)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        c =>
          (c.user?.profile?.firstName || '').includes(q) ||
          (c.user?.profile?.lastName || '').includes(q) ||
          (c.userPlan?.plan?.name || '').includes(q)
      )
    }

    return result
  }, [contracts, filterStatus, searchQuery])

  // ---------- Computed Discount ----------

  const discountPercent = preFilled.plan
    ? getEffectiveDiscountPercent(doctorDiscountPercent, preFilled.plan.discountPercent)
    : 0
  const totalAmountNum = parseInt(form.totalAmount) || 0
  const discountAmountNum = Math.round(totalAmountNum * discountPercent / 100)
  const finalAmount = totalAmountNum - discountAmountNum

  // ---------- Form Handlers ----------

  const updateForm = (field: keyof ContractFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!totalAmountNum || totalAmountNum <= 0) {
      toast({
        title: 'خطا',
        description: 'لطفاً مبلغ کل را وارد کنید',
        variant: 'destructive',
      })
      return
    }

    if (!preFilled.patient || !preFilled.plan) {
      toast({
        title: 'خطا',
        description: 'اطلاعات بیمار یا طرح مشخص نیست',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      await contractsService.create({
        userPlanId: preFilled.plan.id,
        diagnosis: form.diagnosis,
        doctorNote: form.doctorNote,
        patientNote: form.patientNote,
        totalAmount: totalAmountNum,
      })

      toast({
        title: 'قرارداد ثبت شد',
        description: `قرارداد برای ${preFilled.patient.name} با موفقیت ثبت شد`,
      })

      // Reset and close
      setDialogOpen(false)
      setPreFilled({ patient: null, plan: null })
      setForm({ diagnosis: '', doctorNote: '', patientNote: '', totalAmount: '' })

      // Refresh contracts
      const res = await contractsService.getDoctorContracts({ limit: 50 })
      if (res.success && res.data) {
        setContracts(Array.isArray(res.data) ? res.data : [])
      }
    } catch {
      toast({
        title: 'خطا در ثبت قرارداد',
        description: 'لطفاً دوباره تلاش کنید',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openNewContractDialog = () => {
    setPreFilled({ patient: null, plan: null })
    setForm({ diagnosis: '', doctorNote: '', patientNote: '', totalAmount: '' })
    setDialogOpen(true)
  }

  // ---------- Stats ----------

  const totalContracts = contracts.length
  const totalRevenue = contracts.reduce((sum, c) => sum + c.totalAmount, 0)
  const totalDiscountGiven = contracts.reduce((sum, c) => sum + c.discountAmount, 0)

  // ---------- Table Columns ----------

  const columns: Column<ContractItem>[] = [
    {
      key: 'patientName',
      header: 'بیمار',
      render: (row) => (
        <div>
          <p className="text-sm font-medium">
            {row.user?.profile ? getDisplayName({ profile: row.user.profile }) : 'بیمار'}
          </p>
        </div>
      ),
    },
    {
      key: 'planName',
      header: 'طرح',
      render: (row) => (
        <span className="text-sm">{row.userPlan?.plan?.name || '—'}</span>
      ),
      hiddenOn: 'sm',
    },
    {
      key: 'createdAt',
      header: 'تاریخ',
      render: (row) => (
        <span className="text-sm">{formatDate(row.createdAt)}</span>
      ),
      hiddenOn: 'md',
    },
    {
      key: 'totalAmount',
      header: 'مبلغ کل',
      render: (row) => (
        <span className="text-sm font-medium">{formatPrice(row.totalAmount)}</span>
      ),
    },
    {
      key: 'discountAmount',
      header: 'تخفیف',
      render: (row) => (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          {formatPrice(row.discountAmount)}
        </span>
      ),
      hiddenOn: 'sm',
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  // ---------- Render ----------

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
    >
      {/* Page Header */}
      <motion.div variants={fadeIn}>
        <PageHeader
          title="قراردادها"
          description="مدیریت و ثبت قراردادهای ویزیت بیماران"
          action={
            <Button onClick={openNewContractDialog} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              ثبت قرارداد جدید
            </Button>
          }
        />
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={fadeIn}>
          <StatCard
            title="کل قراردادها"
            value={toPersianNum(totalContracts)}
            icon={FileOutput}
            iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
        </motion.div>

        <motion.div variants={fadeIn}>
          <StatCard
            title="مبلغ کل (تومان)"
            value={formatPrice(totalRevenue)}
            icon={Hash}
            iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
        </motion.div>

        <motion.div variants={fadeIn}>
          <StatCard
            title="تخفیف داده شده (تومان)"
            value={formatPrice(totalDiscountGiven)}
            icon={Percent}
            iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
          />
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div variants={fadeIn}>
        <SearchFilterBar
          searchPlaceholder="جستجو بر اساس نام یا طرح..."
          onSearch={setSearchQuery}
          filterOptions={[
            { value: 'ALL', label: 'همه وضعیت‌ها' },
            { value: 'PENDING', label: CONTRACT_STATUS_LABELS.PENDING },
            { value: 'CONFIRMED', label: CONTRACT_STATUS_LABELS.CONFIRMED },
            { value: 'COMPLETED', label: CONTRACT_STATUS_LABELS.COMPLETED },
            { value: 'CANCELLED', label: CONTRACT_STATUS_LABELS.CANCELLED },
          ]}
          filterValue={filterStatus}
          onFilterChange={setFilterStatus}
        />
      </motion.div>

      {/* Contracts Table */}
      <motion.div variants={fadeIn}>
        <DataTable
          columns={columns}
          data={filteredContracts}
          isLoading={loading}
          rowKey={(row) => row.id}
          emptyMessage="قراردادی یافت نشد"
          emptyIcon={<FileText className="size-12 text-muted-foreground/40" />}
        />
      </motion.div>

      {/* Create Contract Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDialogOpen(false)
          setPreFilled({ patient: null, plan: null })
          setForm({ diagnosis: '', doctorNote: '', patientNote: '', totalAmount: '' })
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-emerald-600" />
              ثبت قرارداد جدید
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Patient Info (read-only) */}
            {preFilled.patient ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold">اطلاعات بیمار</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">نام بیمار</span>
                    <p className="font-medium">{preFilled.patient.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">کد ملی</span>
                    <p className="font-mono font-medium" dir="ltr">{preFilled.patient.nationalCode}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  بیمار از صفحه بررسی بیماران انتخاب نشده است
                </p>
                <a
                  href="/doctor/patients"
                  className="text-xs text-emerald-600 hover:underline mt-1 inline-block"
                >
                  رفتن به صفحه بررسی بیماران
                </a>
              </div>
            )}

            {/* Plan Info (read-only) */}
            {preFilled.plan && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold">اطلاعات طرح</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">نام طرح</span>
                    <p className="font-medium">{preFilled.plan.planName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">درصد تخفیف</span>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      {toPersianNum(preFilled.plan.discountPercent)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Diagnosis */}
              <div className="space-y-2">
                <Label htmlFor="diagnosis" className="text-sm font-medium">
                  تشخیص <span className="text-muted-foreground font-normal">(اختیاری)</span>
                </Label>
                <Textarea
                  id="diagnosis"
                  value={form.diagnosis}
                  onChange={(e) => updateForm('diagnosis', e.target.value)}
                  placeholder="تشخیص پزشکی..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Doctor Note */}
              <div className="space-y-2">
                <Label htmlFor="doctorNote" className="text-sm font-medium">
                  گزارش پزشک <span className="text-muted-foreground font-normal">(اختیاری)</span>
                </Label>
                <Textarea
                  id="doctorNote"
                  value={form.doctorNote}
                  onChange={(e) => updateForm('doctorNote', e.target.value)}
                  placeholder="توضیحات و گزارش پزشک..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Total Amount */}
              <div className="space-y-2">
                <Label htmlFor="totalAmount" className="text-sm font-medium">
                  مبلغ کل <span className="text-destructive">*</span>
                  <span className="text-muted-foreground font-normal mr-1">(تومان)</span>
                </Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={form.totalAmount}
                  onChange={(e) => updateForm('totalAmount', e.target.value)}
                  placeholder="مبلغ کل ویزیت"
                  dir="ltr"
                  className="text-left font-mono"
                  min="0"
                />
              </div>

              {/* Discount Preview */}
              {totalAmountNum > 0 && discountPercent > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">مبلغ کل:</span>
                    <span className="font-medium">{formatPrice(totalAmountNum)} تومان</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">تخفیف ({toPersianNum(discountPercent)}%):</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      -{formatPrice(discountAmountNum)} تومان
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>مبلغ قابل پرداخت:</span>
                    <span className="text-emerald-600">{formatPrice(finalAmount)} تومان</span>
                  </div>
                </motion.div>
              )}

              {/* Patient Note */}
              <div className="space-y-2">
                <Label htmlFor="patientNote" className="text-sm font-medium">
                  توضیحات بیمار <span className="text-muted-foreground font-normal">(اختیاری)</span>
                </Label>
                <Textarea
                  id="patientNote"
                  value={form.patientNote}
                  onChange={(e) => updateForm('patientNote', e.target.value)}
                  placeholder="توضیحات ارائه شده توسط بیمار..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setPreFilled({ patient: null, plan: null })
                setForm({ diagnosis: '', doctorNote: '', patientNote: '', totalAmount: '' })
              }}
            >
              انصراف
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !preFilled.patient || !preFilled.plan || !totalAmountNum}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              ثبت قرارداد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
