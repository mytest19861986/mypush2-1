import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { PrismaClient, Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { PUT } = await import('../src/app/api/v1/users/profile/route')
const { linkPlanHolderToUserByNationalCode: link } = await import('../src/lib/plan-holder-linking')
const { generateAccessToken } = await import('../src/lib/jwt')
const checks: Array<{ test: string; status: string; evidence: unknown }> = []
function pass(test: string, evidence: unknown) { checks.push({ test, status: 'PASS', evidence }) }
const users = ['codex08-a', 'codex08-b', 'codex08-c']
const tokens: string[] = []
function request(index: number, body: unknown) {
  return new NextRequest('http://isolated.invalid/api/v1/users/profile', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${tokens[index]}` }, body: JSON.stringify(body) })
}
async function snapshot() {
  return createHash('sha256').update(JSON.stringify(await Promise.all([
    db.userProfile.findMany({ orderBy: { id: 'asc' } }), db.planHolder.findMany({ orderBy: { id: 'asc' } }),
    db.contract.findMany({ orderBy: { id: 'asc' } }), db.visit.findMany({ orderBy: { id: 'asc' } }), db.userPlan.findMany({ orderBy: { id: 'asc' } }),
    db.wallet.findMany({ orderBy: { id: 'asc' } }), db.walletTransaction.findMany({ orderBy: { id: 'asc' } }), db.settlement.findMany({ orderBy: { id: 'asc' } }),
    db.auditLog.findMany({ where: { userId: { in: users } }, orderBy: { id: 'asc' } }),
  ]))).digest('hex')
}
async function holder(id: string, code: string, owner: string | null, status = 'ACTIVE') {
  await db.planHolder.create({ data: { id, nationalCode: code, userId: owner, status } })
}
async function plan(id: string, holderId: string, owner: string | null, status = 'ACTIVE', endDate = new Date('2035-01-01')) {
  await db.userPlan.create({ data: { id, planHolderId: holderId, userId: owner, planId: 'codex01b-plan', status, endDate, remainingUses: 3, totalUses: 0 } })
}
async function denied(index: number, body: unknown, status: number, code: string) {
  const before = await snapshot()
  const response = await PUT(request(index, body))
  assert.equal(response.status, status)
  assert.equal((await response.json()).error.code, code)
  assert.equal(await snapshot(), before)
  return { status, code, unchangedHash: before }
}
try {
  for (let i = 0; i < users.length; i++) {
    await db.user.create({ data: { id: users[i], mobile: `0999908000${i}`, isMobileVerified: true, roles: { create: { role: { connect: { name: 'USER' } } } } } })
    tokens.push(await generateAccessToken(users[i], ['USER'], []))
  }
  await db.userProfile.create({ data: { userId: users[0], firstName: 'Before', address: 'Before', nationalCode: '0000000800' } })
  await holder('codex08-other', '0000000801', users[1])
  await plan('codex08-other-plan', 'codex08-other', users[1])
  pass('conflict-update-atomic', await denied(0, { firstName: 'Rejected', address: 'Rejected', nationalCode: '0000000801' }, 409, 'PLAN_HOLDER_LINK_CONFLICT'))
  pass('conflict-create-atomic', await denied(2, { firstName: 'Rejected', nationalCode: '0000000801' }, 409, 'PLAN_HOLDER_LINK_CONFLICT'))
  assert.equal(await db.userProfile.count({ where: { userId: users[2] } }), 0)
  await holder('codex08-unowned', '0000000802', null)
  await plan('codex08-unowned-active', 'codex08-unowned', null)
  await plan('codex08-unowned-cancelled', 'codex08-unowned', null, 'CANCELLED')
  await plan('codex08-unowned-expired', 'codex08-unowned', null, 'ACTIVE', new Date('2020-01-01'))
  pass('national-code-mobile-verification-not-proof', await denied(0, { firstName: 'Rejected', nationalCode: '0000000802' }, 403, 'IDENTITY_PROOF_REQUIRED'))
  pass('retry-no-new-ownership', await denied(0, { nationalCode: '0000000802' }, 403, 'IDENTITY_PROOF_REQUIRED'))
  const beforeHelper = await snapshot()
  const direct = await link({ userId: users[0], nationalCode: '0000000802' })
  assert.equal(direct.requiresIdentityProof, true); assert.equal(direct.linked, false)
  assert.equal(await snapshot(), beforeHelper)
  pass('direct-helper-fail-closed', direct)
  const beforeRace = await snapshot()
  const race = await Promise.all([PUT(request(0, { nationalCode: '0000000802' })), PUT(request(2, { nationalCode: '0000000802' }))])
  assert.ok(race.every(r => [403, 500].includes(r.status)))
  assert.equal(await snapshot(), beforeRace)
  pass('concurrent-competing-claims-no-mutation', { statuses: race.map(r => r.status), unchangedHash: beforeRace, note: 'SQLite may reject a concurrent writer; no automatic retry or successful ownership assignment.' })
  const echo = await PUT(request(0, { nationalCode: '0000000800', firstName: 'Echo allowed' }))
  assert.equal(echo.status, 200)
  assert.equal((await echo.json()).data.planHolderLinked, false)
  pass('current-code-echo-without-holder', '200; profile saved without linkage')
  await holder('codex08-owned', '0000000803', users[0])
  await plan('codex08-owned-active', 'codex08-owned', users[0])
  await plan('codex08-owned-cancelled', 'codex08-owned', null, 'CANCELLED')
  // Historical identity/ownership fixture, not an identity-change API operation.
  await db.userProfile.update({ where: { userId: users[0] }, data: { nationalCode: '0000000803' } })
  const existing = await PUT(request(0, { nationalCode: '0000000803', firstName: 'Accepted' }))
  assert.equal(existing.status, 200)
  const existingBody = await existing.json()
  assert.equal(existingBody.data.planHolderLinked, false); assert.equal(existingBody.data.linkedPlansCount, 0)
  assert.equal((await db.userProfile.findUniqueOrThrow({ where: { userId: users[0] } })).firstName, 'Accepted')
  assert.equal((await db.userPlan.findUniqueOrThrow({ where: { id: 'codex08-owned-cancelled' } })).userId, null)
  pass('existing-owner-profile-compatibility-no-new-link', { status: 200, linked: false, cancelledPlanUnchanged: true })
  const retry = await PUT(request(0, { nationalCode: '0000000803', firstName: 'Accepted' }))
  assert.equal(retry.status, 200)
  assert.equal((await db.planHolder.findUniqueOrThrow({ where: { id: 'codex08-owned' } })).userId, users[0])
  pass('existing-owner-retry', '200; no ownership transfer or additional plan assignment')
  await plan('codex08-owned-unassigned', 'codex08-owned', null)
  const echoWithUnassigned = await PUT(request(0, { nationalCode: '0000000803', firstName: 'Echo with unassigned plan' }))
  assert.equal(echoWithUnassigned.status, 200)
  assert.equal((await echoWithUnassigned.json()).data.planHolderLinked, false)
  assert.equal((await db.userPlan.findUniqueOrThrow({ where: { id: 'codex08-owned-unassigned' } })).userId, null)
  pass('current-code-echo-with-unassigned-active-plan', '200; normal save does not attempt or create a link')
  pass('identity-change-with-no-matching-holder', await denied(0, { nationalCode: '0000000899', firstName: 'Rejected' }, 403, 'IDENTITY_PROOF_REQUIRED'))
  pass('identity-clear-blocked', await denied(0, { nationalCode: '', firstName: 'Rejected' }, 403, 'IDENTITY_PROOF_REQUIRED'))
  const noCode = await PUT(request(2, { firstName: 'Profile without identity' }))
  assert.equal(noCode.status, 200)
  assert.equal((await db.userProfile.findUniqueOrThrow({ where: { userId: users[2] } })).nationalCode, null)
  pass('create-normal-profile-without-national-code', '200; nullable national code retained, no substitute value')
  await holder('codex08-inactive', '0000000804', null, 'INACTIVE')
  await plan('codex08-inactive-plan', 'codex08-inactive', null)
  const inactive = await link({ userId: users[0], nationalCode: '0000000804' })
  assert.equal(inactive.linked, false)
  assert.equal((await db.userPlan.findUniqueOrThrow({ where: { id: 'codex08-inactive-plan' } })).userId, null)
  pass('inactive-holder-not-linked', inactive)
  const simple = await PUT(request(0, { firstName: 'Ordinary', address: 'Ordinary' }))
  assert.equal(simple.status, 200)
  assert.equal((await db.userProfile.findUniqueOrThrow({ where: { userId: users[0] } })).firstName, 'Ordinary')
  pass('ordinary-profile-update', '200 persisted; no national code supplied and no link attempted')
  pass('invalid-national-code', await denied(0, { nationalCode: '123' }, 400, 'VALIDATION_ERROR'))
  const original = db.$transaction.bind(db)
  // Inject a database query failure after the real profile write, inside its real transaction.
  const beforeFailure = await snapshot()
  Object.assign(db, { $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => original(async tx => callback(new Proxy(tx, { get(target, key) {
    if (key === 'auditLog') return new Proxy(target.auditLog, { get(delegate, method) {
      if (method === 'create') return () => Promise.reject(new Error('synthetic audit store outage'))
      const value = Reflect.get(delegate, method); return typeof value === 'function' ? value.bind(delegate) : value
    } })
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value
  } }))) })
  try { assert.equal((await PUT(request(0, { firstName: 'Must rollback' }))).status, 500) }
  finally { Object.assign(db, { $transaction: original }) }
  assert.equal(await snapshot(), beforeFailure)
  pass('database-failure-after-profile-write-rolls-back', { status: 500, unchangedHash: beforeFailure, injection: 'auditLog.create rejected within actual Prisma transaction' })
  checks.push({ test: 'independent-identity-and-live-provider', status: 'NOT VERIFIED', evidence: 'No accepted identity proof, new positive link, clinical consent or live operation implemented.' })
  console.log(JSON.stringify({ checks }, null, 2))
} finally { await db.$disconnect() }
