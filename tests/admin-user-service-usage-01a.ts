import { strict as assert } from 'node:assert'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { GET } = await import('../src/app/api/v1/admin/users/[id]/profile-summary/route')
const { generateAccessToken } = await import('../src/lib/jwt')
const patient = 'codex01b-patient'
const params = { params: Promise.resolve({ id: patient }) }
const admin = await generateAccessToken('codex01b-admin', ['SUPER_ADMIN'], [])
const request = (query: string, token?: string) => new NextRequest('http://localhost/api/v1/admin/users/' + patient + '/profile-summary?' + query, {
  headers: token ? { 'x-app-authorization': `Bearer ${token}` } : {},
})
try {
  const start = new Date('2030-03-20T20:30:00.000Z')
  const end = new Date('2030-03-21T20:30:00.000Z')
  const second = 'codex01b-physician-two'
  const first = 'codex01b-physician'
  const base = { userId: patient, userPlanId: 'codex01b-limited', planHolderId: 'codex01b-holder', doctorId: first, status: 'COMPLETED', createdAt: start }
  const linked = await db.contract.create({ data: { id: 'codex01a-usage-linked-contract', userId: patient, userPlanId: base.userPlanId, doctorId: first, status: 'COMPLETED', completedAt: start } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-linked-visit', contractId: linked.id, completedAt: start } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-start', createdAt: new Date('2029-01-01'), completedAt: start } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-holder', userId: null, doctorId: second, visitedAt: start } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-pending', status: 'PENDING' } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-cancelled', status: 'CANCELLED' } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-end', completedAt: new Date(end.getTime() - 1) } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-outside', completedAt: end } })
  await db.visit.create({ data: { ...base, id: 'codex01a-usage-other-user', userId: 'codex01b-agent', completedAt: start } })
  await db.contract.create({ data: { id: 'codex01a-usage-legacy', userId: patient, userPlanId: base.userPlanId, doctorId: second, status: 'COMPLETED', completedAt: start } })
  const query = 'from=2030-03-21&to=2030-03-21'
  assert.equal((await GET(request(query), params)).status, 401)
  const ordinary = await generateAccessToken(patient, ['USER'], [])
  assert.equal((await GET(request(query, ordinary), params)).status, 403)
  for (const invalid of ['from=2030-02-30&to=2030-03-01', 'from=2030-03-22&to=2030-03-21', 'from=2030-03-21T00:00:00Z']) {
    assert.equal((await GET(request(invalid, admin), params)).status, 400)
  }
  const countsBefore = await Promise.all([db.visit.count(), db.contract.count(), db.auditLog.count()])
  const response = await GET(request(query, admin), params)
  assert.equal(response.status, 200)
  const data = (await response.json()).data
  assert.deepEqual(data.range, { from: '2030-03-21', to: '2030-03-21' })
  assert.equal(data.visits.serviceUsage.registeredServices, 7)
  assert.equal(data.visits.serviceUsage.completedServices, 5)
  assert.equal(data.visits.serviceUsage.distinctDoctors, 2)
  assert.deepEqual(Object.fromEntries(data.visits.serviceUsage.byDoctor.map((row: { id: string; completedServices: number }) => [row.id, row.completedServices])), { [first]: 3, [second]: 2 })
  assert.ok(data.subscription && data.referral && Array.isArray(data.visits.recentVisits))
  for (const row of data.visits.serviceUsage.byDoctor) assert.deepEqual(Object.keys(row).sort(), ['completedServices', 'id', 'name', 'specialty'])
  const repeated = await GET(request(query, admin), params)
  assert.deepEqual((await repeated.json()).data.visits.serviceUsage, data.visits.serviceUsage)
  const empty = await GET(request('from=2040-01-01&to=2040-01-01', admin), params)
  const emptyUsage = (await empty.json()).data.visits.serviceUsage
  assert.equal(emptyUsage.registeredServices, 0)
  assert.equal(emptyUsage.completedServices, 0)
  assert.deepEqual(emptyUsage.byDoctor, [])
  assert.deepEqual(await Promise.all([db.visit.count(), db.contract.count(), db.auditLog.count()]), countsBefore)
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', passed: [
    '401/403 and invalid/reversed dates rejected by real summary handler',
    'Tehran start/end boundaries and completed-time precedence matched synthetic reference',
    'Holder-only visit included; explicit different owner excluded; linked contract not double counted',
    'Pending/cancelled are not completed usage; per-doctor totals match independently known 3+2',
    'Existing subscription/referral fields retained; repeated reads stable; empty date range and no writes verified',
  ] }, null, 2))
} finally { await db.$disconnect() }
