import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { GET, POST } = await import('../src/app/api/v1/contracts/route')
const { PATCH } = await import('../src/app/api/v1/admin/settlements/[id]/status/route')

const ids = {
  doctor: 'codex01b-doctor', secondDoctor: 'codex01b-doctor-two',
  patient: 'codex01b-patient', agent: 'codex01b-agent', admin: 'codex01b-admin',
}
const checks: Array<{ test: string; status: 'PASS' | 'NOT VERIFIED'; detail: string }> = []
function pass(test: string, detail: string) { checks.push({ test, status: 'PASS', detail }) }

async function request(method: string, userId?: string, roles: string[] = [], body?: unknown, tokenOverride?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json', 'x-user-role': 'SUPER_ADMIN', 'x-user-id': ids.admin,
  }
  if (userId) headers['x-app-authorization'] = `Bearer ${tokenOverride ?? await generateAccessToken(userId, roles, [])}`
  return new NextRequest('http://localhost/api/v1/contracts', {
    method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function stateHash() {
  const state = await Promise.all([
    db.contract.findMany({ orderBy: { id: 'asc' } }),
    db.userPlan.findMany({ orderBy: { id: 'asc' } }),
    db.visit.findMany({ orderBy: { id: 'asc' } }),
    db.settlement.findMany({ orderBy: { id: 'asc' } }),
    db.wallet.findMany({ orderBy: { id: 'asc' } }),
    db.walletTransaction.findMany({ orderBy: { id: 'asc' } }),
  ])
  return createHash('sha256').update(JSON.stringify(state)).digest('hex')
}

try {
  let phoneIndex = 1
  for (const [name, userId] of Object.entries(ids)) {
    const role = name.includes('Doctor') || name === 'doctor' ? 'DOCTOR' : name === 'admin' ? 'SUPER_ADMIN' : name === 'agent' ? 'AGENT' : 'USER'
    await db.user.create({ data: {
      id: userId, mobile: `0999990${String(phoneIndex++).padStart(4, '0')}`, status: 'ACTIVE',
      profile: { create: { firstName: 'آزمون', lastName: name } },
      roles: { create: { role: { connectOrCreate: { where: { name: role }, create: { name: role, title: role } } } } },
    } })
  }
  const doctor = await db.doctor.create({ data: { id: 'codex01b-physician', userId: ids.doctor, status: 'APPROVED' } })
  const secondDoctor = await db.doctor.create({ data: { id: 'codex01b-physician-two', userId: ids.secondDoctor, status: 'APPROVED' } })
  const plan = await db.discountPlan.create({ data: { id: 'codex01b-plan', name: 'طرح ساختگی امنیت قرارداد', maxUses: 5, discountPercent: 10 } })
  const holder = await db.planHolder.create({ data: { id: 'codex01b-holder', userId: ids.patient, nationalCode: '0000000101', firstName: 'آزمون' } })
  const limited = await db.userPlan.create({ data: {
    id: 'codex01b-limited', userId: ids.patient, planHolderId: holder.id, planId: plan.id,
    endDate: new Date('2035-01-01T00:00:00Z'), remainingUses: 5, totalUses: 0,
  } })
  const unlimited = await db.userPlan.create({ data: {
    id: 'codex01b-unlimited', userId: ids.patient, planHolderId: holder.id, planId: plan.id,
    endDate: new Date('2035-01-01T00:00:00Z'), remainingUses: -1, totalUses: 3,
  } })
  await db.contract.create({ data: { id: 'codex01b-existing-a', userId: ids.patient, userPlanId: limited.id, doctorId: doctor.id, totalAmount: 100000 } })
  await db.contract.create({ data: { id: 'codex01b-existing-b', userId: ids.patient, userPlanId: limited.id, doctorId: secondDoctor.id, totalAmount: 200000 } })
  const before = await stateHash()
  const body = { patientId: ids.patient, userPlanId: limited.id, totalAmount: 100000 }

  assert.equal((await POST(await request('POST', undefined, [], body))).status, 401)
  assert.equal((await POST(await request('POST', ids.doctor, ['DOCTOR'], body, 'invalid-signature'))).status, 401)
  const expired = await new SignJWT({ sub: ids.doctor, roles: ['DOCTOR'], permissions: [] })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET!))
  assert.equal((await POST(await request('POST', ids.doctor, ['DOCTOR'], body, expired))).status, 401)
  pass('contract-authentication', 'Missing/invalid/expired JWT rejected; forged actor headers grant no access.')

  for (const [userId, role] of [[ids.patient, 'USER'], [ids.agent, 'AGENT'], [ids.admin, 'SUPER_ADMIN']]) {
    assert.equal((await POST(await request('POST', userId, [role], body))).status, 403)
  }
  pass('contract-role-boundary', 'Patient/agent/admin cannot create a doctor contract through the legacy endpoint.')

  for (const candidate of [body, { ...body, userPlanId: unlimited.id }, { ...body, consent: true, otpVerified: true, status: 'CONFIRMED', confirmedAt: new Date().toISOString() }]) {
    const response = await POST(await request('POST', ids.doctor, ['DOCTOR'], candidate))
    assert.equal(response.status, 403)
    assert.equal((await response.json()).error.code, 'PATIENT_CONSENT_REQUIRED')
  }
  pass('unverified-consent', 'Limited/unlimited plans and caller-supplied consent claims all rejected before writes.')

  const concurrent = await Promise.all(Array.from({ length: 8 }, async () => POST(await request('POST', ids.doctor, ['DOCTOR'], body))))
  assert.deepEqual(concurrent.map(response => response.status), Array(8).fill(403))
  assert.equal((await POST(await request('POST', ids.doctor, ['DOCTOR'], body))).status, 403)
  pass('concurrent-and-repeated-requests', 'Eight concurrent requests plus retry produce no contract or double debit.')

  assert.equal((await GET(await request('GET'))).status, 401)
  assert.equal((await GET(await request('GET', ids.agent, ['AGENT']))).status, 403)
  for (const [userId, expected] of [[ids.doctor, 'codex01b-existing-a'], [ids.secondDoctor, 'codex01b-existing-b']]) {
    const response = await GET(await request('GET', userId, ['DOCTOR']))
    assert.equal(response.status, 200)
    const json = await response.json()
    assert.equal(json.success, true)
    assert.deepEqual(json.data.map((row: { id: string }) => row.id), [expected])
    assert.equal(typeof json.data[0].createdAt, 'string')
    assert.equal(typeof json.data[0].planName, 'string')
  }
  pass('existing-contract-get', 'Existing response envelope/fields retained and each doctor sees only their own fixture contract.')

  const params = { params: Promise.resolve({ id: 'codex01b-nonexistent-settlement' }) }
  assert.equal((await PATCH(await request('PATCH', undefined, [], { action: 'PAY' }), params)).status, 401)
  assert.equal((await PATCH(await request('PATCH', ids.agent, ['AGENT'], { action: 'PAY' }), params)).status, 403)
  for (const action of ['APPROVE', 'PAY', 'REJECT']) {
    const response = await PATCH(await request('PATCH', ids.admin, ['SUPER_ADMIN'], { action }), params)
    assert.equal(response.status, 409)
    assert.equal((await response.json()).code, 'DOCTOR_SETTLEMENT_DISABLED_MODEL_B')
  }
  pass('settlement-security-and-model-b', 'Signed authorization enforced; spoofed role headers rejected; Model B never activates a payout.')

  assert.equal(await stateHash(), before)
  pass('persistent-data-invariant', 'All contract/plan/visit/settlement/wallet rows unchanged after all requests.')
  checks.push({ test: 'positive-contract-bound-consent', status: 'NOT VERIFIED', detail: 'No approved verifiable consent proof exists for legacy contract creation; no positive registration or consumption claim is made.' })
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', checks }, null, 2))
} finally {
  await db.$disconnect()
}
