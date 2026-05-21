'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AgentRoute } from '@/components/guards/AgentRoute'
import { ErrorBoundary } from '@/components/shared'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAuthStore } from '@/stores/auth-store'
import { agentsService } from '@/services'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  User,
  FileText,
  LogOut,
  Menu,
  Briefcase,
  Wallet,
  Shield,
} from 'lucide-react'
import type { AgentItem } from '@/types'
import { getDisplayName, getUserInitials } from '@/utils/formatters'

// ---------- Nav Items ----------

const navItems = [
  { href: '/agent/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/agent/commissions', label: 'پورسانت‌ها', icon: Wallet },
  { href: '/agent/documents', label: 'مدارک', icon: FileText },
  { href: '/agent/profile', label: 'پروفایل', icon: User },
]

// ---------- Sidebar Content ----------

function SidebarContent({
  agentData,
  onNavigate,
}: {
  agentData: AgentItem | null
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const userInitials = getUserInitials(user)

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
    } catch {
      // Continue logout even if API fails
    }
    logout()
    router.replace('/')
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Brand */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Briefcase className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">پنل نمایندگان</span>
          {agentData?.businessName && (
            <span className="truncate text-xs text-muted-foreground max-w-[140px]">
              {agentData.businessName}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400'
                )}
              >
                <item.icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Footer - User info */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {userInitials || 'ن'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">
              {getDisplayName(user)}
            </span>
            <div className="flex items-center gap-1.5">
              {agentData && (
                <StatusBadge status={agentData.status} className="text-[10px] px-1.5 py-0" />
              )}
            </div>
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
                <p>خروج</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

// ---------- Layout ----------

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const [agentData, setAgentData] = useState<AgentItem | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await agentsService.getMyProfile()
        if (res.success && res.data) {
          setAgentData(res.data as unknown as AgentItem)
        }
      } catch {
        setAgentData(null)
      }
    }
    fetchAgent()
  }, [pathname])

  return (
    <AgentRoute>
      <ErrorBoundary>
        <div dir="rtl" className="min-h-screen bg-background">
          {/* Mobile trigger bar */}
          <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetTitle className="sr-only">منوی ناوبری</SheetTitle>
                <SidebarContent
                  agentData={agentData}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-600 text-white">
                <Briefcase className="size-4" />
              </div>
              <span className="text-sm font-semibold">پنل نمایندگان</span>
            </div>
            {agentData && (
              <div className="mr-auto">
                <StatusBadge status={agentData.status} className="text-[10px]" />
              </div>
            )}
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30">
            <div className="flex h-full flex-col border-l bg-card">
              <SidebarContent agentData={agentData} />
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:mr-64">
            {/* Desktop top bar */}
            <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:flex">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-medium text-muted-foreground">
                  سامانه تخفیف درمانی — پنل نمایندگان
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {agentData && (
                  <StatusBadge status={agentData.status} />
                )}
                <ThemeToggle />
              </div>
            </header>

            {/* Page content */}
            <main className="p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </AgentRoute>
  )
}
