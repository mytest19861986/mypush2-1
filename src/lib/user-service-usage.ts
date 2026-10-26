import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { ReportDateFilter } from '@/utils/report-date-range'

// A linked Visit is the canonical service record; count a legacy Contract only
// when it has no Visit. Ownership never falls back to the purchaser of a plan.
export async function getUserServiceUsage(userId: string, range: ReportDateFilter) {
  const visitOwner: Prisma.VisitWhereInput = { OR: [
    { userId }, { userId: null, planHolder: { userId } },
  ] }
  const contractOwner: Prisma.ContractWhereInput = { userId, visit: { is: null } }
  const visitDate: Prisma.VisitWhereInput = { OR: [
    { completedAt: range },
    { completedAt: null, visitedAt: range },
    { completedAt: null, visitedAt: null, createdAt: range },
  ] }
  const contractDate: Prisma.ContractWhereInput = { OR: [
    { completedAt: range }, { completedAt: null, createdAt: range },
  ] }
  const [visitCount, contractCount, completedVisits, completedContracts] = await Promise.all([
    db.visit.count({ where: { AND: [visitOwner, visitDate] } }),
    db.contract.count({ where: { AND: [contractOwner, contractDate] } }),
    db.visit.groupBy({ by: ['doctorId'], where: { AND: [visitOwner, visitDate], status: 'COMPLETED' }, _count: { _all: true } }),
    db.contract.groupBy({ by: ['doctorId'], where: { AND: [contractOwner, contractDate], status: 'COMPLETED' }, _count: { _all: true } }),
  ])
  const counts = new Map<string, number>()
  for (const row of [...completedVisits, ...completedContracts]) counts.set(row.doctorId, (counts.get(row.doctorId) || 0) + row._count._all)
  const doctors = counts.size ? await db.doctor.findMany({ where: { id: { in: [...counts.keys()] } }, select: {
    id: true, specialty: true, user: { select: { profile: { select: { firstName: true, lastName: true } } } },
  } }) : []
  return {
    registeredServices: visitCount + contractCount,
    completedServices: [...counts.values()].reduce((sum, count) => sum + count, 0),
    distinctDoctors: counts.size,
    byDoctor: doctors.map(doctor => ({ id: doctor.id,
      name: [doctor.user.profile?.firstName, doctor.user.profile?.lastName].filter(Boolean).join(' ') || 'پزشک',
      specialty: doctor.specialty, completedServices: counts.get(doctor.id)!,
    })).sort((a, b) => b.completedServices - a.completedServices || a.id.localeCompare(b.id)),
    dateBasis: 'completedAt; otherwise visitedAt (Visit); otherwise createdAt',
    countingRule: 'Visit plus legacy Contract without a linked Visit; only COMPLETED counts as completed usage',
  }
}
