'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { agentsService } from '@/services/agents.service'
import { StatusBadge, PageHeader } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Save,
  Loader2,
  User,
  Building,
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

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')

  // ---------- Fetch Data ----------

  const fetchData = useCallback(async () => {
    try {
      const agentRes = await agentsService.getMyProfile()

      if (agentRes.success && agentRes.data) {
        const agent = agentRes.data as unknown as AgentItem
        setAgentData(agent)
        setBusinessName(agent.businessName || '')
        setDescription(agent.description || '')
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

  // ---------- Save Profile ----------

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast({
        title: 'خطا',
        description: 'نام کسب‌وکار نمی‌تواند خالی باشد',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await agentsService.updateMyProfile({
        businessName: businessName.trim(),
        description: description.trim() || undefined,
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

  const referralCode = agentData?.id || ''
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${referralCode.slice(0, 8)}`
    : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
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
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
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
        title="پروفایل نماینده"
        description="مشاهده و ویرایش اطلاعات نمایندگی"
      />

      {/* User Info (Read-only) */}
      <Card>
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
                className="bg-muted pr-10"
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
                className="bg-muted pr-10"
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
                className="bg-muted pr-10"
                placeholder="ایمیل"
                dir="ltr"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Info (Editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="size-4 text-muted-foreground" />
            اطلاعات کسب‌وکار
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business Name (editable) */}
          <div className="space-y-2">
            <Label htmlFor="businessName">نام کسب‌وکار</Label>
            <div className="relative">
              <Building className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="pr-10"
                placeholder="نام کسب‌وکار را وارد کنید"
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
              placeholder="توضیحات مربوط به کسب‌وکار خود را وارد کنید..."
              rows={4}
            />
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
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="size-4 text-emerald-600" />
            لینک معرفی شما
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            با اشتراک‌گذاری این لینک، کاربرانی که از طریق شما ثبت‌نام کنند در پنل شما نمایش داده می‌شوند و پورسانت آن‌ها به حساب شما واریز خواهد شد.
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={referralLink}
                readOnly
                className="pr-10 bg-muted font-mono text-xs"
                dir="ltr"
              />
            </div>
            <Button
              onClick={handleCopyLink}
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
                وضعیت نمایندگی:{' '}
                {AGENT_STATUS_LABELS[agentData.status as keyof typeof AGENT_STATUS_LABELS] || agentData.status}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
