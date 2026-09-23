'use client'

import React from 'react'
import { TrendingUp, PieChart, ChevronDown } from 'lucide-react'

export function AnalyticsChartsBlock() {
  const donutData = [
    { label: 'کلینیک عمومی', percent: '۴۲٪', color: 'bg-teal-600', fill: '#0D9488' },
    { label: 'دندانپزشکی', percent: '۲۳٪', color: 'bg-sky-500', fill: '#0284C7' },
    { label: 'آزمایشگاه', percent: '۱۵٪', color: 'bg-amber-500', fill: '#F59E0B' },
    { label: 'تصویربرداری', percent: '۱۲٪', color: 'bg-purple-500', fill: '#8B5CF6' },
    { label: 'سایر', percent: '۸٪', color: 'bg-slate-400', fill: '#94A3B8' },
  ]

  const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ─── Growth Trend Chart (3 Cols) ─── */}
      <div className="lg:col-span-3 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-800">روند رشد کاربران</h3>
            <p className="text-xs text-slate-400">تحلیل ثبت‌نام و فعال‌سازی اشتراک‌های درمانی</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50 cursor-pointer">
            <span>۶ ماه اخیر</span>
            <ChevronDown className="size-3.5 text-slate-400" />
          </div>
        </div>

        {/* CSS/SVG Area Curve Representation */}
        <div className="relative pt-6 pb-2">
          {/* Active Tooltip Indicator */}
          <div className="absolute top-2 start-[82%] -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-xl shadow-md z-10 text-center">
            <div>۱۲,۵۴۰</div>
            <div className="text-[9px] text-slate-300 font-normal">کاربر فعال</div>
          </div>

          <svg className="w-full h-44 overflow-visible" viewBox="0 0 500 150">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 10 120 Q 90 100 180 90 T 350 50 T 490 20 L 490 150 L 10 150 Z"
              fill="url(#areaGradient)"
            />
            <path
              d="M 10 120 Q 90 100 180 90 T 350 50 T 490 20"
              fill="none"
              stroke="#0D9488"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* SVG Data Dots */}
            {[
              { cx: 10, cy: 120 },
              { cx: 100, cy: 103 },
              { cx: 190, cy: 88 },
              { cx: 280, cy: 75 },
              { cx: 370, cy: 45 },
              { cx: 460, cy: 22 },
            ].map((dot, idx) => (
              <circle
                key={idx}
                cx={dot.cx}
                cy={dot.cy}
                r="4.5"
                className="fill-white stroke-[#0D9488] stroke-2 shadow-xs"
              />
            ))}
          </svg>

          {/* Month Labels */}
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium pt-3 border-t border-slate-100 px-1">
            {months.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Donut Chart: Centers Distribution (2 Cols) ─── */}
      <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-800">توزیع مراکز درمانی</h3>
          <p className="text-xs text-slate-400">دسته‌بندی تخصصی کلینیک‌ها و آزمایشگاه‌ها</p>
        </div>

        <div className="flex items-center justify-center gap-6 py-2">
          {/* Donut Visual */}
          <div className="relative size-36 flex items-center justify-center shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="5.5" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#0D9488"
                strokeWidth="5.5"
                strokeDasharray="42 100"
                strokeDashoffset="0"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#0284C7"
                strokeWidth="5.5"
                strokeDasharray="23 100"
                strokeDashoffset="-42"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="5.5"
                strokeDasharray="15 100"
                strokeDashoffset="-65"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="5.5"
                strokeDasharray="12 100"
                strokeDashoffset="-80"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-900 font-mono block">۲۴۵</span>
              <span className="text-[10px] text-slate-400 font-bold block">مجموع</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-2 text-xs">
            {donutData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${item.color}`} />
                  <span className="text-slate-600 text-[11px]">{item.label}</span>
                </div>
                <span className="font-bold text-slate-900 font-mono text-[11px]">{item.percent}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
