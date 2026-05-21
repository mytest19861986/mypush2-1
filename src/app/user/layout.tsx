'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserRoute } from '@/components/guards/UserRoute'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { ErrorBoundary, ThemeToggle } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  User,
  LogOut,
  Menu,
  HeartPulse,
} from 'lucide-react'

// ---------- Nav Items ----------

const navItems = [
  { href: '/user/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/user/plans', label: 'طرح‌های من', icon: CreditCard },
  { href: '/user/contracts', label: 'قراردادها', icon: FileText },
  { href: '/user/profile', label: 'پروفایل', icon: User },
]

// ---------- Sidebar Content ----------

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const fullName =
    user?.profile?.firstName && user?.profile?.lastName
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user?.mobile || 'کاربر'

  const userInitials = user?.profile
    ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
    : (user?.mobile || '').slice(-2)

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      /* continue logout */
    }
    logout()
    router.replace('/')
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Brand */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartPulse className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">پنل کاربری</span>
          <span className="text-xs text-muted-foreground">تخفیف درمان</span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Footer - User info + Logout */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="size-8">
            {user?.profile?.avatar && (
              <AvatarImage src={user.profile.avatar} alt={fullName} />
            )}
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {userInitials || 'ک'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{fullName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user?.profile?.nationalCode
                ? `کد ملی: ${user.profile.nationalCode}`
                : 'کاربر عادی'}
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>خروج از حساب</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

// ---------- Topbar ----------

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuthStore()

  const fullName =
    user?.profile?.firstName && user?.profile?.lastName
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user?.mobile || 'کاربر'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden sm:flex">
          <HeartPulse className="ml-1 size-3" />
          تخفیف درمان
        </Badge>

        <span className="hidden text-sm text-muted-foreground sm:block">
          {fullName}
        </span>

        <ThemeToggle />

        <Separator orientation="vertical" className="h-6" />

        <Avatar className="size-8">
          {user?.profile?.avatar && (
            <AvatarImage src={user.profile.avatar} alt={fullName} />
          )}
          <AvatarFallback className="bg-primary/10 text-xs text-primary">
            {user?.profile
              ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
              : 'ک'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

// ---------- Layout ----------

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <UserRoute>
      <ErrorBoundary>
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="flex min-h-screen">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-l bg-card">
            <SidebarContent />
          </aside>

          {/* Mobile Sidebar (Sheet) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="right" className="w-60 p-0">
              <SheetTitle className="sr-only">منوی ناوبری</SheetTitle>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <div className="flex flex-1 flex-col min-w-0">
            <Topbar onMenuClick={() => setMobileOpen(true)} />

            <main className="flex-1 p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    </UserRoute>
  )
}
