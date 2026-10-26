const fs = require('node:fs')
const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const standalone = '/validation/.next/standalone'
const { PrismaClient } = require(standalone + '/node_modules/@prisma/client')
const { hash } = require('/runtime/node_modules/bcryptjs')
if (fs.existsSync('/data/admin01a-http.sqlite')) throw Error('A fresh local HTTP sandbox is required')
fs.copyFileSync('/validation/prisma/admin01b-sandbox.sqlite', '/data/admin01a-http.sqlite')
process.env.DATABASE_URL = 'file:/data/admin01a-http.sqlite'
const db = new PrismaClient({ log: [] })
const origin = 'http://127.0.0.1:3340'
const evidence = []
let server
async function call(path, status, token, body) {
  const response = await fetch(origin + path, { method: body ? 'POST' : 'GET', redirect: 'manual', headers: {
    ...(token ? { 'x-app-authorization': `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) })
  evidence.push({ path, method: body ? 'POST' : 'GET', expectedStatus: status, status: response.status, contentType: response.headers.get('content-type') })
  assert.equal(response.status, status, path)
  return response
}
;(async () => {
  const password = randomBytes(32).toString('base64url')
  for (const id of ['codex01b-admin', 'codex01b-patient']) await db.user.update({ where: { id }, data: {
    passwordHash: await hash(password, 12), isPasswordLoginEnabled: true, isMobileVerified: true, failedLoginAttempts: 0, lockedUntil: null,
  } })
  const admin = await db.user.findUniqueOrThrow({ where: { id: 'codex01b-admin' }, select: { mobile: true } })
  const patient = await db.user.findUniqueOrThrow({ where: { id: 'codex01b-patient' }, select: { mobile: true } })
  server = spawn(process.execPath, [standalone + '/server.js'], { cwd: standalone, env: {
    ...process.env, PORT: '3340', HOSTNAME: '127.0.0.1', NODE_ENV: 'production',
    JWT_SECRET: 'isolated-admin01a-http-secret-never-for-deployment', TOKEN_PEPPER: 'isolated-admin01a-http-pepper-never-for-deployment',
  }, stdio: ['ignore', 'ignore', 'ignore'] })
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw Error('Local standalone server exited before readiness')
    try { const response = await fetch(origin + '/auth/login'); if (response.status === 200) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, 'Local standalone readiness')
  const auth = (await (await call('/api/v1/auth/login', 200, undefined, { mobile: admin.mobile, password })).json()).data
  const ordinary = (await (await call('/api/v1/auth/login', 200, undefined, { mobile: patient.mobile, password })).json()).data
  assert.ok(auth.accessToken && ordinary.accessToken)
  await call('/api/v1/auth/me', 200, auth.accessToken)
  for (const path of ['/api/v1/admin/dashboard-summary', '/api/v1/admin/call-logs', '/api/v1/admin/agents/codex01a-agent-record/performance?from=2031-03-21&to=2031-03-21', '/api/v1/admin/users/codex01b-agent/roles']) {
    await call(path, 401)
    await call(path, 403, ordinary.accessToken)
    await call(path, 200, auth.accessToken)
  }
  const doctor = await call('/api/v1/doctors/codex01b-physician/performance?startDate=2026-03-21&endDate=2026-03-21', 200, auth.accessToken)
  assert.equal((await doctor.json()).data.metrics.financial.totalCompletedAmount, 500)
  const agent = await call('/api/v1/admin/agents/codex01a-agent-record/performance?from=2031-03-21&to=2031-03-21', 200, auth.accessToken)
  const agentData = (await agent.json()).data
  assert.equal(agentData.commissionStats.totalCommissionAmount, 111)
  assert.equal(agentData.customerRecords.length, 1)
  const listedAgents = (await (await call('/api/v1/agents?limit=50', 200, auth.accessToken)).json()).data
  assert.ok(listedAgents.length > 0)
  for (const row of listedAgents) {
    assert.equal(row.stats.registeredCustomers, await db.salesCustomer.count({ where: { salesPartnerId: row.userId } }))
    const paid = await db.commission.aggregate({ where: { agentId: row.userId, status: 'PAID' }, _sum: { amount: true } })
    assert.equal(row.stats.paidCommission, paid._sum.amount ?? 0)
  }
  const recent = (await (await call('/api/v1/commissions?sourceType=SALES_PARTNER&limit=5', 200, auth.accessToken)).json()).data
  assert.ok(Array.isArray(recent) && recent.length <= 5)
  for (const row of recent) {
    const stored = await db.commission.findUniqueOrThrow({ where: { id: row.id } })
    assert.equal(row.amount, stored.amount)
    assert.equal(row.status, stored.status)
    assert.ok(row.agent && row.userPlan && row.userPlan.plan)
  }
  const usage = await call('/api/v1/admin/users/codex01b-patient/profile-summary?from=2030-03-21&to=2030-03-21', 200, auth.accessToken)
  assert.equal((await usage.json()).data.visits.serviceUsage.completedServices, 5)
  const reviews = await call('/api/v1/reviews?status=APPROVED&doctorId=codex01b-physician', 200, auth.accessToken)
  assert.ok((await reviews.json()).data.some(row => row.visitId === 'codex01a-review-approve'))
  await call('/api/v1/admin/agents/missing-agent/performance', 404, auth.accessToken)
  await call('/api/v1/admin/agents/codex01a-agent-record/performance?from=2031-02-30&to=2031-03-01', 400, auth.accessToken)
  for (const path of ['/admin/dashboard', '/admin/users', '/admin/doctors', '/admin/agents', '/admin/agents/codex01a-agent-record', '/admin/agents/codex01a-agent-record/financial', '/admin/commissions', '/admin/sales-customers', '/admin/reviews', '/admin/roles', '/admin/permissions']) await call(path, 200)
  fs.writeFileSync('/data/http-results.json', JSON.stringify({ status: 'LOCAL_ONLY', scope: 'Actual compiled standalone HTTP endpoints and standard password login; not browser UI/RBAC rendering proof', checks: evidence, assertions: ['Doctor financial totals500', 'Scoped agent amount111 and one customer', 'User completed services5', 'Approved submitted review persists'], browser: 'NOT VERIFIED' }, null, 2))
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', httpChecks: evidence.length, credentialsOmitted: true, browser: 'NOT VERIFIED' }))
})().catch(error => {
  fs.writeFileSync('/data/http-failure.json', JSON.stringify({ message: error.message, checks: evidence }, null, 2))
  console.error(error.message)
  process.exitCode = 1
}).finally(async () => { if (server) server.kill('SIGTERM'); await db.$disconnect() })
