const fs = require('node:fs')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const standalone = '/validation/.next/standalone'
const { PrismaClient } = require(standalone + '/node_modules/@prisma/client')
const { hash } = require('/runtime/node_modules/bcryptjs')
if (fs.existsSync('/data/payment-http.sqlite')) throw Error('Use a fresh isolated HTTP data volume')
fs.copyFileSync('/validation/payment-sandbox.sqlite', '/data/payment-http.sqlite')
process.env.DATABASE_URL = 'file:/data/payment-http.sqlite'
const db = new PrismaClient({ log: [] })
const checks = [], tokens = [], actors = []
let server
async function call(path, method, expectedStatus, token, body) {
  const response = await fetch('http://127.0.0.1:3342' + path, { method, headers: {
    'content-type': 'application/json', 'x-user-role': 'SUPER_ADMIN', 'x-user-id': 'codex01b-admin',
    ...(token ? { 'x-app-authorization': `Bearer ${token}` } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  checks.push({ path, method, expectedStatus, status: response.status })
  assert.equal(response.status, expectedStatus, method + ' ' + path)
  return response
}
;(async () => {
  const password = randomBytes(24).toString('base64url')
  const permissions = [[], ['manage_commissions'], ['manage_commission_payments'], ['manage_commissions', 'manage_commission_payments']]
  for (const [index, names] of permissions.entries()) {
    const role = await db.role.create({ data: { name: `CODEXPAY_HTTP_${index}`, title: `HTTP payment fixture ${index}` } })
    for (const name of names) {
      const permission = await db.permission.findUniqueOrThrow({ where: { name } })
      await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
    }
    actors.push(await db.user.create({ data: { id: `codexpay-http-${index}`, mobile: `0999966000${index}`, status: 'ACTIVE', passwordHash: await hash(password, 12), isPasswordLoginEnabled: true, isMobileVerified: true, roles: { create: { roleId: role.id } } } }))
    await db.commission.create({ data: { id: `codexpay-http-commission-${index}`, agentId: 'codex01b-agent', userPlanId: 'codex01b-limited', amount: 127, status: index === 1 || index === 3 ? 'PENDING' : 'APPROVED' } })
  }
  server = spawn(process.execPath, [standalone + '/server.js'], { cwd: standalone, env: {
    ...process.env, PORT: '3342', HOSTNAME: '127.0.0.1', NODE_ENV: 'production', JWT_SECRET: 'isolated-payment-http-secret-never-for-deployment', TOKEN_PEPPER: 'isolated-payment-http-pepper-never-for-deployment',
  }, stdio: ['ignore', 'ignore', 'ignore'] })
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw Error('Standalone exited before readiness')
    try { if ((await fetch('http://127.0.0.1:3342/auth/login')).status === 200) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready)
  for (const actor of actors) {
    const login = await call('/api/v1/auth/login', 'POST', 200, undefined, { mobile: actor.mobile, password })
    const token = (await login.json()).data.accessToken
    assert.ok(token); tokens.push(token)
  }
  await call('/api/v1/commissions/codexpay-http-commission-0/pay', 'POST', 401, undefined, {})
  for (const index of [0, 1]) await call(`/api/v1/commissions/codexpay-http-commission-${index}/pay`, 'POST', 403, tokens[index], {})
  await call('/api/v1/commissions/codexpay-http-commission-1', 'GET', 200, tokens[1])
  await call('/api/v1/commissions/codexpay-http-commission-1/approve', 'PATCH', 200, tokens[1], {})
  await call('/api/v1/commissions/codexpay-http-commission-1/pay', 'POST', 403, tokens[1], {})
  for (const [suffix, method] of [['', 'GET'], ['/approve', 'PATCH'], ['/cancel', 'PATCH']]) await call('/api/v1/commissions/codexpay-http-commission-2' + suffix, method, 403, tokens[2], method === 'GET' ? undefined : {})
  await call('/api/v1/commissions/codexpay-http-commission-2/pay', 'POST', 200, tokens[2], {})
  await call('/api/v1/commissions/codexpay-http-commission-2/pay', 'POST', 409, tokens[2], {})
  await call('/api/v1/commissions/codexpay-http-commission-3/approve', 'PATCH', 200, tokens[3], {})
  await call('/api/v1/commissions/codexpay-http-commission-3/pay', 'POST', 200, tokens[3], {})
  const role = await db.role.findUniqueOrThrow({ where: { name: 'CODEXPAY_HTTP_2' } })
  await db.rolePermission.deleteMany({ where: { roleId: role.id } })
  await call('/api/v1/commissions/codexpay-http-commission-1/pay', 'POST', 403, tokens[2], {})
  const credits = await db.walletTransaction.findMany({ where: { referenceType: 'COMMISSION', referenceId: { in: ['codexpay-http-commission-0', 'codexpay-http-commission-1', 'codexpay-http-commission-2', 'codexpay-http-commission-3'] } }, select: { referenceId: true, amount: true } })
  assert.deepEqual(credits.map(row => row.referenceId).sort(), ['codexpay-http-commission-2', 'codexpay-http-commission-3'])
  assert.ok(credits.every(row => row.amount === 127))
  const result = { status: 'LOCAL_ONLY', result: 'PASS', scope: 'Actual compiled standalone HTTP with normal synthetic password login; no real payment/bank/network transaction', checks, credits, credentialsOmitted: true, browser: 'NOT VERIFIED' }
  fs.writeFileSync('/data/http-results.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ result: 'PASS', httpChecks: checks.length, syntheticCredits: credits.length, credentialsOmitted: true }))
})().catch(error => { console.error(error.message); fs.writeFileSync('/data/http-failure.json', JSON.stringify({ message: error.message, checks }, null, 2)); process.exitCode = 1 }).finally(async () => { if (server) server.kill('SIGTERM'); await db.$disconnect() })
