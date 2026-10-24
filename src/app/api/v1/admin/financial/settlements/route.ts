import { NextRequest } from 'next/server'
import { guardDoctorFinancial, doctorReportUnavailable } from '@/lib/doctor-financial-policy'

export async function GET(request: NextRequest) {
  const denied = await guardDoctorFinancial(request, true, request.nextUrl.searchParams.get('doctorId'))
  return denied ?? doctorReportUnavailable()
}
