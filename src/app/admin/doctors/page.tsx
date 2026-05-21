'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  Stethoscope,
  Percent,
  Save,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, SearchFilterBar, StatusBadge } from '@/components/shared'
import { doctorsService } from '@/services'
import type { DoctorItem } from '@/types'
import { toPersianNum, getDisplayName, formatDate } from '@/utils/formatters'
import { DOCTOR_STATUS_LABELS } from '@/constants'

/* ── Specialty filter options ─────────────────────────────── */

const SPECIALTY_FILTERS = [
  { value: 'ALL', label: 'همه تخصص‌ها' },
  { value: 'GENERAL', label: 'عمومی' },
  { value: 'CARDIOLOGIST', label: 'قلب و عروق' },
  { value: 'ORTHOPEDIST', label: 'ارتوپدی' },
  { value: 'DERMATOLOGIST', label: 'پوست' },
  { value: 'PEDIATRICIAN', label: 'اطفال' },
  { value: 'NEUROLOGIST', label: 'مغز و اعصاب' },
  { value: 'ENT', label: 'گوش حلق بینی' },
  { value: 'OPHTHALMOLOGIST', label: 'چشم‌پزشکی' },
  { value: 'GYNECOLOGIST', label: 'زنان و زایمان' },
  { value: 'UROLOGIST', label: 'اورولوژی' },
  { value: 'PSYCHIATRIST', label: 'روان‌پزشکی' },
]

/* ── Doctors Page ────────────────────────────────────────── */

