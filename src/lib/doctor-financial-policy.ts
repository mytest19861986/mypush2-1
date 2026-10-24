import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export const MODEL_B_MESSAGE = 'در مدل فعلی حامی‌کارت، هزینه ویزیت مستقیماً به مطب پرداخت می‌شود و تسویه پزشک از حامی‌کارت فعال نیست.'
export const REPORT_UNAVAILABLE_MESSAGE = 'این شاخص قابل محاسبه نیست؛ منبع پایدار و تأییدشده برای گزارش مالی پزشک مشخص نشده است.'

// Authentication and database association precede all policy responses.
// Caller-controlled role/doctor headers never confer authority.
export async function guardDoctorFinancial(request: NextRequest, admin = false, doctorId?: string | null) {
  try {
    const { authenticated, payload } = await authenticateRequest(request)
    if (!authenticated || !payload) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    const user = await db.user.findUnique({ where: { id: payload.sub }, select: { status: true } })
    if (!user || user.status !== 'ACTIVE') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (admin) {
      if (!payload.roles.includes('SUPER_ADMIN')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    } else {
      if (!payload.roles.includes('DOCTOR')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      const doctor = await db.doctor.findUnique({ where: { userId: payload.sub }, select: { id: true } })
      if (!doctor || (doctorId && doctorId !== doctor.id)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    return null
  } catch {
    return NextResponse.json({ error: 'AUTHORIZATION_UNAVAILABLE' }, { status: 503 })
  }
}

export function doctorSettlementDisabled() {
  return NextResponse.json({ success: false, code: 'DOCTOR_SETTLEMENT_DISABLED_MODEL_B', error: MODEL_B_MESSAGE }, { status: 409 })
}

export function doctorReportUnavailable() {
  // Do not return invented zero balances or empty historical records.
  return NextResponse.json({ success: false, code: 'DOCTOR_FINANCIAL_SOURCE_UNVERIFIED', error: REPORT_UNAVAILABLE_MESSAGE }, { status: 503 })
}
