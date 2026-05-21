'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { DoctorRoute } from '@/components/guards/DoctorRoute'
import { ErrorBoundary } from '@/components/shared'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { useAuthStore } from '@/stores/auth-store'
import { doctorsService } from '@/services'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  LayoutDashboard,
  UserSearch,
  FileText,
  UserCircle,
  LogOut,
  Menu,
  Stethoscope,
} from 'lucide-react'
import type { DoctorItem } from '@/types'
import { getDisplayName, getUserInitials } from '@/utils/formatters'

// ---------- Nav Items ----------

const navItems = [
  { href: '/doctor/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/doctor/patients', label: 'بررسی بیماران', icon: UserSearch },
  { href: '/doctor/contracts', label: 'قراردادها', icon: FileText },
  { href: '/doctor/profile', label: 'پروفایل', icon: UserCircle },
]

// ---------- Sidebar ----------

function SidebarContent({
  doctorData,
  onNavigate,
}: {
  doctorData: DoctorItem | null
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-sm">پنل پزشکان</h2>
          {doctorData?.specialty && (
            <p className="text-xs text-muted-foreground truncate max-w-[160px]">
              {doctorData.specialty}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
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
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Status badge at bottom */}
      <div className="p-4">
        {doctorData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>وضعیت:</span>
            <StatusBadge status={doctorData.status} className="text-[10px]" />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Topbar ----------

function Topbar({
  doctorData,
  onMenuClick,
}: {
  doctorData: DoctorItem | null
  onMenuClick: () => void
}) {
  const router = useRouter()
  const { user, logout } = useAuthStore()

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Doctor info */}
      <div className="flex items-center gap-3">
        {doctorData ? (
          <StatusBadge status={doctorData.status} className="hidden sm:flex" />
        ) : (
          <Skeleton className="h-6 w-24" />
        )}

        {user ? (
          <span className="text-sm text-muted-foreground hidden sm:block">
            {`دکتر ${getDisplayName(user)}`}
          </span>
        ) : (
          <Skeleton className="h-5 w-32" />
        )}

        <Separator orientation="vertical" className="h-6" />

        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="خروج"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

// ---------- Layout ----------

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [doctorData, setDoctorData] = useState<DoctorItem | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await doctorsService.getMyProfile()
        if (res.success && res.data) {
          setDoctorData(res.data as unknown as DoctorItem)
        }
      } catch {
        setDoctorData(null)
      }
    }
    fetchDoctor()
  }, [pathname])

  return (
    <DoctorRoute>
      <ErrorBoundary>
        <div dir="rtl" className="min-h-screen bg-background">
          <div className="flex min-h-screen">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-l bg-card">
              <SidebarContent doctorData={doctorData} />
            </aside>

            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="right" className="p-0 w-64">
                <SheetTitle className="sr-only">منوی ناوبری</SheetTitle>
                <SidebarContent
                  doctorData={doctorData}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
              <Topbar doctorData={doctorData} onMenuClick={() => setMobileOpen(true)} />

              <main className="flex-1 p-4 lg:p-6">
                {children}
              </main>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </DoctorRoute>
  )
}