export default function AdminDoctorsPage() {
  const { toast } = useToast()
  const [doctors, setDoctors] = useState<DoctorItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [discountInput, setDiscountInput] = useState('0')
  const [savingDiscount, setSavingDiscount] = useState(false)

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: { page: number; limit: number; search?: string; specialty?: string } = {
        page,
        limit: 20,
      }
      if (search) params.search = search
      if (specialtyFilter !== 'ALL') params.specialty = specialtyFilter

      const res = await doctorsService.getList(params)
      if (res.success && res.data) {
        setDoctors(res.data)
        setTotalPages(res.pagination?.totalPages ?? 1)
        setTotal(res.pagination?.total ?? 0)
      }
    } catch {
      setDoctors([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, specialtyFilter])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = async (doctorId: string, newStatus: string) => {
    setChangingId(doctorId)
    try {
      await doctorsService.changeStatus(doctorId, newStatus)
      toast({
        title: 'موفق',
        description: `وضعیت پزشک به «${DOCTOR_STATUS_LABELS[newStatus as keyof typeof DOCTOR_STATUS_LABELS] || newStatus}» تغییر یافت`,
      })
      fetchDoctors()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در تغییر وضعیت پزشک',
        variant: 'destructive',
      })
    } finally {
      setChangingId(null)
    }
  }

  const handleViewDetail = async (doctorId: string) => {
    setDetailOpen(true)
    setIsDetailLoading(true)
    setSelectedDoctor(null)
    setDetailError(null)
    try {
      const res = await doctorsService.getById(doctorId)
      if (res.success && res.data) {
        setSelectedDoctor(res.data)
        setDiscountInput(String(res.data.discountPercent ?? 0))
      } else {
        setDetailError(res.error?.message || 'خطا در دریافت جزئیات')
      }
    } catch {
      setDetailError('خطا در دریافت جزئیات پزشک')
      toast({
        title: 'خطا',
        description: 'خطا در دریافت جزئیات',
        variant: 'destructive',
      })
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleSaveDiscount = async () => {
    if (!selectedDoctor) return
    const value = parseInt(discountInput, 10)
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast({
        title: 'خطا',
        description: 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد',
        variant: 'destructive',
      })
      return
    }
    setSavingDiscount(true)
    try {
      await doctorsService.updateByAdmin(selectedDoctor.id, {
        discountPercent: value,
      })
      setSelectedDoctor((prev) => (prev ? { ...prev, discountPercent: value } : prev))
      toast({
        title: 'موفق',
        description: 'درصد تخفیف پزشک ذخیره شد',
      })
      fetchDoctors()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیره درصد تخفیف',
        variant: 'destructive',
      })
    } finally {
      setSavingDiscount(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت پزشکان"
        description={
          <>
            مشاهده و مدیریت پزشکان سامانه —{' '}
            <span className="font-semibold text-emerald-600">{toPersianNum(total)}</span>{' '}
            پزشک
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="جستجو بر اساس نام، تخصص یا کد نظام..."
        onSearch={handleSearch}
        filterOptions={SPECIALTY_FILTERS}
        filterValue={specialtyFilter}
        onFilterChange={(v) => {
          setSpecialtyFilter(v)
          setPage(1)
        }}
      />

      {/* Manual Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-right font-semibold text-sm">نام پزشک</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">تخصص</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">کد نظام</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">شهر</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">موبایل</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">درصد تخفیف</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">وضعیت</th>
              <th className="px-4 py-3 text-right font-semibold text-sm">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td colSpan={8} className="px-4 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  پزشکی یافت نشد
                </td>
              </tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id} className="border-b hover:bg-muted/30 group transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">
                    {getDisplayName(doctor.user)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {doctor.specialty || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                    {doctor.medicalCode || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {doctor.city || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {doctor.user?.mobile || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-600">
                    {(doctor.discountPercent ?? 0) > 0
                      ? `${toPersianNum(doctor.discountPercent ?? 0)}٪`
                      : 'طرح بیمار'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <StatusBadge status={doctor.status} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(doctor.id)}>
                          <Eye className="ml-2 size-4" />
                          مشاهده جزئیات
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {doctor.status !== 'APPROVED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(doctor.id, 'APPROVED')}
                            disabled={changingId === doctor.id}
                          >
                            <CheckCircle className="ml-2 size-4 text-emerald-600" />
                            تأیید
                          </DropdownMenuItem>
                        )}
                        {doctor.status !== 'REJECTED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(doctor.id, 'REJECTED')}
                            disabled={changingId === doctor.id}
                          >
                            <XCircle className="ml-2 size-4 text-red-600" />
                            رد
                          </DropdownMenuItem>
                        )}
                        {doctor.status !== 'SUSPENDED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(doctor.id, 'SUSPENDED')}
                            disabled={changingId === doctor.id}
                          >
                            <Ban className="ml-2 size-4 text-orange-600" />
                            تعلیق
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          {total !== undefined && (
            <span className="text-sm text-muted-foreground">
              {toPersianNum(total)} مورد
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              صفحه قبل
            </Button>
            <span className="text-sm text-muted-foreground">
              {toPersianNum(page)} / {toPersianNum(totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              صفحه بعد
            </Button>
          </div>
        </div>
      )}

      {/* Doctor detail dialog */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setSelectedDoctor(null)
            setDetailError(null)
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>جزئیات پزشک</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : detailError ? (
            <p className="text-sm text-destructive text-center py-6">{detailError}</p>
          ) : selectedDoctor ? (
            <div className="space-y-4">
              {/* Doctor info */}
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold">اطلاعات پزشک</h3>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">نام: </span>
                    <span className="font-medium">
                      {getDisplayName(selectedDoctor.user)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تخصص: </span>
                    <span>{selectedDoctor.specialty || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">کد نظام پزشکی: </span>
                    <span className="font-mono">
                      {selectedDoctor.medicalCode || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">وضعیت: </span>
                    <StatusBadge status={selectedDoctor.status} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">شهر: </span>
                    <span>
                      {selectedDoctor.province && selectedDoctor.city
                        ? `${selectedDoctor.province}، ${selectedDoctor.city}`
                        : selectedDoctor.city || selectedDoctor.province || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">موبایل: </span>
                    <span className="font-mono">
                      {selectedDoctor.user?.mobile || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinic info */}
              {(selectedDoctor.clinicName ||
                selectedDoctor.clinicAddress ||
                selectedDoctor.phone) && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">اطلاعات مطب</h3>
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      {selectedDoctor.clinicName && (
                        <div>
                          <span className="text-muted-foreground">نام مطب: </span>
                          <span>{selectedDoctor.clinicName}</span>
                        </div>
                      )}
                      {selectedDoctor.phone && (
                        <div>
                          <span className="text-muted-foreground">تلفن مطب: </span>
                          <span className="font-mono" dir="ltr">
                            {selectedDoctor.phone}
                          </span>
                        </div>
                      )}
                      {selectedDoctor.clinicAddress && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">آدرس مطب: </span>
                          <span>{selectedDoctor.clinicAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Admin: discount percent */}
              <Separator />
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20 p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Percent className="size-4 text-emerald-600" />
                  درصد تخفیف ویزیت
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  درصد تخفیفی که این پزشک در ویزیت اعمال می‌کند. اگر ۰ باشد، از درصد طرح بیمار استفاده می‌شود.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2 flex-1 min-w-[140px]">
                    <Label htmlFor="doctorDiscount">درصد تخفیف (۰–۱۰۰)</Label>
                    <Input
                      id="doctorDiscount"
                      type="number"
                      min={0}
                      max={100}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      dir="ltr"
                      className="font-mono"
                    />
                  </div>
                  <Button
                    onClick={handleSaveDiscount}
                    disabled={savingDiscount}
                    className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                  >
                    {savingDiscount ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="ml-2 size-4" />
                        ذخیره تخفیف
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bio */}
              {selectedDoctor.bio && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-4 space-y-2">
                    <h3 className="font-semibold">بیوگرافی</h3>
                    <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                      {selectedDoctor.bio}
                    </p>
                  </div>
                </>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {selectedDoctor.status !== 'APPROVED' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      handleStatusChange(selectedDoctor.id, 'APPROVED')
                      setSelectedDoctor(null)
                    }}
                    disabled={changingId === selectedDoctor.id}
                  >
                    <CheckCircle className="ml-1.5 size-4" />
                    تأیید
                  </Button>
                )}
                {selectedDoctor.status !== 'REJECTED' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      handleStatusChange(selectedDoctor.id, 'REJECTED')
                      setSelectedDoctor(null)
                    }}
                    disabled={changingId === selectedDoctor.id}
                  >
                    <XCircle className="ml-1.5 size-4" />
                    رد
                  </Button>
                )}
                {selectedDoctor.status !== 'SUSPENDED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleStatusChange(selectedDoctor.id, 'SUSPENDED')
                      setSelectedDoctor(null)
                    }}
                    disabled={changingId === selectedDoctor.id}
                  >
                    <Ban className="ml-1.5 size-4" />
                    تعلیق
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
