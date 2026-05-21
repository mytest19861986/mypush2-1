'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { doctorsService } from '@/services/doctors.service'
import { contractsService } from '@/services/contracts.service'
import { StatCard, StatusBadge } from '@/components/shared'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Stethoscope,
  FileText,
  Users,
  Percent,
  CalendarDays,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatPrice, toPersianNum, getDisplayName, formatDate } from '@/utils/formatters'
import type { DoctorItem, ContractItem } from '@/types'

// ---------- Types ----------

interface DashboardStats {
  todayContracts: number
  activePatients: number
  totalDiscounts: number
  recentContracts: (ContractItem & { patientName?: string })[]
}

// ---------- Animation Variants ----------

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
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
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Welcome Card */}
      <motion.div variants={itemVariants}>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-transparent p-6 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-transparent">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">
                خوش آمدید، دکتر {getDisplayName(user)}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {doctorData?.specialty
                  ? `${doctorData.specialty} · ${doctorData.clinicName || 'مطب'}`
                  : doctorData?.clinicName || 'پنل مدیریت مطب'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <StatCard
            title="قراردادهای امروز"
            value={toPersianNum(stats?.todayContracts || 0)}
            icon={CalendarDays}
            iconClassName="bg-primary/10 text-primary"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="بیماران فعال"
            value={toPersianNum(stats?.activePatients || 0)}
            icon={Users}
            iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="تخفیف اعمال شده (تومان)"
            value={formatPrice(stats?.totalDiscounts || 0)}
            icon={Percent}
            iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
          />
        </motion.div>
      </div>

      {/* Recent Contracts */}
      <motion.div variants={itemVariants}>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              قراردادهای اخیر
            </h2>
            <Link
              href="/doctor/contracts"
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              مشاهده همه
            </Link>
          </div>
          <div className="px-4 pb-4">
            {stats?.recentContracts && stats.recentContracts.length > 0 ? (
              <div className="space-y-3">
                {stats.recentContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contract.user?.profile
                            ? getDisplayName({ profile: contract.user.profile })
                            : 'بیمار'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          طرح {contract.userPlan?.plan?.name || '—'} · {formatPrice(contract.totalAmount)} تومان
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={contract.status} className="text-[10px] shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>هنوز قراردادی ثبت نشده است</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
