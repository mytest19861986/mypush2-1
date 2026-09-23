'use client'

import React from 'react'
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export interface PremiumMetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: string
  isUp?: boolean
  description?: string
  badge?: string
  icon: LucideIcon
  variant?: 'green' | 'blue' | 'amber' | 'purple'
}

export function PremiumMetricCard({
  title,
  value,
  unit,
  trend,
  isUp = true,
  description,
  badge,
  icon: Icon,
  variant = 'green'
}: PremiumMetricCardProps) {
  const variantStyles = {
    green: {
      cardBg: 'bg-[#F0FDF4]',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      trendColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100/60 text-emerald-700 border-emerald-200'
    },
    blue: {
      cardBg: 'bg-[#F0F9FF]',
      border: 'border-sky-100',
      iconBg: 'bg-sky-500/10 text-sky-600',
      trendColor: 'text-sky-700',
      badgeBg: 'bg-sky-100/60 text-sky-700 border-sky-200'
    },
    amber: {
      cardBg: 'bg-[#FFFBEB]',
      border: 'border-amber-100',
      iconBg: 'bg-amber-500/10 text-amber-600',
      trendColor: 'text-amber-700',
      badgeBg: 'bg-amber-100/60 text-amber-700 border-amber-200'
    },
    purple: {
      cardBg: 'bg-[#FAF5FF]',
      border: 'border-purple-100',
      iconBg: 'bg-purple-500/10 text-purple-600',
      trendColor: 'text-purple-700',
      badgeBg: 'bg-purple-100/60 text-purple-700 border-purple-200'
    }
  }

  const currentVariant = variantStyles[variant] || variantStyles.green

  return (
    <div className={`p-6 rounded-2xl border ${currentVariant.border} ${currentVariant.cardBg} transition-all duration-300 hover:shadow-md space-y-4`}>
      <div className="flex items-center justify-between">
        <div className={`size-12 rounded-2xl ${currentVariant.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
          <Icon className="size-6" />
        </div>
        {badge && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${currentVariant.badgeBg}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{value}</span>
          {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
        </div>
      </div>

      {(trend || description) && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-xs">
          {trend && (
            <span className={`font-bold flex items-center gap-1 ${isUp ? currentVariant.trendColor : 'text-rose-600'}`}>
              {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              <span dir="ltr">{trend}</span>
            </span>
          )}
          {description && (
            <span className="text-slate-400 truncate text-[11px]">{description}</span>
          )}
        </div>
      )}
    </div>
  )
}
