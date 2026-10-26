import { NextRequest } from 'next/server'
import type { CallLog } from '@prisma/client'
import { db } from '@/lib/db'
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response'
import { requireCallLogAccess } from '@/lib/call-log-access'
import { createCallLogSchema } from '@/lib/call-log-contract'
import { getDashboardPeriodRange, parseReportDateRange } from '@/utils/report-date-range'

const include = {
  recordedBy: { select: { profile: { select: { firstName: true, lastName: true } } } },
  subjectUser: { select: { profile: { select: { firstName: true, lastName: true } }, doctor: { select: { clinicName: true } }, agent: { select: { businessName: true } } } },
} as const

export async function GET(request: NextRequest) {
  const access = await requireCallLogAccess(request, 'view_call_logs')
  if (access.denied) return access.denied
  const query = request.nextUrl.searchParams
  const period = query.get('period') || 'today'
  if (!['today', 'week', 'custom'].includes(period)) return errorResponse('VALIDATION_ERROR', 'بازهٔ تماس نامعتبر است.', 400)
  const defaults = getDashboardPeriodRange(period === 'week' ? 'week' : 'today')
  const from = period === 'custom' ? query.get('from') : defaults.from
  const to = period === 'custom' ? query.get('to') : defaults.to
  if (!from || !to) return errorResponse('VALIDATION_ERROR', 'ابتدا و انتهای بازه لازم است.', 400)
  let occurredAt
  try { occurredAt = parseReportDateRange(from, to) } catch {
    return errorResponse('VALIDATION_ERROR', 'بازهٔ تاریخ معتبر نیست.', 400)
  }
  const page = Math.max(1, Math.floor(Number(query.get('page')) || 1))
  const limit = Math.min(50, Math.max(1, Math.floor(Number(query.get('limit')) || 10)))
  try {
    const where = { occurredAt }
    const [rows, total] = await Promise.all([
      db.callLog.findMany({ where, include, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      db.callLog.count({ where }),
    ])
    const data = rows.map(row => ({
      id: row.id, occurredAt: row.occurredAt.toISOString(), direction: row.direction, topic: row.topic,
      outcome: row.outcome, followUpStatus: row.followUpStatus, followUpAt: row.followUpAt?.toISOString() ?? null,
      note: row.note,
      recordedByName: [row.recordedBy.profile?.firstName, row.recordedBy.profile?.lastName].filter(Boolean).join(' ') || 'کاربر مجاز',
      subjectName: row.subjectUser
        ? [row.subjectUser.profile?.firstName, row.subjectUser.profile?.lastName].filter(Boolean).join(' ') || row.subjectUser.doctor?.clinicName || row.subjectUser.agent?.businessName || 'حساب مرتبط'
        : null,
    }))
    return paginatedResponse(data, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch {
    return errorResponse('CALL_LOGS_UNAVAILABLE', 'دریافت تماس‌ها فعلاً امکان‌پذیر نیست.', 503)
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCallLogAccess(request, 'manage_call_logs')
  if (access.denied) return access.denied
  let raw: unknown
  try { raw = await request.json() } catch { return errorResponse('VALIDATION_ERROR', 'بدنهٔ درخواست معتبر نیست.', 400) }
  const parsed = createCallLogSchema.safeParse(raw)
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'اطلاعات تماس معتبر نیست.', 400)
  const input = parsed.data
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
  const followUpAt = input.followUpAt ? new Date(input.followUpAt) : null
  if (occurredAt.getTime() > Date.now() + 5 * 60 * 1000 || (followUpAt && followUpAt < occurredAt)) {
    return errorResponse('VALIDATION_ERROR', 'زمان تماس یا پیگیری معتبر نیست.', 400)
  }
  const key = { recordedById: access.userId, clientRequestId: input.clientRequestId }
  const sameRequest = (row: CallLog) => row.direction === input.direction && row.topic === input.topic && row.outcome === input.outcome &&
    row.subjectUserId === (input.subjectUserId ?? null) && row.followUpStatus === input.followUpStatus &&
    row.followUpAt?.toISOString() === followUpAt?.toISOString() && (row.note ?? '') === (input.note ?? '') &&
    (!input.occurredAt || row.occurredAt.getTime() === occurredAt.getTime())
  const replay = (row: CallLog) => sameRequest(row)
    ? successResponse({ id: row.id, occurredAt: row.occurredAt.toISOString(), replayed: true }, 'این تماس قبلاً ثبت شده است.')
    : errorResponse('IDEMPOTENCY_CONFLICT', 'شناسهٔ ارسال برای اطلاعات متفاوت استفاده شده است.', 409)
  try {
    const existing = await db.callLog.findUnique({ where: { recordedById_clientRequestId: key } })
    if (existing) return replay(existing)
    if (input.subjectUserId && !await db.user.findUnique({ where: { id: input.subjectUserId }, select: { id: true } })) {
      return errorResponse('VALIDATION_ERROR', 'حساب مرتبط یافت نشد.', 400)
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const row = await db.$transaction(async transaction => {
          const created = await transaction.callLog.create({ data: {
            ...key, occurredAt, direction: input.direction, topic: input.topic, outcome: input.outcome,
            subjectUserId: input.subjectUserId ?? null, followUpStatus: input.followUpStatus,
            followUpAt, note: input.note || null,
          } })
          await transaction.auditLog.create({ data: {
            userId: access.userId, action: 'CALL_LOG_CREATED', entity: 'CallLog', entityId: created.id,
            details: JSON.stringify({ direction: input.direction, topic: input.topic, outcome: input.outcome, followUpStatus: input.followUpStatus }),
          } })
          return created
        })
        return successResponse({ id: row.id, occurredAt: row.occurredAt.toISOString(), replayed: false }, 'تماس ثبت شد.', 201)
      } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
        if (!['P2002', 'P2028', 'P2034', 'P1008'].includes(code)) throw error
        const existing = await db.callLog.findUnique({ where: { recordedById_clientRequestId: key } })
        if (existing) return replay(existing)
        if (attempt === 2) throw error
        await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)))
      }
    }
    return errorResponse('CALL_LOGS_UNAVAILABLE', 'ثبت تماس فعلاً امکان‌پذیر نیست؛ با همان درخواست دوباره تلاش کنید.', 503)
  } catch {
    // Never log user notes, contact details, credentials, or a raw ORM error.
    return errorResponse('CALL_LOGS_UNAVAILABLE', 'ثبت تماس فعلاً امکان‌پذیر نیست؛ دوباره تلاش کنید.', 503)
  }
}
