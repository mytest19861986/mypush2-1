import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { randomUUID, createHash } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { getDashboardPeriodRange } from '../src/utils/report-date-range'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const sqlite = new Database('/workspace/prisma/admin01b-sandbox.sqlite')
sqlite.exec(readFileSync('/workspace/prisma/migrations/20261025010000_admin_call_logs/migration.sql', 'utf8'))
sqlite.close()
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { GET, POST } = await import('../src/app/api/v1/admin/call-logs/route')
const { GET: subjects } = await import('../src/app/api/v1/admin/call-logs/subjects/route')
const passed: string[] = []
const admin = 'codex01b-admin', patient = 'codex01b-patient', agent = 'codex01b-agent'
const token = async (id: string, roles = ['USER'], permissions: string[] = []) => generateAccessToken(id, roles, permissions)
async function request(method: string, signed?: string, body?: unknown, query = '') {
  return new NextRequest('http://localhost/api/v1/admin/call-logs' + query, {
    method, headers: { 'content-type': 'application/json', 'x-user-role': 'SUPER_ADMIN', 'x-user-id': admin, ...(signed ? { 'x-app-authorization': `Bearer ${signed}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
const valid = () => ({ clientRequestId: randomUUID(), direction: 'INBOUND', topic: 'SUPPORT', outcome: 'COMPLETED', note: 'پیگیری اجرایی ساختگی' })
async function financialHash() {
  const rows = await Promise.all([db.contract.findMany({ orderBy: { id: 'asc' } }), db.userPlan.findMany({ orderBy: { id: 'asc' } }), db.settlement.findMany({ orderBy: { id: 'asc' } }), db.wallet.findMany({ orderBy: { id: 'asc' } })])
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

try {
  const beforeFinancial = await financialHash()
  assert.equal((await GET(await request('GET'))).status, 401)
  assert.equal((await POST(await request('POST', undefined, valid()))).status, 401)
  const staleElevated = await token(patient, ['SUPER_ADMIN'], ['*', 'manage_call_logs'])
  assert.equal((await GET(await request('GET', staleElevated))).status, 403)
  assert.equal((await POST(await request('POST', staleElevated, valid()))).status, 403)
  passed.push('Call permissions use current DB roles/permissions; spoofed headers and elevated stale JWT claims cannot authorize access')

  const adminToken = await token(admin, ['SUPER_ADMIN'])
  const body = { ...valid(), subjectUserId: patient }
  const created = await POST(await request('POST', adminToken, body))
  assert.equal(created.status, 201)
  const id = (await created.json()).data.id
  const replay = await POST(await request('POST', adminToken, body))
  assert.equal(replay.status, 200)
  assert.equal((await replay.json()).data.id, id)
  assert.equal((await POST(await request('POST', adminToken, { ...body, outcome: 'NO_ANSWER' }))).status, 409)
  assert.equal(await db.auditLog.count({ where: { entity: 'CallLog', entityId: id, userId: admin } }), 1)
  const stored = await db.callLog.findUniqueOrThrow({ where: { id } })
  assert.equal(stored.recordedById, admin)
  assert.equal(stored.subjectUserId, patient)
  passed.push('Create, actor/subject persistence, exactly one atomic audit, same-request replay and conflicting-payload409')

  const countBeforeInvalid = await db.callLog.count()
  const invalidBodies = [
    { ...valid(), direction: 'INVALID' }, { ...valid(), note: 'x'.repeat(501) },
    { ...valid(), recordedById: patient }, { ...valid(), diagnosis: 'not-allowed' },
    { ...valid(), subjectUserId: 'missing-subject' }, { ...valid(), followUpStatus: 'PENDING' },
    { ...valid(), occurredAt: new Date(Date.now() + 86400000).toISOString() },
  ]
  for (const invalid of invalidBodies) assert.equal((await POST(await request('POST', adminToken, invalid))).status, 400)
  assert.equal(await db.callLog.count(), countBeforeInvalid)
  passed.push('Strict field/type/length/date/subject validation rejects invalid actor and clinical fields without writes')

  const repeated = valid()
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => request('POST', adminToken, repeated).then(POST)))
  assert.equal(concurrent.filter(response => response.status === 201).length, 1)
  assert.equal(concurrent.filter(response => response.status === 200).length, 3)
  const concurrentRow = await db.callLog.findUniqueOrThrow({ where: { recordedById_clientRequestId: { recordedById: admin, clientRequestId: repeated.clientRequestId } } })
  assert.equal(await db.auditLog.count({ where: { entity: 'CallLog', entityId: concurrentRow.id } }), 1)
  passed.push('Four concurrent submissions create one call and one audit; remaining responses replay the same persisted record')

  const fixtureTimes = ['2026-03-20T20:29:59.999Z', '2026-03-20T20:30:00.000Z', '2026-03-21T20:29:59.999Z', '2026-03-21T20:30:00.000Z']
  for (const occurredAt of fixtureTimes) await db.callLog.create({ data: {
    recordedById: admin, clientRequestId: randomUUID(), direction: 'OUTBOUND', topic: 'DOCUMENTS', outcome: 'COMPLETED', occurredAt: new Date(occurredAt),
  } })
  const rangeResponse = await GET(await request('GET', adminToken, undefined, '?period=custom&from=2026-03-21&to=2026-03-21&limit=50'))
  assert.equal(rangeResponse.status, 200)
  const range = await rangeResponse.json()
  assert.equal(range.pagination.total, 2)
  assert.equal(range.data.length, 2)
  for (const row of range.data) {
    assert.equal('mobile' in row, false)
    assert.equal('nationalCode' in row, false)
    assert.equal('recordedById' in row, false)
  }
  assert.equal((await GET(await request('GET', adminToken, undefined, '?period=custom&from=2026-02-30&to=2026-03-21'))).status, 400)
  const empty = await GET(await request('GET', adminToken, undefined, '?period=custom&from=2000-01-01&to=2000-01-02'))
  assert.equal((await empty.json()).data.length, 0)
  assert.deepEqual(getDashboardPeriodRange('week', new Date('2026-03-22T12:00:00Z')), { from: '2026-03-21', to: '2026-03-22' })
  passed.push('Full Tehran day boundaries, true empty state, pagination, Saturday-based week, and minimal non-sensitive list fields')

  const role = await db.role.create({ data: { id: 'codex01a-call-role', name: 'CODEX_CALL_VIEWER', title: 'نقش ساختگی تماس' } })
  await db.userRole.create({ data: { userId: agent, roleId: role.id } })
  const viewPermission = await db.permission.findUniqueOrThrow({ where: { name: 'view_call_logs' } })
  const managePermission = await db.permission.findUniqueOrThrow({ where: { name: 'manage_call_logs' } })
  const viewLink = await db.rolePermission.create({ data: { roleId: role.id, permissionId: viewPermission.id } })
  const sameToken = await token(agent, ['AGENT'])
  assert.equal((await GET(await request('GET', sameToken))).status, 200)
  assert.equal((await POST(await request('POST', sameToken, valid()))).status, 403)
  const manageLink = await db.rolePermission.create({ data: { roleId: role.id, permissionId: managePermission.id } })
  assert.equal((await POST(await request('POST', sameToken, valid()))).status, 201)
  await db.rolePermission.delete({ where: { id: manageLink.id } })
  assert.equal((await POST(await request('POST', sameToken, valid()))).status, 403)
  await db.rolePermission.delete({ where: { id: viewLink.id } })
  assert.equal((await GET(await request('GET', sameToken))).status, 403)
  passed.push('View/manage permissions separate; granting/revoking DB permissions takes effect with the same existing JWT')

  const lookup = await subjects(await request('GET', adminToken, undefined, '?q=' + encodeURIComponent('آزمون')))
  assert.equal(lookup.status, 200)
  for (const row of (await lookup.json()).data) assert.deepEqual(Object.keys(row).sort(), ['id', 'kind', 'name'])
  assert.equal((await subjects(await request('GET', staleElevated, undefined, '?q=test'))).status, 403)
  assert.equal(await financialHash(), beforeFinancial)
  passed.push('Authorized subject lookup excludes contact/identity data; call operations leave financial/contract/plan rows unchanged')
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', passed }, null, 2))
} finally { await db.$disconnect() }
