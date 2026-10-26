import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/contracts — List contracts for the logged-in doctor
export async function GET(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has DOCTOR role
  if (!payload!.roles.includes('DOCTOR')) {
    return errorResponse('FORBIDDEN', 'DOCTOR role required', 403)
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Find the doctor record
  const doctor = await db.doctor.findUnique({
    where: { userId: payload!.sub },
  })

  if (!doctor) {
    return errorResponse('NOT_FOUND', 'Doctor record not found', 404)
  }

  const [contracts, total] = await Promise.all([
    db.contract.findMany({
      where: { doctorId: doctor.id },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: { firstName: true, lastName: true, nationalCode: true },
            },
          },
        },
        userPlan: {
          include: {
            plan: {
              select: { name: true, discountPercent: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.contract.count({
      where: { doctorId: doctor.id },
    }),
  ])

  const formatted = contracts.map((c) => ({
    id: c.id,
    patientName: `${c.user.profile?.firstName || ''} ${c.user.profile?.lastName || ''}`.trim() || 'ناشناس',
    patientNationalCode: c.user.profile?.nationalCode || '',
    planName: c.userPlan.plan.name,
    discountPercent: c.userPlan.plan.discountPercent,
    totalAmount: c.totalAmount,
    discountAmount: c.discountAmount,
    status: c.status,
    diagnosis: c.diagnosis,
    createdAt: c.createdAt.toISOString(),
  }))

  return successResponse(formatted, 'Contracts retrieved')
}

// POST /api/v1/contracts — retain the endpoint while independent consent is unresolved.
// A login OTP, caller-supplied consent flag, or a visit status alone does not prove
// patient authorization for this contract. No contract or plan counter may be
// written until a reviewed, contract-bound consent workflow is available.
export async function POST(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error || 'Authentication required', 401)

  if (!payload.roles.includes('DOCTOR')) {
    return errorResponse('FORBIDDEN', 'DOCTOR role required', 403)
  }

  return errorResponse(
    'PATIENT_CONSENT_REQUIRED',
    'ثبت قرارداد تا احراز رضایت مستقل و معتبر بیمار امکان‌پذیر نیست. هیچ قراردادی ایجاد و هیچ سهمیه‌ای کسر نشد.',
    403
  )
}
