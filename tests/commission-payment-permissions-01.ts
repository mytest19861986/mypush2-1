import { strict as assert } from 'node:assert'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/payment-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { POST: pay } = await import('../src/app/api/v1/commissions/[id]/pay/route')
const { PATCH: approve } = await import('../src/app/api/v1/commissions/[id]/approve/route')
const { PATCH: cancel } = await import('../src/app/api/v1/commissions/[id]/cancel/route')
const { GET: detail } = await import('../src/app/api/v1/commissions/[id]/route')
const { GET: queue } = await import('../src/app/api/v1/commission-payments/route')
const { canManageCommissionPayments } = await import('../src/lib/wallets')
const matrix = [[], ['manage_commissions'], ['manage_commission_payments'], ['manage_commissions', 'manage_commission_payments']]
const tokens: string[] = []
const params = (id: string) => ({ params: Promise.resolve({ id }) })
function request(token?: string, method = 'POST') {
  return new NextRequest('http://localhost/api/v1/commissions/fixture/pay', { method, headers: {
    'x-user-role': 'SUPER_ADMIN', 'x-user-id': 'codex01b-admin', 'content-type': 'application/json',
    ...(token ? { 'x-app-authorization': `Bearer ${token}` } : {}),
  }, ...(method === 'POST' || method === 'PATCH' ? { body: '{}' } : {}) })
}
async function createCommission(id: string, status = 'APPROVED') {
  await db.commission.create({ data: { id, agentId: 'codex01b-agent', userPlanId: 'codex01b-limited', amount: 113, status } })
}
async function moneyState() {
  return {
    balance: (await db.wallet.findUnique({ where: { userId: 'codex01b-agent' } }))?.balance ?? 0,
    credits: await db.walletTransaction.count({ where: { referenceType: 'COMMISSION' } }),
  }
}
try {
  assert.equal(canManageCommissionPayments({ roles: ['USER'], permissions: ['manage_commissions'] }), false)
  assert.equal(canManageCommissionPayments({ roles: ['USER'], permissions: ['manage_commission_payments'] }), true)
  assert.equal(canManageCommissionPayments({ roles: ['ADMIN'], permissions: [] }), true, 'Existing full-admin authority is preserved, not newly granted')
  for (const [index, permissions] of matrix.entries()) {
    const role = await db.role.create({ data: { name: `CODEXPAY_${index}`, title: `نقش آزمایشی پرداخت ${index}` } })
    for (const name of permissions) {
      const permission = await db.permission.upsert({ where: { name }, update: {}, create: { name, module: 'commissions', title: name } })
      await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
    }
    const actor = await db.user.create({ data: { id: `codexpay-actor-${index}`, mobile: `0999977000${index}`, status: 'ACTIVE', roles: { create: { roleId: role.id } } } })
    tokens.push(await generateAccessToken(actor.id, [role.name], permissions))
    const id = `codexpay-commission-${index}`
    await createCommission(id)
    const before = await moneyState()
    const response = await pay(request(tokens[index]), params(id))
    assert.equal(response.status, index < 2 ? 403 : 200)
    if (index < 2) {
      assert.deepEqual(await moneyState(), before)
      assert.equal((await db.commission.findUniqueOrThrow({ where: { id } })).status, 'APPROVED')
      assert.equal(await db.auditLog.count({ where: { entityId: id, action: 'COMMISSION_PAYMENT_DENIED', userId: actor.id } }), 1)
    } else {
      assert.equal((await moneyState()).balance, before.balance + 113)
      assert.equal((await moneyState()).credits, before.credits + 1)
      assert.equal(await db.walletTransaction.count({ where: { referenceType: 'COMMISSION', referenceId: id } }), 1)
      assert.equal(await db.auditLog.count({ where: { entityId: id, action: 'COMMISSION_PAID', userId: actor.id } }), 1)
      const once = await moneyState()
      assert.equal((await pay(request(tokens[index]), params(id))).status, 409)
      assert.deepEqual(await moneyState(), once)
    }
  }
  const pending = 'codexpay-review-pending'
  await createCommission(pending, 'PENDING')
  assert.equal((await detail(request(tokens[1], 'GET'), params(pending))).status, 200)
  assert.equal((await approve(request(tokens[1], 'PATCH'), params(pending))).status, 200)
  assert.equal((await pay(request(tokens[1]), params(pending))).status, 403)
  for (const operation of [detail, approve, cancel]) {
    const method = operation === detail ? 'GET' : 'PATCH'
    assert.equal((await operation(request(tokens[2], method), params(pending))).status, 403, 'Payment-only cannot manage/review commissions')
  }
  assert.equal((await pay(request(tokens[3]), params(pending))).status, 200)
  const beforeForged = await moneyState()
  assert.equal((await pay(request(), params(pending))).status, 401, 'Identity/role headers alone are never authentication')
  const staleAdmin = await generateAccessToken('codexpay-actor-0', ['ADMIN'], ['manage_commission_payments'])
  assert.equal((await pay(request(staleAdmin), params(pending))).status, 403, 'Current DB roles override stale JWT admin/payment claims')
  const missing = await generateAccessToken('codexpay-missing-user', ['SUPER_ADMIN'], ['manage_commission_payments'])
  assert.equal((await pay(request(missing), params(pending))).status, 401)
  assert.deepEqual(await moneyState(), beforeForged)
  assert.equal((await queue(request(undefined, 'GET'))).status, 401)
  for (const index of [0, 1]) assert.equal((await queue(request(tokens[index], 'GET'))).status, 403)
  for (const index of [2, 3]) {
    const response = await queue(request(tokens[index], 'GET'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.ok(body.data.items.length <= 20)
    for (const item of body.data.items) {
      assert.deepEqual(Object.keys(item).sort(), ['agentId', 'amount', 'createdAt', 'id'])
      const stored = await db.commission.findUniqueOrThrow({ where: { id: item.id } })
      assert.equal(stored.status, 'APPROVED')
      assert.equal(stored.paidAt, null)
      assert.ok(item.amount > 0)
    }
  }
  const expired = await new SignJWT({ roles: ['SUPER_ADMIN'], permissions: ['manage_commission_payments'] })
    .setProtectedHeader({ alg: 'HS256' }).setSubject('codexpay-actor-3')
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120).setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET!))
  assert.equal((await pay(request(expired), params(pending))).status, 401)
  assert.equal((await queue(request(expired, 'GET'))).status, 401)
  for (const name of ['ADMIN', 'SUPER_ADMIN']) {
    const role = await db.role.findUniqueOrThrow({ where: { name } })
    const actor = await db.user.create({ data: { id: `codexpay-full-${name}`, mobile: name === 'ADMIN' ? '09999770008' : '09999770009', status: 'ACTIVE', roles: { create: { roleId: role.id } } } })
    const fullToken = await generateAccessToken(actor.id, [name], [])
    const id = `codexpay-full-payment-${name}`
    await createCommission(id)
    assert.equal((await queue(request(fullToken, 'GET'))).status, 200)
    assert.equal((await pay(request(fullToken), params(id))).status, 200)
  }
  const concurrentId = 'codexpay-concurrent'
  await createCommission(concurrentId)
  const beforeConcurrent = await moneyState()
  const concurrent = await Promise.all([pay(request(tokens[3]), params(concurrentId)), pay(request(tokens[3]), params(concurrentId))])
  assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409])
  assert.equal((await moneyState()).balance, beforeConcurrent.balance + 113)
  assert.equal((await moneyState()).credits, beforeConcurrent.credits + 1)
  assert.equal(await db.walletTransaction.count({ where: { referenceType: 'COMMISSION', referenceId: concurrentId } }), 1)
  assert.equal(await db.auditLog.count({ where: { entityId: concurrentId, action: 'COMMISSION_PAID' } }), 1)
  const payRole = await db.role.findUniqueOrThrow({ where: { name: 'CODEXPAY_2' } })
  await db.rolePermission.deleteMany({ where: { roleId: payRole.id } })
  assert.equal((await pay(request(tokens[2]), params(pending))).status, 403, 'Revoked payment grant rejected with same JWT')
  assert.equal((await queue(request(tokens[2], 'GET'))).status, 403, 'Queue also checks current DB grants')
  await db.user.update({ where: { id: 'codexpay-actor-3' }, data: { status: 'SUSPENDED' } })
  assert.equal((await pay(request(tokens[3]), params(pending))).status, 401)
  await db.user.update({ where: { id: 'codexpay-actor-3' }, data: { status: 'ACTIVE', deletedAt: new Date() } })
  assert.equal((await pay(request(tokens[3]), params(pending))).status, 401)
  await db.user.update({ where: { id: 'codexpay-actor-3' }, data: { deletedAt: null } })
  const fault = 'codexpay-audit-fault'
  await createCommission(fault)
  const beforeFault = await moneyState()
  await db.$executeRawUnsafe("CREATE TRIGGER codexpay_audit_failure BEFORE INSERT ON AuditLog WHEN NEW.action = 'COMMISSION_PAID' BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END")
  try {
    assert.equal((await pay(request(tokens[3]), params(fault))).status, 500)
    assert.deepEqual(await moneyState(), beforeFault)
    assert.equal((await db.commission.findUniqueOrThrow({ where: { id: fault } })).status, 'APPROVED')
    assert.equal(await db.walletTransaction.count({ where: { referenceId: fault, referenceType: 'COMMISSION' } }), 0)
  } finally { await db.$executeRawUnsafe('DROP TRIGGER codexpay_audit_failure') }
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', result: 'PASS', matrix: ['none403', 'review-only: review200/payment403', 'payment-only: payment200/manage403', 'both: review200/payment200', 'forged headers401', 'stale JWT403', 'missing/suspended/deleted account401', 'same-token revocation403', 'repeat payment409/no duplicate credit', 'audit failure500/atomic rollback'], externalFinancialTransactions: false }, null, 2))
} finally { await db.$disconnect() }
