'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  Bell,
  Menu,
  ChevronLeft,
  ShieldX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  adminDashboardPageTitles,
  canViewAdminNavItem,
  getAdminDashboardNavForUser,
  getAdminNavItemForPath,
} from '@/config/dashboard-nav'
import { hasFullAdminRole } from '@/lib/admin-access'
import { AdminRoute } from '@/components/guards/AdminRoute'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/* ---- Sidebar Content (shared between mobile & desktop) ---- */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? ''
  const { user, logout } = useAuthStore()
  const navItems = getAdminDashboardNavForUser(user)

  const userInitials = user?.profile
    ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
    : (user?.mobile || '').slice(-2)

  return (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <BrandLogo imageClassName="h-10" />
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">پنل مدیریت</span>
          <span className="text-[11px] text-muted-foreground">سامانه تخفیف درمانی</span>
        </div>
      </div>

      <Separator className="opacity-60" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400'
                )}
              >
                <span
                  className={cn(
                    'transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="mr-auto flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="opacity-60" />

      {/* User footer */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
              <Avatar className="size-8 ring-2 ring-emerald-100 dark:ring-emerald-900">
                <AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {userInitials || 'م'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden text-right">
                <span className="truncate text-sm font-medium">
                  {user?.profile?.firstName && user?.profile?.lastName
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : user?.mobile || 'کاربر'}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {user?.roles?.[0] || 'مدیر سیستم'}
                </span>
              </div>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void logout()}>
              <LogOut className="ml-2 size-4" />
              خروج از حساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/* ── Main Sidebar (desktop + mobile trigger) ────────────── */

function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0" dir="rtl">
            <SheetHeader className="sr-only">
              <SheetTitle>منوی ناوبری</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <BrandLogo imageClassName="h-8" />
          <span className="text-sm font-bold">پنل مدیریت</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:z-30">
        <div className="flex h-full flex-col border-e bg-card">
          <SidebarContent />
        </div>
      </aside>
    </>
  )
}

/* ── Top Bar ────────────────────────────────────────────── */

function AdminTopbar() {
  const pathname = usePathname() ?? ''
  const { user, logout } = useAuthStore()

  const currentPageTitle = adminDashboardPageTitles[pathname] || 'مدیریت'

  const userInitials = user?.profile
    ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
    : (user?.mobile || '').slice(-2)

  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/dashboard" className="text-muted-foreground">
                مدیریت
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative size-9">
                <Bell className="size-4" />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-emerald-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>اعلان‌ها</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="bg-emerald-100 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {userInitials || 'م'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium lg:inline">
                {user?.profile?.firstName && user?.profile?.lastName
                  ? `${user.profile.firstName} ${user.profile.lastName}`
                  : user?.mobile || 'کاربر'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => void logout()} className="text-destructive focus:text-destructive">
              <LogOut className="ml-2 size-4" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

/* ── Root Layout ────────────────────────────────────────── */

function AdminSectionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const { user } = useAuthStore()

  if (!user || pathname === '/admin') {
    return <>{children}</>
  }

  const matchedNavItem = getAdminNavItemForPath(pathname)
  const canViewMatchedItem = matchedNavItem ? canViewAdminNavItem(matchedNavItem, user) : false
  const canViewUnlistedAdminPath = !matchedNavItem && hasFullAdminRole(user.roles || [])

  if (canViewMatchedItem || canViewUnlistedAdminPath) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">دسترسی محدود</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            شما دسترسی لازم برای مشاهده این بخش مدیریتی را ندارید.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">بازگشت به پنل مدیریت</Link>
        </Button>
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-background" dir="rtl">
        <AdminSidebar />

        {/* Main content area */}
        <div className="md:pr-64">
          <AdminTopbar />

          {/* Page content */}
          <main className="p-4 md:p-6">
            <AdminSectionGuard>{children}</AdminSectionGuard>
          </main>
        </div>
      </div>
    </AdminRoute>
  )
}
