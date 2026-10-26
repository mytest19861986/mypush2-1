'use client'

import React from 'react'
import { formatJalaliDate } from '@/utils/jalali-date'
import { TrendingUp, PieChart, ChevronDown } from 'lucide-react'

export interface DailyRevenueItem {
  date: string
  amount: number
  count: number
}

export interface ChannelItem {
  key: string
  label: string
  amount: number
  count: number
}

export interface AnalyticsChartsBlockProps {
  dailyRevenue?: DailyRevenueItem[]
  channelBreakdown?: ChannelItem[]
  timeRangeLabel?: string
  totalRevenue?: number
}

export function AnalyticsChartsBlock({
  dailyRevenue = [],
  channelBreakdown = [],
  timeRangeLabel = '۳۰ روز اخیر',
  totalRevenue = 0,
}: AnalyticsChartsBlockProps) {
  // Process daily revenue or fallback
  const hasDailyData = dailyRevenue && dailyRevenue.length > 0
  const maxAmount = hasDailyData ? Math.max(...dailyRevenue.map((d) => d.amount), 1) : 100

  // SVG Area generation
  const width = 500
  const height = 150
  const paddingX = 20
  const paddingY = 25

  const points = hasDailyData
    ? dailyRevenue.map((item, idx) => {
        const x =
          dailyRevenue.length === 1
            ? width / 2
            : paddingX + (idx / (dailyRevenue.length - 1)) * (width - 2 * paddingX)
        const y = height - paddingY - (item.amount / maxAmount) * (height - 2 * paddingY)
        return { x, y, ...item }
      })
    : []

  const pathD =
    points.length > 1
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ')
      : points.length === 1
      ? `M 10 120 L ${points[0].x} ${points[0].y} L 490 ${points[0].y}`
      : 'M 10 130 L 490 130'

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`
      : 'M 10 130 L 490 130 L 490 150 L 10 150 Z'

  // Channels / Donut calculation
  const totalChannelAmount = channelBreakdown.reduce((sum, c) => sum + c.amount, 0) || 1
  const colorMap: Record<string, { color: string; fill: string }> = {
    direct: { color: 'bg-teal-600', fill: '#0D9488' },
    sales_partner: { color: 'bg-sky-500', fill: '#0284C7' },
    referral: { color: 'bg-amber-500', fill: '#F59E0B' },
    unknown_online: { color: 'bg-slate-400', fill: '#94A3B8' },
  }

  const donutSegments = channelBreakdown.map((c) => {
    const pct = Math.round((c.amount / totalChannelAmount) * 100)
    const styling = colorMap[c.key] || { color: 'bg-purple-500', fill: '#8B5CF6' }
    return {
      label: c.label,
      amount: c.amount,
      count: c.count,
      percent: `${pct}٪`,
      pctNumber: pct,
      color: styling.color,
      fill: styling.fill,
    }
  })

  // Cumulative stroke offsets
  const renderedCircles = donutSegments.map((seg, index) => {
    const dash = `${seg.pctNumber} 100`
    const offset = -donutSegments.slice(0, index).reduce((sum, previous) => sum + previous.pctNumber, 0)
    return { ...seg, dash, offset }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ─── Growth Trend Chart (3 Cols) ─── */}
      <div className="lg:col-span-3 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-800">روند درآمد و تراکنش‌های روزانه</h3>
            <p className="text-xs text-slate-400">تحلیل پردازش مالی دوره‌ای بر مبنای تراکنش‌های شبکه</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
            <span>{timeRangeLabel}</span>
          </div>
        </div>

        {/* CSS/SVG Area Curve Representation */}
        <div className="relative pt-6 pb-2">
          {points.length > 0 && (
            <div
              className="absolute top-2 bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-xl shadow-md z-10 text-center pointer-events-none"
              style={{
                left: `${Math.min(Math.max((points[points.length - 1].x / width) * 100, 15), 85)}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div>{(points[points.length - 1].amount).toLocaleString('fa-IR')} ت</div>
              <div className="text-[9px] text-slate-300 font-normal">
                {formatJalaliDate(points[points.length - 1].date)} ({points[points.length - 1].count.toLocaleString('fa-IR')} تراکنش)
              </div>
            </div>
          )}

          <svg className="w-full h-44 overflow-visible" viewBox="0 0 500 150">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#areaGradient)" />
            <path
              d={pathD}
              fill="none"
              stroke="#0D9488"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((dot, idx) => (
              <circle
                key={idx}
                cx={dot.x}
                cy={dot.y}
                r="4.5"
                className="fill-white stroke-[#0D9488] stroke-2 shadow-xs"
              />
            ))}
          </svg>

          {/* Date Labels */}
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium pt-3 border-t border-slate-100 px-1">
            {points.length > 0 ? (
              <>
                <span>{formatJalaliDate(points[0].date)}</span>
                {points.length > 2 && <span>{formatJalaliDate(points[Math.floor(points.length / 2)].date)}</span>}
                <span>{formatJalaliDate(points[points.length - 1].date)}</span>
              </>
            ) : (
              <span className="w-full text-center text-slate-400">تراکنشی در این بازه زمانی ثبت نشده است</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Donut Chart: Centers & Channel Distribution (2 Cols) ─── */}
      <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-800">تفکیک کانال‌های درآمدی</h3>
          <p className="text-xs text-slate-400">سهم کانال‌های مستقیم، رفرال و همکاران فروش</p>
        </div>

        <div className="flex items-center justify-center gap-6 py-2">
          {/* Donut Visual */}
          <div className="relative size-36 flex items-center justify-center shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="5.5" />
              {renderedCircles.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={seg.fill}
                  strokeWidth="5.5"
                  strokeDasharray={seg.dash}
                  strokeDashoffset={seg.offset}
                />
              ))}
            </svg>
            <div className="absolute text-center max-w-[85px] px-1">
              <span className="text-sm font-black text-slate-900 font-mono block truncate">
                {(totalRevenue / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیون
              </span>
              <span className="text-[10px] text-slate-400 font-bold block">مجموع ت</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-2 text-xs flex-1">
            {donutSegments.length > 0 ? (
              donutSegments.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`size-2.5 rounded-full shrink-0 ${item.color}`} />
                    <span className="text-slate-600 text-[11px] truncate">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono text-[11px] shrink-0">
                    {item.percent}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400">اطلاعاتی یافت نشد</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
