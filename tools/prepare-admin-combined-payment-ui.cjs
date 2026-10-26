const fs = require('node:fs')
const { PrismaClient } = require('/validation/.next/standalone/node_modules/@prisma/client')
const { hash } = require('/runtime/node_modules/bcryptjs')
const assert = require('node:assert/strict')
assert.equal(process.env.DATABASE_URL, 'file:/data/admin01a-ui.sqlite')
const login = JSON.parse(fs.readFileSync('/data/ui-login.json', 'utf8'))
const db = new PrismaClient({ log: [] })
;(async () => {
  const actors = {}
  for (const [key, permissionName, mobile] of [
    ['reviewer', 'manage_commissions', '09999550001'],
    ['payer', 'manage_commission_payments', '09999550002'],
  ]) {
    const permission = await db.permission.upsert({ where: { name: permissionName }, update: {}, create: { name: permissionName, module: 'commissions', title: permissionName } })
    const role = await db.role.create({ data: { name: `CODEX_COMBINED_UI_${key}`, title: `آزمون ترکیبی ${key}`, rolePermissions: { create: { permissionId: permission.id } } } })
    const actor = await db.user.create({ data: { id: `codex-combined-ui-${key}`, mobile, status: 'ACTIVE', passwordHash: await hash(login.password, 12), isPasswordLoginEnabled: true, isMobileVerified: true, profile: { create: { firstName: 'آزمون ترکیبی', lastName: key } }, roles: { create: { roleId: role.id } } } })
    actors[key + 'Mobile'] = actor.mobile
  }
  await db.commission.create({ data: { id: 'codex-combined-ui-approved', agentId: 'codex01b-agent', userPlanId: 'codex01b-limited', amount: 999, status: 'APPROVED' } })
  fs.writeFileSync('/data/ui-login.json', JSON.stringify({ ...login, ...actors, origin: 'http://127.0.0.1:3336' }), { mode: 0o600 })
  console.log(JSON.stringify({ syntheticPaymentActorsReady: true, credentialsOmitted: true }))
})().catch(error => { console.error(error.name); process.exitCode = 1 }).finally(() => db.$disconnect())
