'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  CreditCard,
  Pencil,
  Trash2,
  Percent,
  CalendarDays,
  Users,
  Tag,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatusBadge, EmptyState } from '@/components/shared'
import { plansService } from '@/services'
import type { DiscountPlanItem } from '@/types'
import { toPersianNum, formatPrice } from '@/utils/formatters'

/* ── Types ────────────────────────────────────────────────── */

interface PlanFormData {
  name: string
  description: string
  price: number
  discountPercent: number
  durationDays: number
  maxUses: number
  status: string
}

const emptyForm: PlanFormData = {
  name: '',
  description: '',
  price: 0,
  discountPercent: 0,
  durationDays: 30,
  maxUses: -1,
  status: 'ACTIVE',
}

/* ── Plans Page ──────────────────────────────────────────── */

export default function AdminPlansPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<DiscountPlanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<DiscountPlanItem | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DiscountPlanItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await plansService.getList()
      if (res.success && res.data) {
        setPlans(Array.isArray(res.data) ? res.data : [])
      }
    } catch {
      setPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  /* ── Dialog handlers ──────────────────────────────────── */

  const openCreateDialog = () => {
    setEditingPlan(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (plan: DiscountPlanItem) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      discountPercent: plan.discountPercent,
      durationDays: plan.durationDays,
      maxUses: plan.maxUses,
      status: plan.status,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'خطا',
        description: 'نام طرح الزامی است',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      if (editingPlan) {
        await plansService.update(editingPlan.id, formData)
        toast({ title: 'موفق', description: 'طرح با موفقیت بروزرسانی شد' })
      } else {
        await plansService.create(formData)
        toast({ title: 'موفق', description: 'طرح جدید با موفقیت ایجاد شد' })
      }
      setDialogOpen(false)
      fetchPlans()
    } catch {
      toast({
        title: 'خطا',
        description: editingPlan ? 'خطا در بروزرسانی طرح' : 'خطا در ایجاد طرح',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await plansService.delete(deleteTarget.id)
      toast({ title: 'موفق', description: 'طرح با موفقیت حذف شد' })
      setDeleteTarget(null)
      fetchPlans()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در حذف طرح',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = async (plan: DiscountPlanItem) => {
    setTogglingId(plan.id)
    const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await plansService.update(plan.id, { status: newStatus })
      toast({
        title: 'موفق',
        description: `طرح ${newStatus === 'ACTIVE' ? 'فعال' : 'غیرفعال'} شد`,
      })
      fetchPlans()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در تغییر وضعیت',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="طرح‌های تخفیف"
        description={
          <>
            مدیریت طرح‌های تخفیف درمانی —{' '}
            <span className="font-semibold text-emerald-600">{toPersianNum(plans.length)}</span>{' '}
            طرح
          </>
        }
        action={
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="ml-2 size-4" />
            ایجاد طرح جدید
          </Button>
        }
      />

      {/* Plan cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="هنوز طرحی ایجاد نشده است"
          description="اولین طرح تخفیف درمانی خود را ایجاد کنید"
          action={{
            label: 'ایجاد اولین طرح',
            onClick: openCreateDialog,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="border-0 shadow-sm transition-shadow hover:shadow-md group"
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CreditCard className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{plan.name}</h3>
                      <StatusBadge status={plan.status} className="text-[10px]" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                {plan.description && (
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-5">
                    {plan.description}
                  </p>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Tag className="size-3" />
                      <span className="text-[10px]">قیمت</span>
                    </div>
                    <span className="text-xs font-bold">
                      {formatPrice(plan.price)}
                      <span className="text-[10px] font-normal text-muted-foreground mr-0.5">
                        تومان
                      </span>
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Percent className="size-3" />
                      <span className="text-[10px]">تخفیف</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">
                      {toPersianNum(plan.discountPercent)}٪
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <CalendarDays className="size-3" />
                      <span className="text-[10px]">مدت</span>
                    </div>
                    <span className="text-xs font-bold">
                      {toPersianNum(plan.durationDays)} روز
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Users className="size-3" />
                      <span className="text-[10px]">استفاده</span>
                    </div>
                    <span className="text-xs font-bold">
                      {plan.maxUses === -1 ? 'نامحدود' : toPersianNum(plan.maxUses)}
                    </span>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.status === 'ACTIVE'}
                      disabled={togglingId === plan.id}
                      onCheckedChange={() => handleToggleStatus(plan)}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <Label className="text-xs text-muted-foreground">
                      {togglingId === plan.id
                        ? '...'
                        : plan.status === 'ACTIVE'
                          ? 'فعال'
                          : 'غیرفعال'}
                    </Label>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEditDialog(plan)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(plan)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'ویرایش طرح' : 'ایجاد طرح جدید'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'اطلاعات طرح تخفیف را ویرایش کنید'
                : 'اطلاعات طرح تخفیف جدید را وارد کنید'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="plan-name">
                نام طرح <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-name"
                placeholder="مثلاً: طرح طلایی"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="plan-desc">توضیحات</Label>
              <Textarea
                id="plan-desc"
                placeholder="توضیحات مختصر درباره طرح..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Price & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-price">قیمت (تومان)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-discount">درصد تخفیف</Label>
                <Input
                  id="plan-discount"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={formData.discountPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountPercent:
                        Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                    })
                  }
                />
              </div>
            </div>

            {/* Duration & Max Uses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-duration">مدت طرح (روز)</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={1}
                  placeholder="30"
                  value={formData.durationDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationDays: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-maxuses">حداکثر استفاده</Label>
                <Input
                  id="plan-maxuses"
                  type="number"
                  min={-1}
                  placeholder="-1 برای نامحدود"
                  value={formData.maxUses}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxUses: parseInt(e.target.value) || -1,
                    })
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  {formData.maxUses === -1 ? 'نامحدود' : `${toPersianNum(formData.maxUses)} بار`}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">وضعیت</Label>
                <p className="text-xs text-muted-foreground">
                  طرح فعال در سامانه نمایش داده می‌شود
                </p>
              </div>
              <Switch
                checked={formData.status === 'ACTIVE'}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    status: checked ? 'ACTIVE' : 'INACTIVE',
                  })
                }
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              انصراف
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="ml-2 size-4 animate-spin" />
                  ذخیره...
                </>
              ) : editingPlan ? (
                'بروزرسانی'
              ) : (
                'ایجاد'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف طرح</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف طرح <strong>{deleteTarget?.name}</strong> اطمینان
              دارید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:justify-start">
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'در حال حذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
