import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AuditActions } from '@/lib/audit'
import {
  canManageSettings,
  getMinimumSettlementAmount,
  setMinimumSettlementAmount,
} from '@/lib/app-settings'
import { getClientIp } from '@/app/api/v1/auth/_helpers'

const settlementSettingsSchema = z.object({
  minimumSettlementAmount: z.number().int().min(0),
})

export async function GET(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageSettings(payload)) {
      return errorResponse('FORBIDDEN', 'Settings management permission required', 403)
    }

    const minimumSettlementAmount = await getMinimumSettlementAmount()

    return successResponse({ minimumSettlementAmount })
  } catch (err) {
    console.error('[GET /api/v1/admin/settings/settlement]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { authenticated, payload, error } = await authenticateRequest(request)
    if (!authenticated || !payload) return errorResponse('UNAUTHORIZED', error!, 401)

    if (!canManageSettings(payload)) {
      return errorResponse('FORBIDDEN', 'Settings management permission required', 403)
    }

    const body = await request.json()
    const parsed = settlementSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'حداقل مبلغ درخواست تسویه باید عدد صحیح و بزرگ‌تر یا مساوی صفر باشد.',
        400
      )
    }

    const ip = getClientIp(request)
    const device = request.headers.get('user-agent') || undefined
    const minimumSettlementAmount = await db.$transaction(async (tx) => {
      const previousMinimumSettlementAmount = await getMinimumSettlementAmount(tx)
      const updatedMinimumSettlementAmount = await setMinimumSettlementAmount(
        parsed.data.minimumSettlementAmount,
        tx
      )

      await tx.auditLog.create({
        data: {
          userId: payload.sub,
          action: AuditActions.SETTLEMENT_SETTINGS_UPDATED,
          entity: 'AppSetting',
          details: JSON.stringify({
            key: 'minimumSettlementAmount',
            previousMinimumSettlementAmount,
            minimumSettlementAmount: updatedMinimumSettlementAmount,
          }),
          ip,
          device,
        },
      })

      return updatedMinimumSettlementAmount
    })

    return successResponse(
      { minimumSettlementAmount },
      'تنظیمات تسویه با موفقیت ذخیره شد.'
    )
  } catch (err) {
    if (err instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    console.error('[PATCH /api/v1/admin/settings/settlement]', err)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
