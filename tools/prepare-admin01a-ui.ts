import { strict as assert } from 'node:assert'
import { existsSync, copyFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

assert.equal(process.env.DATABASE_URL, 'file:/data/admin01a-ui.sqlite')
assert.equal(existsSync('/data/admin01a-ui.sqlite'), false, 'Preserve any existing UI sandbox; use a fresh volume')
copyFileSync('/validation/prisma/admin01b-sandbox.sqlite', '/data/admin01a-ui.sqlite')
const sqlite = new Database('/data/admin01a-ui.sqlite', { readonly: true })
assert.equal(Object.values(sqlite.query('PRAGMA quick_check').get()!)[0], 'ok')
sqlite.close()
const db = new PrismaClient({ log: [] })
try {
  const user = await db.user.findUniqueOrThrow({ where: { id: 'codex01b-admin' }, include: { roles: { include: { role: true } } } })
  assert.ok(user.roles.some(link => link.role.name === 'SUPER_ADMIN'))
  const password = randomBytes(24).toString('base64url')
  await db.user.update({ where: { id: user.id }, data: {
    passwordHash: await hash(password, 12), isPasswordLoginEnabled: true, isMobileVerified: true,
    status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null,
  } })
  if (process.env.UI_BROWSER_RANGE_FIXTURE === '1') {
    // Browser-only synthetic fixture: use a selectable historical Jalali day.
    // Preserve boundary offsets, statuses, ownership, amounts and original build-test DB.
    const target = Date.parse('2026-09-30T20:30:00Z')
    const shift = (value: Date | null, year: number) => {
      if (!value) return value
      const anchor = Date.parse(`${year}-03-20T20:30:00Z`)
      const offset = value.getTime() - anchor
      return Math.abs(offset) <= 2 * 86400000 ? new Date(target + offset) : value
    }
    await db.$transaction(async transaction => {
      for (const row of await transaction.visit.findMany({ where: { id: { startsWith: 'codex01a-usage-' } } })) {
        await transaction.visit.update({ where: { id: row.id }, data: {
          createdAt: shift(row.createdAt, 2030)!, completedAt: shift(row.completedAt, 2030), visitedAt: shift(row.visitedAt, 2030),
        } })
      }
      for (const row of await transaction.contract.findMany({ where: { id: { startsWith: 'codex01a-usage-' } } })) {
        await transaction.contract.update({ where: { id: row.id }, data: { completedAt: shift(row.completedAt, 2030) } })
      }
      for (const row of await transaction.salesCustomer.findMany({ where: { id: { startsWith: 'codex01a-scope-' } } })) {
        await transaction.salesCustomer.update({ where: { id: row.id }, data: {
          createdAt: shift(row.createdAt, 2031)!, paidAt: shift(row.paidAt, 2031), confirmedAt: shift(row.confirmedAt, 2031),
        } })
      }
      const owners = ['codex01b-agent', 'codex01a-scope-agent-two']
      for (const row of await transaction.commission.findMany({ where: { agentId: { in: owners }, createdAt: { gte: new Date('2031-03-20'), lt: new Date('2031-03-23') } } })) {
        await transaction.commission.update({ where: { id: row.id }, data: { createdAt: shift(row.createdAt, 2031)! } })
      }
      for (const row of await transaction.settlement.findMany({ where: { userId: { in: owners }, requestedAt: { gte: new Date('2031-03-20'), lt: new Date('2031-03-23') } } })) {
        await transaction.settlement.update({ where: { id: row.id }, data: { requestedAt: shift(row.requestedAt, 2031)! } })
      }
      await transaction.user.update({ where: { id: 'codex01a-scope-agent-two' }, data: { status: 'ACTIVE' } })
    })
    console.log(JSON.stringify({ browserFixtureDay: '2026-10-01', jalali: '1405/07/09', expectedUserUsage: { registered: 7, completed: 5, doctors: 2 }, expectedAgentRangeCommissions: [111, 222], originalBuildTestDatabaseUnchanged: true }))
  }
  writeFileSync('/data/ui-login.json', JSON.stringify({ origin: 'http://127.0.0.1:3318', mobile: user.mobile, password }), { mode: 0o600 })
  console.log(JSON.stringify({ fixtureReady: true, databaseIntegrity: 'ok', fixtureUserId: user.id, credentialValuesOmitted: true }))
} finally { await db.$disconnect() }
