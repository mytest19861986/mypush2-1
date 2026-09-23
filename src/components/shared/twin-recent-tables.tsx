'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export function TwinRecentTables() {
  const recentCenters = [
    { name: 'کلینیک سپید', city: 'تهران', date: 'امروز', status: 'فعال', variant: 'success' as const },
    { name: 'مرکز دندانپزشکی لبخند', city: 'شیراز', date: 'دیروز', status: 'فعال', variant: 'success' as const },
    { name: 'آزمایشگاه پارس', city: 'اصفهان', date: '۲ روز پیش', status: 'در انتظار', variant: 'warning' as const },
    { name: 'درمانگاه نیکان', city: 'مشهد', date: '۳ روز پیش', status: 'فعال', variant: 'success' as const },
  ]

  const recentUsers = [
    { name: 'سارا محسنی', mobile: '۰۹۱۲۳۴۵۶۷۸۹', time: '۱۰:۲۵ امروز', status: 'فعال', variant: 'success' as const },
    { name: 'مهدی رضایی', mobile: '۰۹۱۹۸۷۶۵۴۳۲', time: '۰۹:۱۱ امروز', status: 'فعال', variant: 'success' as const },
    { name: 'علی کریمی', mobile: '۰۹۳۵۱۱۱۲۲۳۳', time: '۱۸:۲۰ دیروز', status: 'در انتظار', variant: 'warning' as const },
    { name: 'نازنین محمدی', mobile: '۰۹۱۲۹۸۷۶۵۴۳', time: '۱۶:۴۵ دیروز', status: 'مسدود', variant: 'destructive' as const },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ─── Recent Healthcare Centers Table ─── */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-800">آخرین مراکز درمانی</h3>
          <Link href="/doctors-clinics-premium-preview" className="text-xs text-[#0D5C58] font-bold hover:underline">
            مشاهده همه
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="text-slate-400 font-bold border-b border-slate-100 pb-2">
              <tr>
                <th className="py-2.5">نام مرکز</th>
                <th className="py-2.5">شهر</th>
                <th className="py-2.5">وضعیت</th>
                <th className="py-2.5 text-center">تاریخ عضویت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCenters.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 font-bold text-slate-800">{item.name}</td>
                  <td className="py-3 text-slate-500">{item.city}</td>
                  <td className="py-3">
                    <Badge variant={item.variant} className="rounded-full px-2.5 text-[10px]">
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-slate-400 text-center font-mono text-[11px]">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Recent Users Table ─── */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-800">آخرین کاربران</h3>
          <Link href="/users-premium-preview" className="text-xs text-[#0D5C58] font-bold hover:underline">
            مشاهده همه
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="text-slate-400 font-bold border-b border-slate-100 pb-2">
              <tr>
                <th className="py-2.5">نام</th>
                <th className="py-2.5">شماره تماس</th>
                <th className="py-2.5">وضعیت</th>
                <th className="py-2.5 text-center">آخرین فعالیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentUsers.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 font-bold text-slate-800 flex items-center gap-2">
                    <div className="size-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                      {item.name[0]}
                    </div>
                    <span>{item.name}</span>
                  </td>
                  <td className="py-3 font-mono text-slate-500">{item.mobile}</td>
                  <td className="py-3">
                    <Badge variant={item.variant} className="rounded-full px-2.5 text-[10px]">
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-slate-400 text-center font-mono text-[11px]">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
