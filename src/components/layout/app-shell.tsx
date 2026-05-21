'use client'

import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  LogOut,
  User,
  ChevronLeft,
  Shield,
  Building2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string
  href?: string
}

interface AppShellProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUserDisplayName(user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>) {
  const first = user.profile?.firstName ?? ''
  const last = user.profile?.lastName ?? ''
  if (first || last) return `${first} ${last}`.trim()
  return user.mobile
}

function getUserInitials(user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>) {
  const first = user.profile?.firstName?.charAt(0) ?? ''
  const last = user.profile?.lastName?.charAt(0) ?? ''
  if (first || last) return `${first}${last}`
  return user.mobile.slice(-2)
}

function getPrimaryRole(roles: string[]): string {
  if (roles.includes('SUPER_ADMIN')) return 'مدیر ارشد'
  if (roles.includes('ADMIN')) return 'مدیر'
  if (roles.includes('AGENT')) return 'نماینده'
  return 'کاربر'
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'destructive'
    case 'ADMIN':
      return 'default'
    case 'AGENT':
      return 'secondary'
    default:
      return 'outline'
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  const { user, isLoading, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/auth/login'
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-background">
      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
          {/* Left: Logo / Brand */}
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block text-lg">
              سیستم مدیریت
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: User Menu */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative flex items-center gap-2 px-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.profile?.avatar ?? undefined}
                        alt={getUserDisplayName(user)}
                      />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden flex-col items-start sm:flex">
                      <span className="text-sm font-medium leading-none">
                        {getUserDisplayName(user)}
                      </span>
                      <span className="text-xs text-muted-foreground leading-none mt-0.5">
                        {user.agent?.businessName ?? user.mobile}
                      </span>
                    </div>
                    <ChevronLeft className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {getUserDisplayName(user)}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground" dir="ltr">
                        {user.mobile}
                      </span>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <User className="ml-2 h-4 w-4" />
                      <span>پروفایل من</span>
                    </DropdownMenuItem>
                    {user.agent && (
                      <DropdownMenuItem>
                        <Building2 className="ml-2 h-4 w-4" />
                        <span>{user.agent.businessName ?? 'پنل نماینده'}</span>
                        {user.agent.status !== 'APPROVED' && (
                          <Badge variant="outline" className="mr-auto text-xs px-1.5 py-0">
                            {user.agent.status}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    {user.roles.map((role) => (
                      <div key={role} className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
                          {getPrimaryRole([role])}
                        </Badge>
                      </div>
                    ))}
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} variant="destructive">
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>خروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {/* ── Breadcrumb Bar ── */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="border-t px-4 sm:px-6 lg:px-8 py-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">خانه</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <span key={crumb.label} className="contents">
                      <BreadcrumbSeparator>
                        <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        {isLast || !crumb.href ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>
                            {crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </span>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} سیستم مدیریت — تمامی حقوق محفوظ است
          </p>
        </div>
      </footer>
    </div>
  )
}
