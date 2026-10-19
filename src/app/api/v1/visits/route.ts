import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import { canManageVisits, maskNationalCode, parseOptionalDate, toSafeVisitResponse } from '@/lib/visits'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const createVisitSchema = z.object({
  nationalCode: z.string().trim().regex(/^\d{10}$/, 'National code must be exactly 10 digits'),
  doctorId: z.string().trim().min(1, 'Doctor id is required').optional(),
  visitedAt: z.string().trim().optional(),
  notes: z.string().trim().max(1000, 'Notes must be at most 1000 characters').optional(),
})

class VisitError extends Error {
  constructor(
    public code:
      | 'DOCTOR_MISMATCH'
      | 'FORBIDDEN'
      | 'DOCTOR_ID_REQUIRED'
      | 'DOCTOR_NOT_FOUND'
      | 'DOCTOR_NOT_APPROVED'
      | 'NO_REMAINING_USES'
  ) {
    super(code)
  }
}

async function resolveDoctor(payload: { sub: string; roles: string[]; permissions: string[] }, doctorId?: string) {
  const isDoctor = payload.roles.includes('DOCTOR')
  const hasVisitManagerAccess = canManageVisits(payload)

  if (isDoctor) {
    const doctor = await db.doctor.findUnique({
      where: { userId: payload.sub },
      select: { id: true, status: true },
    })

    if (!doctor) {
      throw new VisitError('DOCTOR_NOT_FOUND')
    }

    if (doctorId && doctorId !== doctor.id) {
      throw new VisitError('DOCTOR_MISMATCH')
    }

    if (doctor.status !== 'APPROVED') {
      throw new VisitError('DOCTOR_NOT_APPROVED')
    }

    return doctor
  }

  if (!hasVisitManagerAccess) {
    throw new VisitError('FORBIDDEN')
  }

  if (!doctorId) {
    throw new VisitError('DOCTOR_ID_REQUIRED')
  }

  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, status: true },
  })

  if (!doctor) {
    throw new VisitError('DOCTOR_NOT_FOUND')
  }

  if (doctor.status !== 'APPROVED') {
    throw new VisitError('DOCTOR_NOT_APPROVED')
  }

  return doctor
}

// POST /api/v1/visits - Register a visit for an active plan holder
// FAIL-CLOSED COMPLETE CONTAINMENT (CMD-62 & CMD-63):
// Unilateral creation of COMPLETED visits, care relationships, and deduction of remaining plan
// benefits without independent patient authorization is STRICTLY RESTRICTED across all roles
// (both DOCTOR and administrative roles SUPER_ADMIN / ADMIN / manage_visits).
// All mutating visit creation is halted fail-closed until owner-approved patient consent (OTP/dashboard)
// workflow is implemented. Read-only visit inspection and audit remains intact.
export async function POST(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    const isDoctor = payload.roles.includes('DOCTOR')
    const hasVisitManagerAccess = canManageVisits(payload)

    if (!isDoctor && !hasVisitManagerAccess) {
      return errorResponse('FORBIDDEN', 'Doctor or visit management permission required', 403)
    }

    // CMD-63 FAIL-CLOSED CONTAINMENT:
    // Block unilateral visit creation and plan debiting across ALL actors (Doctor, Admin, Manager)
    // pending independent patient-side authorization implementation.
    console.warn('[CMD-63 Containment] Unilateral clinical visit blocked pending independent patient authorization. Actor:', payload.sub)
    return errorResponse(
      'FORBIDDEN',
      'ثبت مستقیم ویزیت بدون دریافت تأییدیه و رضایت مستقل بیمار مجاز نمی‌باشد. لطفاً از طریق فرآیند ارسال درخواست تأییدیه یا کد یکبارمصرف بیمار اقدام نمایید.',
      403
    )
  } catch (err: unknown) {
    console.error('[POST /api/v1/visits]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
