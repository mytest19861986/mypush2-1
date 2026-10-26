import { strict as assert } from 'node:assert'
import { randomBytes, createHash } from 'node:crypto'
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
assert.equal(process.env.DATABASE_URL, 'file:/data/ui08a.sqlite')
assert.ok(!existsSync('/data/ui08a.sqlite'))
copyFileSync('/validation/prisma/admin01b-sandbox.sqlite', '/data/ui08a.sqlite')
const db = new PrismaClient({ log: [] })
try {
  const accounts = []
  for (const id of ['codex08-a', 'codex08-c']) {
    const password = randomBytes(24).toString('base64url')
    const user = await db.user.update({ where: { id }, data: { passwordHash: await hash(password, 10), isPasswordLoginEnabled: true, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null } })
    accounts.push({ id, mobile: user.mobile, password })
  }
  // A narrowly conditional private-fixture DB fault exercises the actual form error/rollback.
  await db.$executeRawUnsafe(`CREATE TRIGGER codex08a_profile_fault BEFORE UPDATE ON UserProfile WHEN NEW.firstName = 'Synthetic DB failure 08A' BEGIN SELECT RAISE(ABORT, 'synthetic profile write unavailable'); END;`)
  const state = await Promise.all([db.contract.findMany({orderBy:{id:'asc'}}),db.visit.findMany({orderBy:{id:'asc'}}),db.userPlan.findMany({orderBy:{id:'asc'}}),db.wallet.findMany({orderBy:{id:'asc'}}),db.walletTransaction.findMany({orderBy:{id:'asc'}}),db.settlement.findMany({orderBy:{id:'asc'}})])
  writeFileSync('/data/domain-before.json', JSON.stringify({ hash: createHash('sha256').update(JSON.stringify(state)).digest('hex') }))
  writeFileSync('/data/browser-login.json', JSON.stringify(accounts))
  console.log(JSON.stringify({ fixtureReady: true, credentialsPrinted: false, realIdentityCreated: false }))
} finally { await db.$disconnect() }
