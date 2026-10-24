import { NextRequest, NextResponse } from 'next/server'
import { guardDoctorFinancial, doctorSettlementDisabled } from '@/lib/doctor-financial-policy'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardDoctorFinancial(request, true)
  if (denied) return denied
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!id || !body || typeof body !== 'object' || !('action' in body) || !['APPROVE', 'PAY', 'REJECT'].includes(String(body.action))) return NextResponse.json({ error: 'Invalid action. Must be APPROVE, PAY, or REJECT' }, { status: 400 })
  // No state mapping: all doctor transitions need a separately approved obligation model.
  return doctorSettlementDisabled()
}
