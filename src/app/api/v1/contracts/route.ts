import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { calculateDiscountAmount, getEffectiveDiscountPercent } from '@/lib/doctor-discount'

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

// POST /api/v1/contracts — Create a new contract
export async function POST(request: NextRequest) {
  const { authenticated, payload, error } = await authenticateRequest(request)
  if (!authenticated) return errorResponse('UNAUTHORIZED', error!, 401)

  // Check user has DOCTOR role
  if (!payload!.roles.includes('DOCTOR')) {
    return errorResponse('FORBIDDEN', 'DOCTOR role required', 403)
  }

  const body = await request.json()
  const { patientId, userPlanId, diagnosis, doctorNote, patientNote, totalAmount, discountAmount } = body as {
    patientId?: string
    userPlanId: string
    diagnosis?: string
    doctorNote?: string
    patientNote?: string
    totalAmount: number
    discountAmount?: number
  }

  if (!userPlanId || !totalAmount) {
    return errorResponse('VALIDATION_ERROR', 'userPlanId and totalAmount are required', 400)
  }

  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    return errorResponse('VALIDATION_ERROR', 'totalAmount must be a positive number', 400)
  }

  // Find doctor record
  const doctor = await db.doctor.findUnique({
    where: { userId: payload!.sub },
  })

  if (!doctor) {
    return errorResponse('NOT_FOUND', 'Doctor record not found', 404)
  }

  // Verify the user plan exists, belongs to the patient, and is active
  const userPlan = await db.userPlan.findFirst({
    where: {
      id: userPlanId,
      ...(patientId ? { userId: patientId } : {}),
      status: 'ACTIVE',
      endDate: { gte: new Date() },
    },
    include: {
      plan: true,
    },
  })

  if (!userPlan) {
    return errorResponse('NOT_FOUND', 'طرح فعال بیمار یافت نشد', 404)
  }

  const resolvedPatientId = patientId ?? userPlan.userId
  const effectiveDiscountPercent = getEffectiveDiscountPercent(
    doctor.discountPercent,
    userPlan.plan.discountPercent
  )
  const computedDiscountAmount = calculateDiscountAmount(totalAmount, effectiveDiscountPercent)
  const finalDiscountAmount =
    typeof discountAmount === 'number' && discountAmount >= 0
      ? discountAmount
      : computedDiscountAmount

  // Check remaining uses
  if (userPlan.remainingUses !== -1 && userPlan.remainingUses <= 0) {
    return errorResponse('VALIDATION_ERROR', 'No remaining uses for this plan', 400)
  }

  // Create contract
  const contract = await db.contract.create({
    data: {
      userId: resolvedPatientId,
      userPlanId,
      doctorId: doctor.id,
      diagnosis: diagnosis || null,
      doctorNote: doctorNote || null,
      patientNote: patientNote || null,
      totalAmount,
      discountAmount: finalDiscountAmount,
      status: 'PENDING',
    },
  })

  // Decrement remaining uses if limited
  if (userPlan.remainingUses !== -1) {
    await db.userPlan.update({
      where: { id: userPlanId },
      data: {
        remainingUses: { decrement: 1 },
        totalUses: { increment: 1 },
      },
    })
  } else {
    await db.userPlan.update({
      where: { id: userPlanId },
      data: { totalUses: { increment: 1 } },
    })
  }

  // Audit log
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  const device = request.headers.get('user-agent') || undefined
  createAuditLog({
    userId: payload!.sub,
    action: 'CONTRACT_CREATED',
    entity: 'Contract',
    entityId: contract.id,
    details: {
      patientId: resolvedPatientId,
      userPlanId,
      totalAmount,
      discountAmount: finalDiscountAmount,
      discountPercent: effectiveDiscountPercent,
    },
    ip,
    device,
  })

  return successResponse(contract, 'Contract created successfully')
}
