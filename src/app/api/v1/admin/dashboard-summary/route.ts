import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireCurrentPermission } from '@/lib/current-permissions'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const access = await requireCurrentPermission(request, 'view_reports')
  if (access.denied) return access.denied
  try {
    const [activeAccounts, approvedDoctors, pendingDoctors, pendingAgents, doctors, users] = await Promise.all([
      db.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      db.doctor.count({ where: { status: 'APPROVED', user: { status: 'ACTIVE', deletedAt: null } } }),
      db.doctor.count({ where: { status: 'PENDING', user: { deletedAt: null } } }),
      db.agent.count({ where: { status: 'PENDING', user: { deletedAt: null } } }),
      db.doctor.findMany({
        where: { user: { deletedAt: null } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5,
        select: { id: true, status: true, clinicName: true, createdAt: true, user: { select: { profile: { select: { firstName: true, lastName: true } } } } },
      }),
      db.user.findMany({
        where: { deletedAt: null, doctor: { is: null }, agent: { is: null }, roles: { some: { role: { name: 'USER' } } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5,
        select: { id: true, status: true, createdAt: true, profile: { select: { firstName: true, lastName: true } } },
      }),
    ])
    return successResponse({
      activeAccounts, approvedDoctors, pendingDoctors, pendingAgents, pendingApplications: pendingDoctors + pendingAgents,
      recentDoctors: doctors.map(doctor => ({
        id: doctor.id, name: doctor.clinicName || [doctor.user.profile?.firstName, doctor.user.profile?.lastName].filter(Boolean).join(' ') || 'پزشک',
        status: doctor.status, createdAt: doctor.createdAt.toISOString(),
      })),
      recentUsers: users.map(user => ({ id: user.id, name: [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || 'کاربر سامانه', status: user.status, createdAt: user.createdAt.toISOString() })),
      computedAt: new Date().toISOString(),
    })
  } catch {
    return errorResponse('DASHBOARD_UNAVAILABLE', 'دریافت آمار داشبورد فعلاً امکان‌پذیر نیست.', 503)
  }
}
