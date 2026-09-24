'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Briefcase,
  CreditCard,
  Wallet,
  ShoppingBag,
  MessageSquareText,
  Shield,
  BarChart3,
  Building2,
  Search,
  Bell,
  ChevronDown,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  ShieldPlus,
  Menu,
  X,
  LogOut
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth-store'
import { AdminRoute } from '@/components/guards/AdminRoute'
import { phase1DemoVisibleItems } from '@/config/demo-scope'

interface DashboardAppShellProps {
  children: React.ReactNode
  activeMenu?: string
}

export function DashboardAppShell({ children, activeMenu = 'dashboard' }: DashboardAppShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()

  const displayName = user?.profile?.firstName && user?.profile?.lastName
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : (user?.profile?.firstName || 'مدیر کل سیستم')

  const roleTitle = user?.roles?.[0] || 'SUPER_ADMIN'

  const userInitials = user?.profile?.firstName
    ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
    : (user?.mobile || '').slice(-2) || 'م‌س'

  const handleLogout = async () => {
    try {
      await logout({ redirectTo: '/auth/login', callApi: true })
    } catch {
      // Fallback in case of timeout or unhandled exception
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        document.cookie = 'accessToken=; path=/; max-age=0'
        document.cookie = 'refreshToken=; path=/; max-age=0'
        window.location.href = '/auth/login'
      }
    }
  }

  // Production Navigation Contract filtered by DEMO_SCOPE_PHASE_1 (Exact 5 permitted items for Demo)
  const allNavItems = [
    { href: '/admin/dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { href: '/admin/users', label: 'کاربران', icon: Users },
    { href: '/admin/doctors', label: 'پزشکان', icon: Stethoscope },
    { href: '/admin/agents', label: 'همکاران فروش', icon: Briefcase },
    { href: '/admin/plans', label: 'طرح‌ها', icon: CreditCard },
    { href: '/admin/financial-management', label: 'مدیریت مالی', icon: CreditCard },
    { href: '/admin/commissions', label: 'مدیریت پورسانت‌ها', icon: Wallet },
    { href: '/admin/sales-customers', label: 'مشتریان فروش', icon: ShoppingBag },
    { href: '/admin/reviews', label: 'مدیریت نظرات', icon: MessageSquareText },
    { href: '/admin/roles', label: 'نقش‌ها', icon: Shield },
    { href: '/admin/permissions', label: 'دسترسی‌ها', icon: Shield },
    { href: '/admin/audit-logs', label: 'گزارش فعالیت‌ها', icon: BarChart3 },
  ]
  const navItems = phase1DemoVisibleItems(allNavItems)

  // Rule 5: Exactly ONE single item active per route
  const activeNavItem = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => {
      const demoAlias = item.href.replace('/admin', '') || '/dashboard'
      return (
        pathname === item.href ||
        pathname?.startsWith(item.href + '/') ||
        pathname === demoAlias ||
        pathname?.startsWith(demoAlias + '/')
      )
    })

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full">
      <div className="p-5 space-y-6">
        {/* Logo & Brand */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#0D5C58] to-[#12827B] text-white flex items-center justify-center shadow-sm">
              <ShieldPlus className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">حامی‌کارت</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none">همراه سلامت، برای همه</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="size-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
              aria-label="بستن منو"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Navigation Items - Production Contract 12 items with Premium Style */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNavItem?.href === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0D5C58] to-[#12827B] text-white shadow-sm ring-1 ring-[#0D5C58]/30 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`size-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#0D5C58]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Sidebar Bottom User & Logout Controls (Mission 551-Demo-B4-FIX2) */}
      <div className="p-3 m-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex items-center gap-3 px-1">
          <div className="size-9 rounded-full bg-gradient-to-tr from-[#0D5C58] to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-xs font-bold text-slate-800 truncate" title={displayName}>
              {displayName}
            </p>
            <p className="text-[10px] text-emerald-600 font-mono font-medium truncate">
              {roleTitle}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false)
            void handleLogout()
          }}
          className="w-full justify-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50/80 border-red-200/80 rounded-xl py-2 transition-all cursor-pointer shadow-2xs"
          data-testid="sidebar-logout-button"
        >
          <LogOut className="size-3.5" />
          <span>خروج از حساب</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex overflow-x-hidden w-full max-w-full" dir="rtl">
      {/* ─── Mobile Drawer Overlay & Sidebar ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Sidebar Content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* ─── Desktop Sidebar (Hidden on mobile <768px) ─── */}
      <aside className="w-64 bg-white border-l border-slate-200/80 hidden md:flex flex-col justify-between shrink-0 shadow-xs z-20 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Mobile Menu Button & Search Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden size-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="باز کردن منو"
            >
              <Menu className="size-5" />
            </button>

            {/* Right: Search Capsule (Hidden on small mobile, visible on desktop) */}
            <div className="relative w-full max-w-xs lg:max-w-md hidden md:block">
              <Search className="size-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در کاربران، مراکز، درخواست‌ها ..."
                className="w-full h-10 pe-10 ps-4 bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58] transition-all"
              />
            </div>

            {/* Mobile Brand Name on top header */}
            <div className="md:hidden flex items-center gap-1.5">
              <div className="size-8 rounded-xl bg-[#0D5C58] text-white flex items-center justify-center shadow-2xs">
                <ShieldPlus className="size-4.5" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">حامی‌کارت</span>
            </div>
          </div>

          {/* Left: Alerts, Date, and User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-6 ms-auto">
            {/* Live Jalali Date & Time (Desktop only) */}
            <div className="hidden lg:flex flex-col text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Calendar className="size-3.5 text-[#0D5C58]" />
                <span>سه‌شنبه ۲۷ شهریور ۱۴۰۵</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">آخرین بروزرسانی: امروز ۱۴:۳۰</span>
            </div>

            {/* Notification Bell */}
            <button className="size-9 sm:size-10 rounded-full bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative shrink-0">
              <Bell className="size-4 sm:size-4.5" />
              <span className="size-2 rounded-full bg-[#EA580C] absolute top-2 end-2 sm:top-2.5 sm:end-2.5 ring-2 ring-white" />
            </button>

            {/* User Profile Capsule Dropdown (Mission 551-Demo-B4-FIX2) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 sm:gap-3 ps-1.5 sm:ps-4 border-s border-slate-200/80 hover:opacity-90 transition-opacity cursor-pointer shrink-0 outline-none"
                  aria-label="منوی کاربر"
                >
                  <div className="size-9 sm:size-10 rounded-full bg-gradient-to-tr from-[#0D5C58] to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                    {userInitials}
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-800">{displayName}</span>
                      <ChevronDown className="size-3.5 text-slate-400" />
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">{roleTitle}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl border border-slate-200" dir="rtl">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-900">{displayName}</span>
                    <span className="text-[11px] text-emerald-600 font-medium">{roleTitle}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <Users className="size-4 text-slate-500" />
                    <span>پروفایل من</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                >
                  <LogOut className="size-4" />
                  <span>خروج از حساب</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page View Body */}
        <main className="p-4 sm:p-6 lg:p-10 flex-1 w-full max-w-full overflow-x-hidden">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="px-4 sm:px-8 py-5 border-t border-slate-200/70 bg-white/70 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">حامی‌کارت</span>
            <span>•</span>
            <span>همراه سلامت، برای همه</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-5">
            <a href="#" className="hover:text-slate-600 transition-colors">قوانین و مقررات</a>
            <a href="#" className="hover:text-slate-600 transition-colors">حریم خصوصی</a>
            <a href="#" className="hover:text-slate-600 transition-colors">تماس با ما</a>
            <span>© ۱۴۰۵ تمامی حقوق محفوظ است.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
