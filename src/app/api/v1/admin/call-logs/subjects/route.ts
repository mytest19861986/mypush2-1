import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireCallLogAccess } from '@/lib/call-log-access'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const access = await requireCallLogAccess(request, 'manage_call_logs')
  if (access.denied) return access.denied
  const query = request.nextUrl.searchParams.get('q')?.trim() || ''
  if (query.length < 2) return successResponse([])
  if (query.length > 100) return errorResponse('VALIDATION_ERROR', 'عبارت جست‌وجو طولانی است.', 400)
  try {
    const users = await db.user.findMany({
      where: { deletedAt: null, OR: [
        { profile: { firstName: { contains: query } } }, { profile: { lastName: { contains: query } } },
        { doctor: { clinicName: { contains: query } } }, { agent: { businessName: { contains: query } } },
      ] },
      select: {
        id: true, profile: { select: { firstName: true, lastName: true } },
        doctor: { select: { clinicName: true } }, agent: { select: { businessName: true } },
      },
      orderBy: { id: 'asc' }, take: 20,
    })
    return successResponse(users.map(user => ({
      id: user.id,
      name: [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.doctor?.clinicName || user.agent?.businessName || 'کاربر سامانه',
      kind: user.doctor ? 'پزشک' : user.agent ? 'همکار فروش' : 'کاربر',
    })))
  } catch {
    return errorResponse('LOOKUP_UNAVAILABLE', 'جست‌وجوی حساب‌ها فعلاً امکان‌پذیر نیست.', 503)
  }
}
