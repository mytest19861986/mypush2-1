import { NextRequest, NextResponse } from 'next/server'
import { guardDoctorFinancial, doctorSettlementDisabled } from '@/lib/doctor-financial-policy'

export async function POST(request: NextRequest) {
  const denied = await guardDoctorFinancial(request)
  if (denied) return denied
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || !('doctorId' in body) || typeof body.doctorId !== 'string' || !body.doctorId.trim()) return NextResponse.json({ error: 'doctorId required' }, { status: 400 })
  const associationDenied = await guardDoctorFinancial(request, false, body.doctorId)
  return associationDenied ?? doctorSettlementDisabled()
}
