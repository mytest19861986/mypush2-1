'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { doctorsService } from '@/services/doctors.service'
import { contractsService } from '@/services/contracts.service'
import { StatusBadge } from '@/components/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Stethoscope,
  FileText,
  Users,
  Percent,
  CalendarDays,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { formatPrice, toPersianNum, getDisplayName } from '@/utils/formatters'
import type { DoctorItem, ContractItem } from '@/types'

// ---------- Types ----------

interface DashboardStats {
  todayContracts: number
  activePatients: number
  totalDiscounts: number
  recentContracts: (ContractItem & { patientName?: string })[]
}

// ---------- Animation Variants ----------

const easeOut = [0, 0, 0.2, 1] as const

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
}

function DoctorStatCard({
  title,
  value,
  unit,
  icon: Icon,
}: {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
}) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800/80 dark:bg-card">
      <CardContent className="min-h-28 p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <Icon className="size-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums" dir="ltr">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {unit}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Dashboard Page ----------

export default function DoctorDashboardPage() {
  const { user } = useAuthStore()
  const [doctorData, setDoctorData] = useState<DoctorItem | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doctorRes, contractsRes] = await Promise.all([
          doctorsService.getMyProfile(),
          contractsService.getDoctorContracts({ limit: 50 }),
        ])

        if (doctorRes.success && doctorRes.data) {
          setDoctorData(doctorRes.data as unknown as DoctorItem)
        }

        if (contractsRes.success && contractsRes.data) {
          const contracts = Array.isArray(contractsRes.data) ? contractsRes.data : []
          const today = new Date().toISOString().slice(0, 10)
          const todayContracts = contracts.filter(
            c => c.createdAt.slice(0, 10) === today
          ).length
          const totalDiscounts = contracts.reduce((sum, c) => sum + c.discountAmount, 0)
          const uniquePatients = new Set(
            contracts.map(c => c.user?.profile
              ? `${c.user.profile.firstName || ''} ${c.user.profile.lastName || ''}`.trim()
              : c.userId
            )
          ).size

          setStats({
            todayContracts,
            activePatients: uniquePatients,
            totalDiscounts,
            recentContracts: contracts.slice(0, 5),
          })
        }
      } catch {
        // Use mock data for demo
        setStats({
          todayContracts: 12,
          activePatients: 38,
          totalDiscounts: 2850000,
          recentContracts: [],
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-xs dark:border-emerald-900/60 dark:bg-card">
        <div className="bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-white dark:to-card p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shadow-2xs">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                خوش آمدید، دکتر {getDisplayName(user)}
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {doctorData?.specialty
                  ? `${doctorData.specialty} · ${doctorData.clinicName || 'مطب'}`
                  : doctorData?.clinicName || 'پنل مدیریت مطب'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DoctorStatCard
          title="قراردادهای امروز"
          value={stats?.todayContracts || 0}
          icon={CalendarDays}
        />
        <DoctorStatCard
          title="بیماران فعال"
          value={stats?.activePatients || 0}
          icon={Users}
        />
        <DoctorStatCard
          title="تخفیف اعمال شده"
          value={(stats?.totalDiscounts || 0).toLocaleString('en-US')}
          unit="تومان"
          icon={Percent}
        />
      </div>

      {/* Recent Contracts */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800/80 dark:bg-card">
        <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            قراردادهای اخیر
          </h2>
          <Link
            href="/doctor/contracts"
            className="text-xs text-emerald-600 hover:underline font-bold"
          >
            مشاهده همه
          </Link>
        </div>
        <div className="px-4 pb-4 pt-3">
          {stats?.recentContracts && stats.recentContracts.length > 0 ? (
            <div className="space-y-3">
              {stats.recentContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 p-3 transition-colors hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {contract.user?.profile
                          ? getDisplayName({ profile: contract.user.profile })
                          : 'بیمار'}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        طرح {contract.userPlan?.plan?.name || '—'} · {formatPrice(contract.totalAmount)} تومان
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={contract.status} className="text-[10px] shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-sm font-medium text-slate-400 dark:text-slate-500">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30 text-slate-400" />
              <p>هنوز قراردادی ثبت نشده است</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
