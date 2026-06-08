'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { agentsService } from '@/services/agents.service'
import { PageHeader } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { normalizeCardNumber, normalizePayoutUpdate } from '@/lib/payout'
import {
  Save,
  Loader2,
  User,
  CreditCard,
  Mail,
  Phone,
  Copy,
  Check,
  Link2,
  Shield,
} from 'lucide-react'
import { AGENT_STATUS_LABELS } from '@/constants'
import type { AgentItem } from '@/types'

// ---------- Profile Page ----------

export default function AgentProfilePage() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [agentData, setAgentData] = useState<AgentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [sheba, setSheba] = useState('')
  const [accountOwnerName, setAccountOwnerName] = useState('')

  // ---------- Fetch Data ----------

  const fetchData = useCallback(async () => {
    try {
      const agentRes = await agentsService.getMyProfile()

      if (agentRes.success && agentRes.data) {
        const agent = agentRes.data as unknown as AgentItem
        setAgentData(agent)
        setBusinessName(agent.businessName || '')
        setDescription(agent.description || '')
        setCardNumber(agent.user?.profile?.payoutCardNumber || '')
        setSheba(agent.user?.profile?.payoutSheba || '')
        setAccountOwnerName(agent.user?.profile?.payoutAccountOwnerName || '')
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در دریافت اطلاعات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // ---------- Save Profile ----------

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast({
        title: 'خطا',
        description: 'نام همکار فروش نمی‌تواند خالی باشد',
        variant: 'destructive',
      })
      return
    }

    const payout = normalizePayoutUpdate({
      cardNumber,
      sheba,
      accountOwnerName,
    })

    if (payout.errors.length > 0) {
      toast({
        title: 'خطا',
        description: payout.errors[0],
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await agentsService.updateMyProfile({
        businessName: businessName.trim(),
        description: description.trim() || undefined,
        cardNumber: payout.values.payoutCardNumber,
        sheba: payout.values.payoutSheba,
        accountOwnerName: payout.values.payoutAccountOwnerName,
      })

      toast({
        title: 'موفق',
        description: 'اطلاعات با موفقیت ذخیره شد',
      })
      await fetchData()
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در ارتباط با سرور',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // ---------- Copy Referral Link ----------

  const referralCode = agentData?.referralCode || ''
  const referralLink =
    referralCode && origin
      ? `${origin}/auth/login?ref=${encodeURIComponent(referralCode)}`
      : ''

  const copyTextWithFallback = async (text: string) => {
    if (!text) return false

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // Fall through to the selection-based fallback below.
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', 'true')
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      return document.execCommand('copy')
    } finally {
      document.body.removeChild(textArea)
    }
  }

  const handleCopyLink = async () => {
    try {
      const didCopy = await copyTextWithFallback(referralLink)
      if (!didCopy) throw new Error('COPY_FAILED')
      setCopied(true)
      toast({
        title: 'کپی شد',
        description: 'لینک معرفی در کلیپبورد کپی شد',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در کپی لینک',
        variant: 'destructive',
      })
    }
  }

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const firstName = user?.profile?.firstName || ''
  const lastName = user?.profile?.lastName || ''
  const mobile = user?.mobile || ''
  const email = user?.email || ''

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="پروفایل همکار فروش"
        description="مشاهده و ویرایش اطلاعات همکار فروش"
      />

      {/* User Info (Read-only) */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            اطلاعات کاربری
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name (read-only) */}
          <div className="space-y-2">
            <Label>نام و نام خانوادگی</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={`${firstName} ${lastName}`.trim() || 'ثبت نشده'}
                readOnly
                className="border border-input bg-background pr-10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="نام"
              />
            </div>
          </div>

          {/* Mobile (read-only) */}
          <div className="space-y-2">
            <Label>شماره موبایل</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={mobile}
                readOnly
                className="border border-input bg-background pr-10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="شماره موبایل"
                dir="ltr"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>ایمیل</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={email || 'ثبت نشده'}
                readOnly
                className="border border-input bg-background pr-10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="ایمیل"
                dir="ltr"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Partner Info (Editable) */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            اطلاعات همکار فروش
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display Name (editable) */}
          <div className="space-y-2">
            <Label htmlFor="businessName">نام همکار فروش</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="border border-input bg-background pr-10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="نام همکار فروش را وارد کنید"
              />
            </div>
          </div>

          {/* Description (editable) */}
          <div className="space-y-2">
            <Label htmlFor="description">توضیحات</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات تکمیلی درباره تجربه فروش یا شیوه معرفی خود را وارد کنید..."
              rows={4}
              className="border border-input bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              اطلاعات مالی همکار فروش
            </CardTitle>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">شماره کارت</Label>
              <div className="relative">
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(normalizeCardNumber(e.target.value).slice(0, 16))}
                  className="border border-input bg-background pr-10 font-mono shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="6037990000000000"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={16}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheba">شماره شبا</Label>
              <div className="relative">
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="sheba"
                  value={sheba}
                  onChange={(e) => setSheba(e.target.value.toUpperCase())}
                  className="border border-input bg-background pr-10 font-mono shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="IR000000000000000000000000"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountOwnerName">نام صاحب حساب</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="accountOwnerName"
                  value={accountOwnerName}
                  onChange={(e) => setAccountOwnerName(e.target.value)}
                  className="border border-input bg-background pr-10 shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="نام و نام خانوادگی صاحب حساب"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[120px] bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 ml-2 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save className="size-4 ml-2" />
                  ذخیره تغییرات
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="size-4 text-emerald-600" />
            لینک معرفی شما
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            با اشتراک‌گذاری این لینک، کاربرانی که از طریق شما ثبت‌نام کنند در پنل شما نمایش داده می‌شوند و پورسانت آن‌ها برای تسویه دستی مدیریت ثبت می‌شود.
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={referralLink}
                readOnly
                className="border border-input bg-background pr-10 font-mono text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
                dir="ltr"
              />
            </div>
            <Button
              onClick={handleCopyLink}
              disabled={!referralLink}
              variant={copied ? 'default' : 'outline'}
              className={`shrink-0 min-w-[100px] ${copied ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              size="sm"
            >
              {copied ? (
                <>
                  <Check className="size-4 ml-1" />
                  کپی شد
                </>
              ) : (
                <>
                  <Copy className="size-4 ml-1" />
                  کپی لینک
                </>
              )}
            </Button>
          </div>

          {agentData && (
            <div className="flex items-center gap-2 pt-1">
              <Shield className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                وضعیت همکاری فروش:{' '}
                {AGENT_STATUS_LABELS[agentData.status as keyof typeof AGENT_STATUS_LABELS] || agentData.status}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
