import { strict as assert } from 'node:assert'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { GET, PATCH } = await import('../src/app/api/v1/admin/users/[id]/roles/route')
const { canManageCommissionPayments } = await import('../src/lib/wallets')
const { generateAccessToken } = await import('../src/lib/jwt')
const admin = await generateAccessToken('codex01b-admin', ['SUPER_ADMIN'], [])
const target = 'codex01b-agent'
const params = { params: Promise.resolve({ id: target }) }
const request = (token?: string, roleNames?: unknown) => new NextRequest('http://localhost/api/v1/admin/users/' + target + '/roles', {
  method: roleNames === undefined ? 'GET' : 'PATCH', headers: { 'content-type': 'application/json', ...(token ? { 'x-app-authorization': `Bearer ${token}` } : {}), 'x-user-role': 'SUPER_ADMIN' },
  ...(roleNames === undefined ? {} : { body: JSON.stringify({ roleNames }) }),
})
const assigned = async () => (await db.userRole.findMany({ where: { userId: target }, include: { role: true } })).map(link => link.role.name).sort()
try {
  const custom = await db.role.create({ data: { name: 'CODEX_COMMISSION_REVIEWER', title: 'بررسی پورسانت ساختگی' } })
  const permission = await db.permission.upsert({ where: { name: 'manage_commissions' }, update: {}, create: { name: 'manage_commissions', title: 'مدیریت پورسانت', module: 'commissions' } })
  await db.rolePermission.create({ data: { roleId: custom.id, permissionId: permission.id } })
  assert.equal((await GET(request(), params)).status, 401)
  const stale = await generateAccessToken('codex01b-patient', ['SUPER_ADMIN'], ['manage_roles'])
  assert.equal((await GET(request(stale), params)).status, 403)
  assert.equal((await PATCH(request(stale, [custom.name]), params)).status, 403)
  const read = await GET(request(admin), params)
  assert.equal(read.status, 200)
  const state = (await read.json()).data
  assert.ok(state.roles.find((role: { name: string; protected: boolean }) => role.name === 'AGENT' && role.protected))
  assert.deepEqual(state.roles.find((role: { name: string }) => role.name === custom.name).permissions, [{ name: permission.name, title: permission.title }])
  for (const invalid of [['SUPER_ADMIN'], ['DOCTOR'], ['ADMIN'], ['UNKNOWN_ROLE'], 'not-array']) assert.equal((await PATCH(request(admin, invalid), params)).status, 400)
  const baseline = await assigned()
  const granted = await PATCH(request(admin, [...baseline, custom.name]), params)
  assert.equal(granted.status, 200)
  assert.ok((await assigned()).includes('AGENT'))
  assert.ok((await assigned()).includes(custom.name))
  assert.equal(canManageCommissionPayments({ roles: ['AGENT'], permissions: [permission.name] }), false)
  const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: target, action: 'ROLE_UPDATED' }, orderBy: { createdAt: 'desc' } })
  assert.equal(audit.userId, 'codex01b-admin')
  assert.ok(JSON.parse(audit.details!).newRoles.includes(custom.name))
  assert.equal((await PATCH(request(admin, []), params)).status, 200)
  assert.deepEqual(await assigned(), ['AGENT'])
  // A failed audit must abort the access change, even when the role write succeeds first.
  await db.$executeRawUnsafe(`CREATE TRIGGER codex01a_audit_failure BEFORE INSERT ON AuditLog WHEN NEW.action = 'ROLE_UPDATED' BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END`)
  try {
    assert.equal((await PATCH(request(admin, [custom.name]), params)).status, 500)
    assert.deepEqual(await assigned(), ['AGENT'])
  } finally { await db.$executeRawUnsafe('DROP TRIGGER codex01a_audit_failure') }
  const delegatedRole = await db.role.create({ data: { name: 'CODEX_ROLE_OPERATOR', title: 'مدیر نقش ساختگی' } })
  const manageRoles = await db.permission.upsert({ where: { name: 'manage_roles' }, update: {}, create: { name: 'manage_roles', title: 'مدیریت نقش', module: 'roles' } })
  const grant = await db.rolePermission.create({ data: { roleId: delegatedRole.id, permissionId: manageRoles.id } })
  await db.userRole.create({ data: { userId: 'codex01b-patient', roleId: delegatedRole.id } })
  const sameToken = await generateAccessToken('codex01b-patient', ['USER'], [])
  assert.equal((await GET(request(sameToken), params)).status, 200)
  await db.rolePermission.delete({ where: { id: grant.id } })
  assert.equal((await GET(request(sameToken), params)).status, 403)
  assert.equal((await PATCH(request(sameToken, [custom.name]), params)).status, 403)
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', passed: [
    'Minimal current role/permission read; absent and stale JWT privileges rejected',
    'Custom commission-management role preserves AGENT core role and does not grant wallet-payment authority',
    'Protected role escalation and invalid role inputs rejected; custom removal preserves protected role',
    'Actor audit verified; injected audit failure rolls role write back atomically',
    'Delegated manage_roles grant and revocation enforced with the same JWT',
  ] }, null, 2))
} finally { await db.$disconnect() }
