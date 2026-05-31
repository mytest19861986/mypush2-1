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
}) {
  return {
    reviewId: review.id,
    visitId: review.visitId,
    ...(review.doctorId !== undefined && { doctorId: review.doctorId }),
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
  }
}
