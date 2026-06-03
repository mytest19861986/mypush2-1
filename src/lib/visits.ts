export function canManageVisits(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_visits')
  )
}

export function maskNationalCode(nationalCode: string) {
  return `${'*'.repeat(Math.max(nationalCode.length - 4, 0))}${nationalCode.slice(-4)}`
}

export function parseOptionalDate(value: string | undefined) {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date
}

export function toSafeVisitResponse(visit: {
  id: string
  status: string
  visitedAt: Date | null
  createdAt: Date
  doctorId: string
  planHolder: {
    firstName: string | null
    lastName: string | null
    nationalCode: string | null
  }
  userPlan: {
    endDate: Date
    plan: {
      name: string
    }
  }
}) {
  return {
    visitId: visit.id,
    status: visit.status,
    visitedAt: visit.visitedAt?.toISOString() ?? null,
    createdAt: visit.createdAt.toISOString(),
    doctorId: visit.doctorId,
    plan: {
      title: visit.userPlan.plan.name,
      endDate: visit.userPlan.endDate.toISOString(),
    },
    planHolder: {
      firstName: visit.planHolder.firstName,
      lastName: visit.planHolder.lastName,
      nationalCode: visit.planHolder.nationalCode,
    },
  }
}
