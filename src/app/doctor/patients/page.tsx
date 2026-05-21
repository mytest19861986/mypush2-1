'use client'

import { useState, useCallback, useEffect } from 'react'
import { patientsService } from '@/services/patients.service'
import { StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useDebounce } from '@/hooks/shared'
import {
  UserSearch,
  Search,
  User,
  Phone,
  Hash,
  CalendarDays,
  Percent,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import { toPersianNum, formatDate } from '@/utils/formatters'
import type { PatientLookupResult, UserPlanItem } from '@/types'

// ---------- Animation ----------

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

// ---------- Component ----------

export default function DoctorPatientsPage() {
  const [nationalCode, setNationalCode] = useState('')
  const [searching, setSearching] = useState(false)
  const [patient, setPatient] = useState<PatientLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<UserPlanItem | null>(null)

  const debouncedCode = useDebounce(nationalCode, 300)

  // ---------- Auto-search when 10 digits entered ----------

  useEffect(() => {
    if (debouncedCode.length === 10 && /^\d{10}$/.test(debouncedCode)) {
      handleSearch()
    }
  }, [debouncedCode])

  // ---------- Search Handler ----------

  const handleSearch = useCallback(async () => {
    const code = nationalCode.trim()
    if (code.length !== 10 || !/^\d{10}$/.test(code)) {
      setError('لطفاً کد ملی ۱۰ رقمی معتبر وارد کنید')
      setPatient(null)
      return
    }

    setSearching(true)
    setError(null)
    setPatient(null)
    setSelectedPlan(null)

    try {
      const res = await patientsService.lookupByNationalCode(code)
      if (res.success && res.data) {
        setPatient(res.data as unknown as PatientLookupResult)
      } else {
        setError('بیماری با این کد ملی یافت نشد')
      }
    } catch {
      setError('خطا در جستجو. لطفاً دوباره تلاش کنید')
    } finally {
      setSearching(false)
    }
  }, [nationalCode])

  // ---------- Handle Enter Key ----------

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // ---------- Create Contract from Plan ----------

  const handleCreateContract = (plan: UserPlanItem) => {
    setSelectedPlan(plan)
    sessionStorage.setItem('contract_patient', JSON.stringify(patient))
    sessionStorage.setItem('contract_plan', JSON.stringify(plan))
    window.location.href = '/doctor/contracts'
  }

  // ---------- Derived patient name ----------

  const patientName = patient?.profile
    ? `${patient.profile.firstName || ''} ${patient.profile.lastName || ''}`.trim()
    : patient?.mobile || ''

  // ---------- Render ----------

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
    >
      {/* Page Header */}
      <motion.div variants={fadeIn}>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-transparent p-6 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
              <UserSearch className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">بررسی بیماران</h1>
              <p className="text-sm text-muted-foreground">
                با وارد کردن کد ملی بیمار، اطلاعات و طرح‌های فعال او را مشاهده کنید
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1">
              <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={nationalCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setNationalCode(val)
                  if (error) setError(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder="کد ملی بیمار (۱۰ رقم)"
                dir="ltr"
                className="pr-10 text-left font-mono text-lg tracking-widest h-12"
                maxLength={10}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching || nationalCode.trim().length !== 10}
              className="h-12 px-6 gap-2 font-medium"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              جستجو
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Patient Result */}
      <AnimatePresence mode="wait">
        {patient && (
          <motion.div
            key="patient-result"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-4"
          >
            {/* Patient Info Card */}
            <div className="rounded-xl border border-emerald-200 bg-card shadow-sm dark:border-emerald-800">
              <div className="p-4 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-semibold">اطلاعات بیمار</h2>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">نام بیمار</p>
                      <p className="text-sm font-semibold truncate">{patientName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                      <Hash className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">کد ملی</p>
                      <p className="text-sm font-semibold font-mono tracking-wider" dir="ltr">
                        {nationalCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400 shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">شماره موبایل</p>
                      <p className="text-sm font-semibold" dir="ltr">
                        {toPersianNum(patient?.mobile || '—')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Plans */}
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="p-4 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-semibold">طرح‌های فعال</h2>
                  <Badge variant="secondary" className="text-xs mr-auto">
                    {toPersianNum(patient.activePlans.filter(p => p.status === 'ACTIVE').length)} طرح فعال
                  </Badge>
                </div>
              </div>
              <div className="px-4 pb-4">
                {patient.activePlans.length > 0 ? (
                  <div className="space-y-3">
                    {patient.activePlans.map((plan, index) => (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Plan icon */}
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
                              plan.plan.discountPercent >= 20
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : plan.plan.discountPercent >= 15
                                ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                            }`}>
                              <Percent className="h-5 w-5" />
                            </div>

                            {/* Plan details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold">{plan.plan.name}</h3>
                                <Badge className="text-[10px]">
                                  {toPersianNum(plan.plan.discountPercent)}% تخفیف
                                </Badge>
                                <StatusBadge status={plan.status} className="text-[10px]" />
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  اعتبار تا {formatDate(plan.endDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {plan.remainingUses === -1
                                    ? 'نامحدود'
                                    : `${toPersianNum(plan.remainingUses)} استفاده باقی‌مانده`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action */}
                          <Button
                            onClick={() => handleCreateContract(plan)}
                            size="sm"
                            className="shrink-0 gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            ثبت قرارداد جدید
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">بیمار طرح فعالی ندارد</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Not Found State */}
        {!patient && !searching && error && (
          <motion.div
            key="not-found"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className="rounded-xl border border-dashed">
              <div className="p-10 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="font-semibold text-lg">بیماری یافت نشد</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    بیماری با کد ملی <span className="font-mono font-bold text-foreground" dir="ltr">{nationalCode}</span> در سیستم ثبت نشده است
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    لطفاً کد ملی را بررسی کنید یا از بیمار بخواهید ابتدا در سامانه ثبت‌نام کند
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Searching State */}
        {searching && (
          <motion.div
            key="searching"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className="rounded-xl border bg-card">
              <div className="p-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">در حال جستجوی بیمار...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State (initial) */}
      {!patient && !searching && !error && (
        <motion.div variants={fadeIn}>
          <div className="rounded-xl border border-dashed">
            <div className="p-10 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <UserSearch className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">جستجوی بیمار</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  کد ملی ۱۰ رقمی بیمار را در بخش بالا وارد کنید تا اطلاعات و طرح‌های فعال او نمایش داده شود
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
