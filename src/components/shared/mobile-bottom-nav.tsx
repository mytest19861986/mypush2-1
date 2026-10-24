'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MobileBottomNavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface MobileBottomNavProps {
  items: MobileBottomNavItem[]
  className?: string
}

export function MobileBottomNav({ items, className = '' }: MobileBottomNavProps) {
  const pathname = usePathname() ?? ''

  return (
    <nav
      dir="rtl"
      aria-label="ناوبری موبایل"
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(15,23,42,0.05)] px-2 py-1.5 transition-all',
        className
      )}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 px-2 rounded-xl transition-all select-none',
                isActive
                  ? 'text-teal-700 font-bold bg-teal-50/70'
                  : 'text-slate-500 hover:text-slate-900 active:scale-95'
              )}
            >
              <Icon className={cn('size-5 transition-transform', isActive && 'scale-110')} />
              <span className="text-[11px] mt-1 tracking-tight leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
