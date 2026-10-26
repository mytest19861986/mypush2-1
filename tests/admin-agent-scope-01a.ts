import { strict as assert } from 'node:assert'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { generateReferralCode, findApprovedAgentByReferralCode } = await import('../src/lib/referrals')
const { GET } = await import('../src/app/api/v1/admin/agents/[id]/performance/route')
const { GET: agentList } = await import('../src/app/api/v1/agents/route')
const { GET: customers } = await import('../src/app/api/v1/sales-customers/route')
const admin = await generateAccessToken('codex01b-admin', ['SUPER_ADMIN'], [])
const query = 'from=2031-03-21&to=2031-03-21'
const request = (query: string, token?: string) => new NextRequest('http://localhost/api/v1/report?' + query, { headers: token ? { 'x-app-authorization': `Bearer ${token}` } : {} })
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const first = 'codex01a-agent-record'
const second = 'codex01a-scope-agent-two'
try {
  await db.user.create({ data: { id: second, mobile: '09999880001', status: 'ACTIVE', profile: { create: { firstName: 'آزمون', lastName: 'همکار دوم' } }, roles: { create: { role: { connect: { name: 'AGENT' } } } } } })
  await db.agent.create({ data: { id: second, userId: second, status: 'APPROVED', businessName: 'کسب‌وکار ساختگی دوم' } })
  const start = new Date('2031-03-20T20:30:00Z')
  const end = new Date('2031-03-21T20:30:00Z')
  for (const [index, owner] of ['codex01b-agent', second].entries()) {
    await db.salesCustomer.create({ data: { id: `codex01a-scope-customer-${index}`, salesPartnerId: owner, planId: 'codex01b-plan', firstName: 'مشتری ساختگی ' + index, status: 'CONFIRMED', createdAt: start, paidAt: start, confirmedAt: start } })
    await db.commission.create({ data: { agentId: owner, userPlanId: 'codex01b-limited', amount: (index + 1) * 111, status: 'APPROVED', createdAt: start } })
    const wallet = await db.wallet.upsert({ where: { userId: owner }, create: { userId: owner }, update: {} })
    await db.settlement.create({ data: { userId: owner, walletId: wallet.id, amount: (index + 1) * 11, status: 'PENDING', requestedAt: start } })
  }
  await db.salesCustomer.create({ data: { id: 'codex01a-scope-next-day', salesPartnerId: 'codex01b-agent', planId: 'codex01b-plan', firstName: 'خارج بازه', createdAt: end } })
  await db.commission.create({ data: { agentId: 'codex01b-agent', userPlanId: 'codex01b-limited', amount: 9999, status: 'APPROVED', createdAt: end } })
  assert.equal((await GET(request(query), params(first))).status, 401)
  const ordinary = await generateAccessToken('codex01b-patient', ['USER'], [])
  assert.equal((await GET(request(query, ordinary), params(first))).status, 403)
  assert.equal((await GET(request(query, admin), params('missing-agent'))).status, 404)
  for (const invalid of ['from=2031-02-30&to=2031-03-01', 'from=2031-03-22&to=2031-03-21']) {
    assert.equal((await GET(request(invalid, admin), params(first))).status, 400)
    assert.equal((await customers(request(invalid, admin))).status, 400)
  }
  const listedAgents = await agentList(request('limit=100', admin))
  assert.equal(listedAgents.status, 200)
  const listData = (await listedAgents.json()).data
  for (const agentId of [first, second]) {
    const row = listData.find((item: { id: string }) => item.id === agentId)
    assert.ok(row)
    assert.equal(row.stats.registeredCustomers, await db.salesCustomer.count({ where: { salesPartnerId: row.userId } }))
    assert.equal(row.stats.paidCommission, (await db.commission.aggregate({ where: { agentId: row.userId, status: 'PAID' }, _sum: { amount: true } }))._sum.amount ?? 0)
  }
  const before = await Promise.all([db.commission.count(), db.settlement.count(), db.auditLog.count()])
  for (const [index, id] of [first, second].entries()) {
    const response = await GET(request(query, admin), params(id))
    assert.equal(response.status, 200)
    const data = (await response.json()).data
    assert.equal(data.agent.id, id)
    assert.equal(data.customerStats.registeredCustomersCount, 1)
    assert.equal(data.customerStats.paidCustomersCount, 1)
    assert.equal(data.customerStats.finalConfirmedCustomersCount, 1)
    assert.equal(data.commissionStats.totalCommissionAmount, (index + 1) * 111)
    assert.equal(data.commissionRecords.length, 1)
    assert.equal(data.settlementRecords.length, 1)
    assert.equal(data.settlementRecords[0].amount, (index + 1) * 11)
    assert.deepEqual(data.customerRecords.map((row: { id: string }) => row.id), [`codex01a-scope-customer-${index}`])
    for (const row of data.customerRecords) assert.ok(!('mobile' in row) && !('nationalCode' in row))
    const owner = index ? second : 'codex01b-agent'
    assert.equal(data.referral.code, generateReferralCode(owner))
    assert.equal(data.referral.link, '/auth/login?ref=' + data.referral.code)
    assert.deepEqual(await findApprovedAgentByReferralCode(db, data.referral.code), { id: owner })
  }
  const sales = await customers(request(query + '&take=50', admin))
  assert.equal(sales.status, 200)
  const salesIds = (await sales.json()).data.map((row: { id: string }) => row.id).sort()
  assert.deepEqual(salesIds, ['codex01a-scope-customer-0', 'codex01a-scope-customer-1'])
  const agentJwt = await generateAccessToken('codex01b-agent', ['AGENT'], [])
  const ownSales = await customers(request(query + '&salesPartnerId=' + second, agentJwt))
  assert.equal(ownSales.status, 200)
  assert.deepEqual((await ownSales.json()).data.map((row: { id: string }) => row.id), ['codex01a-scope-customer-0'])
  await db.agent.update({ where: { id: second }, data: { status: 'PENDING' } })
  assert.equal((await (await GET(request(query, admin), params(second))).json()).data.referral.link, null)
  await db.agent.update({ where: { id: second }, data: { status: 'APPROVED' } })
  await db.user.update({ where: { id: second }, data: { status: 'SUSPENDED' } })
  assert.equal((await (await GET(request(query, admin), params(second))).json()).data.referral.link, null)
  assert.deepEqual(await Promise.all([db.commission.count(), db.settlement.count(), db.auditLog.count()]), before)
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', passed: [
    'Per-agent customers, commissions and settlements remain isolated with two populated agents',
    'Tehran calendar-day boundaries and invalid/reversed dates on both APIs',
    '401/403/404 retained; AGENT cannot override customer owner via query',
    'Existing HMAC referral resolves to the same approved active agent; pending/suspended link withheld',
    'Reads do not mutate commissions/settlements/audit; no contact/identity fields in scoped customer rows',
  ] }, null, 2))
} finally { await db.$disconnect() }
