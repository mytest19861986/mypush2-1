import { strict as assert } from 'node:assert'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { GET } = await import('../src/app/api/v1/admin/dashboard-summary/route')
const request = (token?: string) => new NextRequest('http://localhost/api/v1/admin/dashboard-summary', { headers: {
  'x-user-role': 'SUPER_ADMIN', ...(token ? { 'x-app-authorization': `Bearer ${token}` } : {}),
} })
try {
  assert.equal((await GET(request())).status, 401)
  const stale = await generateAccessToken('codex01b-patient', ['SUPER_ADMIN'], ['*'])
  assert.equal((await GET(request(stale))).status, 403)
  const admin = await generateAccessToken('codex01b-admin', ['SUPER_ADMIN'], [])
  const response = await GET(request(admin))
  assert.equal(response.status, 200)
  const data = (await response.json()).data
  const active = await db.$queryRawUnsafe<Array<{ total: bigint }>>('SELECT COUNT(*) AS total FROM "User" WHERE "status" = \'ACTIVE\' AND "deletedAt" IS NULL')
  const approved = await db.$queryRawUnsafe<Array<{ total: bigint }>>('SELECT COUNT(*) AS total FROM "Doctor" d JOIN "User" u ON u.id=d.userId WHERE d.status=\'APPROVED\' AND u.status=\'ACTIVE\' AND u.deletedAt IS NULL')
  assert.equal(data.activeAccounts, Number(active[0].total))
  assert.equal(data.approvedDoctors, Number(approved[0].total))
  assert.equal(data.pendingApplications, data.pendingDoctors + data.pendingAgents)
  assert.ok(data.recentDoctors.length <= 5)
  assert.ok(data.recentUsers.length <= 5)
  for (const row of [...data.recentDoctors, ...data.recentUsers]) {
    assert.deepEqual(Object.keys(row).sort(), ['createdAt', 'id', 'name', 'status'])
    assert.ok(Number.isFinite(new Date(row.createdAt).getTime()))
  }
  const role = await db.role.findUniqueOrThrow({ where: { name: 'CODEX_CALL_VIEWER' } })
  const permission = await db.permission.upsert({ where: { name: 'view_reports' }, create: { name: 'view_reports', module: 'reports', title: 'مشاهده گزارش‌ها' }, update: {} })
  const link = await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
  const delegated = await generateAccessToken('codex01b-agent', ['AGENT'], [])
  assert.equal((await GET(request(delegated))).status, 200)
  await db.rolePermission.delete({ where: { id: link.id } })
  assert.equal((await GET(request(delegated))).status, 403)
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', passed: [
    'Actual counts match independent SQLite reference queries',
    'Recent records contain real names/status/dates without mobile or identity data',
    'Missing authentication and forged/stale privilege claims rejected',
    'Delegated report permission and immediate revocation enforced with the same JWT',
  ] }, null, 2))
} finally { await db.$disconnect() }
