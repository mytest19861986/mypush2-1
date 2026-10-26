import { strict as assert } from 'node:assert'
import { createHash, randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync, openSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { SignJWT } from 'jose'
import { generateAccessToken } from '../src/lib/jwt'

assert.equal(process.env.DATABASE_URL, 'file:/data/auth07-http.sqlite')
assert.ok(!existsSync('/data/auth07-http.sqlite'), 'Fresh private HTTP fixture required')
copyFileSync('/validation/prisma/admin01b-sandbox.sqlite', '/data/auth07-http.sqlite')
const db = new PrismaClient({ log: [] })
const checks: Array<Record<string, unknown>> = []
const origin = 'http://127.0.0.1:3348'
const standalone = '/validation/.next/standalone'
let server: ReturnType<typeof spawn> | undefined
async function call(path: string, expected: number, token?: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(origin + path, { method, headers: { 'content-type': 'application/json', 'x-user-role': 'SUPER_ADMIN', ...(token ? { 'x-app-authorization': `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  checks.push({ path, method, expected, actual: response.status })
  assert.equal(response.status, expected, `${method} ${path}`)
  return response
}
async function snapshot() {
  return createHash('sha256').update(JSON.stringify(await Promise.all([
    db.contract.findMany({ orderBy: { id: 'asc' } }), db.visit.findMany({ orderBy: { id: 'asc' } }), db.userPlan.findMany({ orderBy: { id: 'asc' } }),
    db.wallet.findMany({ orderBy: { id: 'asc' } }), db.walletTransaction.findMany({ orderBy: { id: 'asc' } }), db.settlement.findMany({ orderBy: { id: 'asc' } }),
  ]))).digest('hex')
}
try {
  const password = randomBytes(24).toString('base64url')
  const ids = ['codex01b-admin', 'codex01b-patient', 'codex01b-doctor', 'codex07-admin', 'codex07-review', 'codex07-payer']
  for (const id of ids) await db.user.update({ where: { id }, data: { passwordHash: await hash(password, 10), isPasswordLoginEnabled: true, failedLoginAttempts: 0, lockedUntil: null } })
  server = spawn('/usr/local/bin/node', [standalone + '/server.js'], { cwd: standalone, env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: '3348', NODE_ENV: 'production' }, stdio: ['ignore', openSync('/data/server-private.txt', 'w'), openSync('/data/server-private-stderr.txt', 'w')] })
  let ready = false
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(origin + '/api/v1/auth/me'); if (r.status === 401) { ready = true; break } } catch { /* local startup */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(ready, 'Compiled local server ready')
  const tokens: Record<string, string> = {}
  for (const id of ids) {
    const user = await db.user.findUniqueOrThrow({ where: { id }, select: { mobile: true } })
    const response = await call('/api/v1/auth/login', 200, undefined, { mobile: user.mobile, password })
    tokens[id] = (await response.json()).data.accessToken
    assert.equal(typeof tokens[id], 'string')
  }
  const before = await snapshot()
  const root = '/api/v1/contracts'
  for (const token of [undefined, 'invalid', await new SignJWT({ sub: 'codex01b-doctor', roles: ['DOCTOR'], permissions: [] }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1).sign(new TextEncoder().encode(process.env.JWT_SECRET!)), await generateAccessToken('codex07-http-absent', ['DOCTOR'], [])]) await call(root, 401, token)
  await call(root, 200, tokens['codex01b-doctor'])
  const role = await db.role.findUniqueOrThrow({ where: { name: 'DOCTOR' } })
  await db.userRole.deleteMany({ where: { userId: 'codex01b-doctor', roleId: role.id } })
  await call(root, 403, tokens['codex01b-doctor'])
  await call(root + '/codex01b-existing-a', 403, tokens['codex01b-doctor'], { doctorNote: 'must not persist' }, 'PATCH')
  await db.userRole.create({ data: { userId: 'codex01b-doctor', roleId: role.id } })
  for (const status of ['INACTIVE', 'BLOCKED']) {
    await db.user.update({ where: { id: 'codex01b-doctor' }, data: { status } })
    await call(root, 401, tokens['codex01b-doctor'])
  }
  await db.user.update({ where: { id: 'codex01b-doctor' }, data: { status: 'ACTIVE', deletedAt: new Date() } })
  await call(root, 401, tokens['codex01b-doctor'])
  await db.user.update({ where: { id: 'codex01b-doctor' }, data: { deletedAt: null } })
  const contained = await call(root + '/codex01b-existing-a', 403, tokens['codex01b-doctor'], { status: 'COMPLETED' }, 'PATCH')
  assert.equal((await contained.json()).error.code, 'PATIENT_CONSENT_REQUIRED')
  const forgedAdmin = await generateAccessToken('codex01b-patient', ['SUPER_ADMIN'], ['*'])
  await call('/api/v1/users', 403, forgedAdmin)
  await call('/api/v1/users', 401)
  await call('/api/v1/users', 200, tokens['codex01b-admin'])
  await call('/api/v1/users', 200, tokens['codex07-admin'])
  await call('/api/v1/commission-payments', 403, tokens['codex07-review'])
  await call('/api/v1/commission-payments', 200, tokens['codex07-payer'])
  const after = await snapshot()
  assert.equal(after, before)
  const output = { scope: 'Compiled local artifact with private synthetic normal login; no live acceptance.', buildId: readFileSync('/validation/.next/BUILD_ID', 'utf8').trim(), checks, domainBefore: before, domainAfter: after, credentialsSaved: false }
  writeFileSync('/data/HTTP_AUTH07.json', JSON.stringify(output, null, 2))
  console.log(JSON.stringify({ checks: checks.length, buildId: output.buildId, domainUnchanged: before === after }))
} catch (error) {
  writeFileSync('/data/HTTP_AUTH07_FAILURE.json', JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected test error', checks }, null, 2))
  throw error
} finally { server?.kill('SIGTERM'); await db.$disconnect() }
