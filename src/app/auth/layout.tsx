import type { Metadata } from 'next'
import { ErrorBoundary } from '@/components/shared'

export const metadata: Metadata = {
  title: 'ورود - سامانه تخفیف درمانی',
  description: 'ورود به سامانه تخفیف درمانی با استفاده از کد یکبار مصرف یا رمز عبور',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif' }}
    >
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}
