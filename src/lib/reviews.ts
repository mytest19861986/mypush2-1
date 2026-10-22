export function canManageReviews(payload: { roles: string[]; permissions: string[] }) {
  return (
    payload.roles.includes('SUPER_ADMIN') ||
    payload.roles.includes('ADMIN') ||
    payload.permissions.includes('manage_reviews')
  )
}

export function isSafeId(value: string) {
  return value.length > 0 && value.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(value)
}

export function parseBoundedInteger(value: string | null, defaultValue: number, maxValue: number) {
  if (value === null) return defaultValue

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null

  return Math.min(parsed, maxValue)
}

export function toSafeReviewResponse(review: {
  id: string
  visitId: string
  doctorId?: string
  rating: number
  comment: string | null
  status: string
  createdAt: Date
  user?: {
    mobile?: string | null
    profile?: {
      firstName?: string | null
      lastName?: string | null
    } | null
  } | null
  doctor?: {
    specialty?: string | null
    clinicName?: string | null
    user?: {
      profile?: {
        firstName?: string | null
        lastName?: string | null
      } | null
    } | null
  } | null
  visit?: {
    status?: string | null
    userPlan?: {
      plan?: {
        name?: string | null
      } | null
    } | null
  } | null
}) {
  return {
    reviewId: review.id,
    visitId: review.visitId,
    ...(review.doctorId !== undefined && { doctorId: review.doctorId }),
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
    ...(review.user && {
      user: {
        profile: review.user.profile
          ? {
              firstName: review.user.profile.firstName,
              lastName: review.user.profile.lastName,
            }
          : null,
      },
    }),
    ...(review.doctor && {
      doctor: {
        specialty: review.doctor.specialty,
        clinicName: review.doctor.clinicName,
        user: {
          profile: review.doctor.user?.profile
            ? {
                firstName: review.doctor.user.profile.firstName,
                lastName: review.doctor.user.profile.lastName,
              }
            : null,
        },
      },
    }),
    ...(review.visit && {
      visit: {
        status: review.visit.status,
        plan: {
          name: review.visit.userPlan?.plan?.name || null,
        },
        userPlan: {
          plan: {
            name: review.visit.userPlan?.plan?.name || null,
          },
        },
      },
      plan: {
        name: review.visit.userPlan?.plan?.name || null,
      },
    }),
  }
}

