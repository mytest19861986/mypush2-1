'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'

export default function PremiumPreviewPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12 space-y-10" dir="rtl">
      {/* Header */}
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="premium">
            <Sparkles className="size-3.5 text-primary" />
            <span>نسخه آزمایشی دیزاین سیستم پریمیوم</span>
          </Badge>
          <Badge variant="success">Mission 526 Verified</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          پیش‌نمایش پایه‌های Design System Premium حامی‌کارت
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          ارزیابی اتم‌های بصری، کارت‌ها، دکمه‌های شیشه‌ای و وضعیت‌های سلامت بدون تغییر در معماری یا اسکلت سیستم.
        </p>
      </div>

      {/* Grid of Preview Cards */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Premium Styled Card */}
        <Card variant="premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="premium">طرح سلامت طلایی</Badge>
              <Shield className="size-5 text-primary" />
            </div>
            <CardTitle className="text-xl mt-2">پوشش کامل خدمات دندانپزشکی و رفاهی</CardTitle>
            <CardDescription>
              تخفیف ویژه تا سقف ۴۵٪ در بیش از ۲۰۰ مرکز تخصصی طرف قرارداد حامی‌کارت.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground/90">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>پشتیبانی VIP و نوبت‌دهی آنلاین ۲۴ ساعته</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/90">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>پوشش هزینه‌های تشخیصی و تصویربرداری</span>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border/40 pt-4">
            <span className="text-lg font-bold text-foreground">۲,۵۰۰,۰۰۰ تومان</span>
            <Button variant="premium" size="sm">
              انتخاب و فعال‌سازی
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Card 2: Glass Styled Card */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="warning">نیازمند تکمیل مدارک</Badge>
              <span className="text-xs font-mono text-muted-foreground">REF-84920</span>
            </div>
            <CardTitle className="text-xl mt-2">پروفایل پزشک همکار</CardTitle>
            <CardDescription>
              دکتر علیرضا افشارزاده — متخصص جراحی فک و صورت
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">فعال</Badge>
              <Badge variant="secondary">تهران، ونک</Badge>
              <Badge variant="outline">تعرفه همکار</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تمامی مراجعات ثبت‌شده از طریق سامانه با احراز شماره موبایل و کد اختصاصی حامی‌کارت انجام می‌شوند.
            </p>
          </CardContent>
          <CardFooter className="flex gap-3 border-t border-border/40 pt-4">
            <Button variant="outline" size="sm" className="w-full">مشاهده سوابق</Button>
            <Button variant="default" size="sm" className="w-full">ثبت نسخه جدید</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Button & Badge Palette Showcase */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-lg font-bold text-foreground">کاتالوگ تعاملی دکمه‌ها و نشان‌ها</h2>
        <Card variant="default">
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="premium">دکمه Premium Gradient</Button>
              <Button variant="default">دکمه Default</Button>
              <Button variant="secondary">دکمه Secondary</Button>
              <Button variant="outline">دکمه Outline</Button>
              <Button variant="ghost">دکمه Ghost</Button>
              <Button variant="glass">دکمه Glassmorphism</Button>
              <Button variant="destructive">دکمه Destructive</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-4">
              <Badge variant="default">Default Badge</Badge>
              <Badge variant="premium">Premium Badge</Badge>
              <Badge variant="success">Success Badge</Badge>
              <Badge variant="warning">Warning Badge</Badge>
              <Badge variant="destructive">Destructive Badge</Badge>
              <Badge variant="outline">Outline Badge</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
