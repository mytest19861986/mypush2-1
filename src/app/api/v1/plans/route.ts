import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const commissionPercentSchema = (label: string) =>
  z.union([
    z.literal('').transform(() => 0),
    z.number({ error: `${label} باید عدد باشد` })
      .int(`${label} باید عدد صحیح باشد`)
      .min(0, `${label} باید بین ۰ تا ۱۰۰ باشد`)
      .max(100, `${label} باید بین ۰ تا ۱۰۰ باشد`),
  ]).optional()

// POST /api/v1/plans — Create plan (requires manage_plans permission)
export async function POST(request: NextRequest) {
  try {
    const { authorized, payload, error } = await requirePermission(request, 'manage_plans')
    if (!authorized) return errorResponse('UNAUTHORIZED', error!, 401)

    const body = await request.json()

    const schema = z.object({
      name: z.string().min(1, 'نام طرح الزامی است'),
      description: z.string().optional(),
      price: z.number().int().min(0, 'قیمت باید عدد صحیح مثبت باشد'),
      discountPercent: z.number().int().min(0).max(100, 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد'),
      durationDays: z.number().int().min(1, 'مدت طرح باید حداقل ۱ روز باشد'),
      maxUses: z.number().int().optional(),
      salesPartnerCommissionPercent: commissionPercentSchema('درصد پورسانت همکار فروش'),
      referralCommissionPercent: commissionPercentSchema('درصد پورسانت رفرال کاربر'),
      features: z.string().optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues.map((e) => e.message).join('. '), 400)
    }

    const {
      name,
      description,
      price,
      discountPercent,
      durationDays,
      maxUses,
      salesPartnerCommissionPercent,
      referralCommissionPercent,
      features,
    } = parsed.data

    const plan = await db.discountPlan.create({
      data: {
        name,
        description,
        price,
        discountPercent,
        durationDays,
        maxUses: maxUses ?? -1,
        salesPartnerCommissionPercent: salesPartnerCommissionPercent ?? 0,
        referralCommissionPercent: referralCommissionPercent ?? 0,
        features,
      },
    })

    return successResponse(plan, 'طرح تخفیف با موفقیت ایجاد شد', 201)
  } catch (err) {
    console.error('[POST /api/v1/plans]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}

// GET /api/v1/plans — List all active plans (public, no auth needed)
export async function GET() {
  try {
    const plans = await db.discountPlan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(plans)
  } catch (err) {
    console.error('[GET /api/v1/plans]', err)
    return errorResponse('INTERNAL_ERROR', 'خطای داخلی سرور', 500)
  }
}
