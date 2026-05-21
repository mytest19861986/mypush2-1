import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

// GET /api/v1/plans/[id] — Get plan details (public)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plan = await db.discountPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userPlans: true },
        },
      },
    })

    if (!plan) {
      return errorResponse('NOT_FOUND', 'طرح مورد نظر یافت نشد', 404)
    }

    return successResponse(plan)
  } catch (err) {
    console.error('[GET /api/v1/plans/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

// PATCH /api/v1/plans/[id] — Update plan (requires manage_plans)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_plans')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params

    const existingPlan = await db.discountPlan.findUnique({ where: { id } })
    if (!existingPlan) {
      return errorResponse('NOT_FOUND', 'طرح مورد نظر یافت نشد', 404)
    }

    const body = await request.json()

    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      price: z.number().int().min(0).optional(),
      discountPercent: z.number().int().min(0).max(100).optional(),
      durationDays: z.number().int().min(1).optional(),
      maxUses: z.number().int().optional(),
      features: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    const plan = await db.discountPlan.update({
      where: { id },
      data: parsed.data,
    })

    return successResponse(plan, 'طرح با موفقیت بروزرسانی شد')
  } catch (err) {
    console.error('[PATCH /api/v1/plans/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

// DELETE /api/v1/plans/[id] — Delete plan (requires manage_plans)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requirePermission(request, 'manage_plans')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const { id } = await params

    const existingPlan = await db.discountPlan.findUnique({ where: { id } })
    if (!existingPlan) {
      return errorResponse('NOT_FOUND', 'طرح مورد نظر یافت نشد', 404)
    }

    await db.discountPlan.delete({ where: { id } })

    return successResponse(null, 'طرح با موفقیت حذف شد')
  } catch (err) {
    console.error('[DELETE /api/v1/plans/[id]]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
