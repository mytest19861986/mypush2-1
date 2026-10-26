import { strict as assert } from 'node:assert'
import { formatReportMonthRange } from '../src/utils/report-month-label'
import { formatJalaliDateRange } from '../src/utils/formatters'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { parseReportDateRange, getRecentReportDateRange } from '../src/utils/report-date-range'
import { jalaliDatePartsToIsoDate } from '../src/utils/jalali-date'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { GET: doctorReport } = await import('../src/app/api/v1/doctors/[id]/performance/route')
const { GET: agentReport } = await import('../src/app/api/v1/agents/[id]/performance/route')
const { PATCH: editDoctor, GET: doctorDetail } = await import('../src/app/api/v1/doctors/[id]/route')
const { apiClient, ApiError } = await import('../src/lib/api-client')
const { getReportErrorMessage } = await import('../src/lib/report-client')
const passed: string[] = []
assert.equal(formatReportMonthRange('2024-02'), formatJalaliDateRange('2024-02-01', '2024-02-29'))
assert.equal(formatReportMonthRange('2026-03'), formatJalaliDateRange('2026-03-01', '2026-03-31'))
for (const invalid of ['2026-00', '2026-13', '2026-1', 'junk']) assert.equal(formatReportMonthRange(invalid), 'بازه نامعتبر')
const params = (id: string) => ({ params: Promise.resolve({ id }) })
async function request(path: string, role?: string, body?: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-user-role': 'SUPER_ADMIN' }
  if (role) headers['x-app-authorization'] = `Bearer ${await generateAccessToken(role === 'SUPER_ADMIN' ? 'codex01b-admin' : 'codex01b-patient', [role], [])}`
  return new NextRequest('http://localhost/api/v1' + path, { method: body === undefined ? 'GET' : 'PATCH', headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}

try {
  const singleDay = parseReportDateRange('2026-03-21', '2026-03-21')
  assert.equal(singleDay.gte!.toISOString(), '2026-03-20T20:30:00.000Z')
  assert.equal(singleDay.lt!.toISOString(), '2026-03-21T20:30:00.000Z')
  const historical = parseReportDateRange('2021-07-01', '2021-07-01')
  assert.equal(historical.gte!.toISOString(), '2021-06-30T19:30:00.000Z')
  const transition = parseReportDateRange('2021-03-22', '2021-03-22')
  assert.equal(transition.lt!.getTime() - transition.gte!.getTime(), 23 * 60 * 60 * 1000)
  assert.throws(() => parseReportDateRange('2026-02-30', '2026-03-01'))
  assert.throws(() => parseReportDateRange('2026-03-22', '2026-03-21'))
  assert.throws(() => parseReportDateRange('not-a-date', null))
  assert.equal(jalaliDatePartsToIsoDate(1405, 1, 1), '2026-03-21')
  assert.deepEqual(getRecentReportDateRange(new Date('2026-03-20T21:00:00Z'), 1), { from: '2026-03-21', to: '2026-03-21' })
  passed.push('Jalali conversion, complete Tehran day, historical DST, skipped midnight and invalid/reversed ranges')

  const doctor = await db.doctor.findUniqueOrThrow({ where: { id: 'codex01b-physician' } })
  const otherDoctor = await db.doctor.findUniqueOrThrow({ where: { id: 'codex01b-physician-two' } })
  await db.agent.create({ data: { id: 'codex01a-agent-record', userId: 'codex01b-agent', businessName: 'همکار ساختگی آزمون', status: 'APPROVED' } })
  const times = [new Date(singleDay.gte!.getTime() - 1), singleDay.gte!, new Date(singleDay.lt!.getTime() - 1), singleDay.lt!]
  for (let index = 0; index < times.length; index++) {
    await db.visit.create({ data: {
      id: `codex01a-visit-${index}`, userId: 'codex01b-patient', userPlanId: 'codex01b-limited', planHolderId: 'codex01b-holder',
      doctorId: doctor.id, status: 'COMPLETED', totalAmount: (index + 1) * 100, discountAmount: (index + 1) * 10,
      createdAt: times[index], visitedAt: times[index], completedAt: times[index],
    } })
    await db.commission.create({ data: {
      id: `codex01a-commission-${index}`, agentId: 'codex01b-agent', userPlanId: 'codex01b-limited',
      amount: (index + 1) * 100, percent: 10, status: 'APPROVED', createdAt: times[index],
    } })
  }
  await db.visit.create({ data: { id: 'codex01a-other-doctor-visit', userPlanId: 'codex01b-limited', planHolderId: 'codex01b-holder', doctorId: otherDoctor.id, status: 'COMPLETED', totalAmount: 99999, createdAt: times[1] } })
  const range = '?startDate=2026-03-21&endDate=2026-03-21'
  for (const [handler, id] of [[doctorReport, doctor.id], [agentReport, 'codex01a-agent-record']] as const) {
    assert.equal((await handler(await request('/report' + range), params(id))).status, 401)
    assert.equal((await handler(await request('/report' + range, 'USER'), params(id))).status, 403)
    assert.equal((await handler(await request('/report?startDate=2026-02-30', 'SUPER_ADMIN'), params(id))).status, 400)
    assert.equal((await handler(await request('/report?startDate=2026-03-22&endDate=2026-03-21', 'SUPER_ADMIN'), params(id))).status, 400)
  }
  const doctorResponse = await doctorReport(await request('/report' + range, 'SUPER_ADMIN'), params(doctor.id))
  assert.equal(doctorResponse.status, 200)
  const doctorData = (await doctorResponse.json()).data
  assert.equal(doctorData.metrics.totalVisits, 2)
  assert.equal(doctorData.metrics.totalCompletedVisits, 2)
  assert.equal(doctorData.metrics.financial.totalCompletedAmount, 500)
  assert.equal(doctorData.metrics.financial.totalCompletedDiscountAmount, 50)
  const agentResponse = await agentReport(await request('/report' + range, 'SUPER_ADMIN'), params('codex01a-agent-record'))
  assert.equal(agentResponse.status, 200)
  const agentData = (await agentResponse.json()).data
  assert.equal(agentData.metrics.commissionCount, 2)
  assert.equal(agentData.metrics.totalEarnedCommission, 500)
  passed.push('Real Prisma report handlers:401/403/400, inclusive selected day/exclusive next day, doctor scope and financial totals matched to fixtures')

  assert.equal((await editDoctor(await request('/doctor', undefined, { medicalCode: '12345' }), params(doctor.id))).status, 401)
  assert.equal((await editDoctor(await request('/doctor', 'USER', { medicalCode: '12345' }), params(doctor.id))).status, 403)
  for (const medicalCode of ['', null, 12345, 'letters', '12345678901']) {
    assert.equal((await editDoctor(await request('/doctor', 'SUPER_ADMIN', { medicalCode }), params(doctor.id))).status, 400)
  }
  await db.doctor.update({ where: { id: otherDoctor.id }, data: { medicalCode: '98765' } })
  assert.equal((await editDoctor(await request('/doctor', 'SUPER_ADMIN', { medicalCode: '۱۲۳۴۵' }), params(doctor.id))).status, 200)
  assert.equal((await db.doctor.findUniqueOrThrow({ where: { id: doctor.id } })).medicalCode, '12345')
  const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: doctor.id, action: 'DOCTOR_UPDATED' }, orderBy: { createdAt: 'desc' } })
  assert.equal(audit.userId, 'codex01b-admin')
  assert.equal(JSON.parse(audit.details!).changedFields.medicalCode.next, '12345')
  assert.equal((await editDoctor(await request('/doctor', 'SUPER_ADMIN', { medicalCode: '۹۸۷۶۵' }), params(doctor.id))).status, 409)
  const detail = await doctorDetail(await request('/doctor', 'SUPER_ADMIN'), params(doctor.id))
  assert.equal((await detail.json()).data.medicalCode, '12345')
  const race = await Promise.all([doctor.id, otherDoctor.id].map(async id => editDoctor(await request('/doctor', 'SUPER_ADMIN', { medicalCode: '54321' }), params(id))))
  assert.deepEqual(race.map(response => response.status).sort(), [200, 409])
  assert.equal(await db.doctor.count({ where: { medicalCode: '54321' } }), 1)
  passed.push('Medical code: permission, invalid inputs, Persian normalization, duplicate/concurrent uniqueness, persistence and atomic actor audit')

  const originalFetch = globalThis.fetch
  try {
    for (const status of [401, 403, 404, 500]) {
      globalThis.fetch = (async () => new Response('<h1>HTML error</h1>', { status, headers: { 'Content-Type': 'text/html' } })) as typeof fetch
      await assert.rejects(() => apiClient.request('GET', '/report'), error => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, status)
        assert.ok(getReportErrorMessage(error).includes(status.toLocaleString('fa-IR', { useGrouping: false })))
        return true
      })
    }
  } finally { globalThis.fetch = originalFetch }
  passed.push('Client non-JSON HTTP401/403/404/500 retain status and are not misreported as network failures')
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', passed }, null, 2))
} finally { await db.$disconnect() }
