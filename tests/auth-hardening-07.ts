import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { authenticateRequest, requireAuth, requireRole, requirePermission, requireAnyPermission, canManagePayments } = await import('../src/lib/auth')
const { generateAccessToken } = await import('../src/lib/jwt')
const { PATCH } = await import('../src/app/api/v1/contracts/[id]/route')
const { POST: contracts } = await import('../src/app/api/v1/contracts/route')
const { POST: visits } = await import('../src/app/api/v1/visits/route')
const { canPayCommissions } = await import('../src/lib/commission-permissions')
const { getCurrentCommissionPaymentAccess } = await import('../src/lib/commission-payment-access')
const checks: Array<{ test: string; status: string; expected: unknown; actual: unknown }> = []
function pass(test: string, expected: unknown, actual: unknown) { checks.push({ test, status: 'PASS', expected, actual }) }
function request(token?: string, body?: unknown, header = 'x-app-authorization') {
  return new NextRequest('http://isolated.invalid/api/v1/contracts/codex01b-existing-a', { method: body === undefined ? 'GET' : 'PATCH', headers: { 'content-type': 'application/json', 'x-user-role': 'SUPER_ADMIN', 'x-user-id': 'codex01b-admin', ...(token ? { [header]: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}
const params = { params: Promise.resolve({ id: 'codex01b-existing-a' }) }
async function domainHash() {
  return createHash('sha256').update(JSON.stringify(await Promise.all([
    db.contract.findMany({ orderBy: { id: 'asc' } }), db.visit.findMany({ orderBy: { id: 'asc' } }), db.userPlan.findMany({ orderBy: { id: 'asc' } }),
    db.wallet.findMany({ orderBy: { id: 'asc' } }), db.walletTransaction.findMany({ orderBy: { id: 'asc' } }), db.settlement.findMany({ orderBy: { id: 'asc' } }),
  ]))).digest('hex')
}
async function actor(id: string, roleName: string, permissions: string[]) {
  const role = await db.role.upsert({ where: { name: roleName }, create: { name: roleName, title: roleName }, update: {} })
  for (const name of permissions) {
    const permission = await db.permission.upsert({ where: { name }, create: { name, title: name, module: 'auth07' }, update: {} })
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, create: { roleId: role.id, permissionId: permission.id }, update: {} })
  }
  const count = await db.user.count({ where: { id: { startsWith: 'codex07-' } } })
  await db.user.create({ data: { id, mobile: `0999907${String(count).padStart(4, '0')}`, roles: { create: { roleId: role.id } } } })
  return role
}
try {
  const before = await domainHash()
  const expired = await new SignJWT({ sub: 'codex01b-doctor', roles: ['DOCTOR'], permissions: [] }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1).sign(new TextEncoder().encode(process.env.JWT_SECRET!))
  for (const token of [undefined, 'invalid', expired]) {
    const result = await authenticateRequest(request(token))
    assert.equal(result.authenticated, false)
    assert.equal(result.payload, null)
    assert.equal((await PATCH(request(token, { status: 'COMPLETED' }), params)).status, 401)
  }
  pass('missing-invalid-expired-and-forged-identity', 'Unauthenticated; PATCH401; forged headers ignored', 'Matched all3 variants')
  const absent = await generateAccessToken('codex07-absent', ['SUPER_ADMIN'], ['*'])
  assert.equal((await authenticateRequest(request(absent))).authenticated, false)
  pass('missing-account', false, false)
  await actor('codex07-account', 'CODEX07_ACCOUNT', [])
  const accountToken = await generateAccessToken('codex07-account', ['CODEX07_ACCOUNT'], [])
  for (const status of ['INACTIVE', 'BLOCKED']) {
    await db.user.update({ where: { id: 'codex07-account' }, data: { status } })
    assert.equal((await authenticateRequest(request(accountToken))).authenticated, false)
  }
  await db.user.update({ where: { id: 'codex07-account' }, data: { status: 'ACTIVE', deletedAt: new Date() } })
  assert.equal((await authenticateRequest(request(accountToken))).authenticated, false)
  await db.user.update({ where: { id: 'codex07-account' }, data: { deletedAt: null } })
  pass('inactive-blocked-soft-deleted', 'All denied', 'All denied')
  const doctorToken = await generateAccessToken('codex01b-doctor', ['DOCTOR'], [])
  const doctorRole = await db.role.findUniqueOrThrow({ where: { name: 'DOCTOR' } })
  await db.userRole.deleteMany({ where: { userId: 'codex01b-doctor', roleId: doctorRole.id } })
  assert.equal((await requireRole(request(doctorToken), 'DOCTOR')).authorized, false)
  assert.equal((await PATCH(request(doctorToken, { doctorNote: 'must not persist' }), params)).status, 403)
  await db.userRole.create({ data: { userId: 'codex01b-doctor', roleId: doctorRole.id } })
  pass('revoked-DOCTOR-stale-JWT', 'Role denied; contained PATCH403', 'Role denied; PATCH403')
  const scopedRole = await actor('codex07-scoped', 'CODEX07_SCOPED', ['codex07_read'])
  const scopedToken = await generateAccessToken('codex07-scoped', ['CODEX07_SCOPED'], ['codex07_read', 'codex07_removed'])
  assert.equal((await requirePermission(request(scopedToken), 'codex07_read')).authorized, true)
  assert.equal((await requirePermission(request(scopedToken), 'codex07_removed')).authorized, false)
  assert.equal((await requireAnyPermission(request(scopedToken), ['codex07_removed', 'manage_commission_payments'])).authorized, false)
  const permission = await db.permission.findUniqueOrThrow({ where: { name: 'codex07_read' } })
  await db.rolePermission.deleteMany({ where: { roleId: scopedRole.id, permissionId: permission.id } })
  assert.equal((await requirePermission(request(scopedToken), 'codex07_read')).authorized, false)
  pass('revoked-and-ungranted-permission', 'Current DB revocation overrides stale permission claims', 'Denied with same JWT after revoke')
  const staleAdmin = await generateAccessToken('codex07-scoped', ['SUPER_ADMIN'], ['*'])
  const staleResult = await authenticateRequest(request(staleAdmin))
  assert.equal(staleResult.authenticated, true)
  assert.deepEqual(staleResult.payload!.roles, [])
  assert.equal((await requirePermission(request(staleAdmin), 'manage_users')).authorized, false)
  assert.equal(canPayCommissions(staleResult.payload!), false)
  pass('stale-admin-wildcard-and-role-header', 'No inherited admin/payment privileges', 'No privileges')
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    const id = `codex07-${role.toLowerCase()}`
    await actor(id, role, [])
    const token = await generateAccessToken(id, [role], [])
    assert.equal((await requirePermission(request(token), 'codex07_unlisted')).authorized, true)
    assert.equal((await requireAnyPermission(request(token), ['codex07_unlisted'])).authorized, true)
    assert.equal(canPayCommissions((await authenticateRequest(request(token))).payload!), true)
  }
  pass('full-admin-authority-preserved', 'Current ADMIN and SUPER_ADMIN retain existing full access', 'Both retain access')
  await actor('codex07-review', 'CODEX07_REVIEW', ['manage_commissions'])
  await actor('codex07-payer', 'CODEX07_PAYER', ['manage_commission_payments'])
  for (const kind of ['review', 'payer']) {
    const token = await generateAccessToken(`codex07-${kind}`, [`CODEX07_${kind.toUpperCase()}`], ['manage_commissions', 'manage_commission_payments', 'manage_payments'])
    const auth = await authenticateRequest(request(token))
    assert.equal(canPayCommissions(auth.payload!), kind === 'payer')
    assert.equal(canManagePayments(auth.payload!), false)
    assert.equal((await requirePermission(request(token), 'manage_commissions')).authorized, kind === 'review')
    const independent = await getCurrentCommissionPaymentAccess(request(token))
    assert.equal(canPayCommissions(independent.payload!), kind === 'payer')
  }
  pass('independent-payment-scope', 'Review is not payment; payment is not general payment/admin access', 'Shared and independent guards agree')
  await actor('codex07-wide', 'CODEX07_WIDE', ['*'])
  const narrow = await generateAccessToken('codex07-wide', ['CODEX07_WIDE'], ['codex07_read'])
  assert.equal((await requirePermission(request(narrow), 'codex07_read')).authorized, true)
  assert.equal((await requirePermission(request(narrow), 'codex07_write')).authorized, false)
  const wideToken = await generateAccessToken('codex07-review', ['CODEX07_REVIEW'], ['*'])
  const wideAuth = await authenticateRequest(request(wideToken))
  assert.deepEqual(wideAuth.payload!.permissions, ['manage_commissions'])
  pass('wildcard-intersection', 'Neither current DB nor JWT wildcard widens the other bound', 'Both directions bounded')
  for (const label of ['account-read', 'role-read']) {
    const original = db.user.findUnique
    const failure = new Error(`Synthetic ${label} database failure`)
    Object.assign(db.user, { findUnique: () => Promise.reject(failure) })
    try {
      assert.equal((await authenticateRequest(request(doctorToken))).authenticated, false)
      assert.equal((await requireRole(request(doctorToken), 'DOCTOR')).authorized, false)
      assert.equal((await requirePermission(request(doctorToken), 'manage_users')).authorized, false)
      await assert.rejects(() => requireAuth(request(doctorToken)))
      assert.equal((await PATCH(request(doctorToken, { status: 'COMPLETED' }), params)).status, 401)
    } finally { Object.assign(db.user, { findUnique: original }) }
  }
  pass('authorization-query-failure', 'Fail closed for unavailable unified account/role read', 'No helper/route accepted; query-boundary fault injection, not physical outage')
  const headers = request(doctorToken, undefined, 'authorization')
  assert.equal((await requireRole(headers, 'DOCTOR')).authorized, true)
  assert.equal((await requireRole(request(doctorToken), 'DOCTOR')).authorized, true)
  assert.equal((await PATCH(request(doctorToken, { status: 'COMPLETED' }), params)).status, 403)
  assert.equal((await contracts(request(doctorToken, { consent: true }))).status, 403)
  assert.equal((await visits(request(doctorToken, { consent: true }))).status, 403)
  pass('header-and-clinical-containment-regression', 'Both headers work; status and creations remain403', 'Matched')
  const after = await domainHash()
  assert.equal(after, before)
  pass('denied-domain-preservation', before, after)
  checks.push({ test: 'live-provider-and-positive-consent', status: 'NOT VERIFIED', expected: 'Separate approved release/consent evidence', actual: 'No live operation or positive consent implementation' })
  console.log(JSON.stringify({ checks }, null, 2))
} finally { await db.$disconnect() }
