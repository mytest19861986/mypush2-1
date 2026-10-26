import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { GET, PATCH } = await import('../src/app/api/v1/contracts/[id]/route')
const { GET: listContracts, POST: createContract } = await import('../src/app/api/v1/contracts/route')
const { POST: createVisit } = await import('../src/app/api/v1/visits/route')
const checks: Array<{ test: string; status: string; evidence: unknown }> = []
function pass(test: string, evidence: unknown) { checks.push({ test, status: 'PASS', evidence }) }
const doctor = 'codex01b-doctor'
const id = 'codex02-contained-contract'
const params = { params: Promise.resolve({ id }) }
async function request(body?: unknown, user?: string, roles = ['DOCTOR'], token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (user) headers.authorization = `Bearer ${token ?? await generateAccessToken(user, roles, [])}`
  return new NextRequest(`http://isolated.invalid/api/v1/contracts/${id}`, { method: body === undefined ? 'GET' : 'PATCH', headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}
async function stateHash() {
  return createHash('sha256').update(JSON.stringify(await Promise.all([
    db.contract.findMany({ orderBy: { id: 'asc' } }), db.visit.findMany({ orderBy: { id: 'asc' } }),
    db.userPlan.findMany({ orderBy: { id: 'asc' } }), db.wallet.findMany({ orderBy: { id: 'asc' } }),
    db.walletTransaction.findMany({ orderBy: { id: 'asc' } }), db.settlement.findMany({ orderBy: { id: 'asc' } }),
  ]))).digest('hex')
}
async function denied(body: unknown, user?: string, roles?: string[], token?: string, expected = 403, code?: string) {
  const before = await stateHash()
  const response = await PATCH(await request(body, user, roles, token), params)
  assert.equal(response.status, expected)
  if (code) assert.equal((await response.json()).error.code, code)
  assert.equal(await stateHash(), before)
}
try {
  const seed = await db.contract.findUniqueOrThrow({ where: { id: 'codex01b-existing-a' } })
  await db.contract.create({ data: { id, userId: seed.userId, userPlanId: seed.userPlanId, doctorId: seed.doctorId, status: 'PENDING' } })
  await denied({ status: 'COMPLETED' }, undefined, [], undefined, 401)
  await denied({ status: 'COMPLETED' }, doctor, ['DOCTOR'], 'invalid-signature', 401)
  const expired = await new SignJWT({ sub: doctor, roles: ['DOCTOR'], permissions: [] }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(1).sign(new TextEncoder().encode(process.env.JWT_SECRET!))
  await denied({ status: 'COMPLETED' }, doctor, ['DOCTOR'], expired, 401)
  pass('missing-invalid-expired-JWT', '401; six domain table snapshots unchanged')
  await denied({ doctorNote: 'blocked' }, 'codex02-nonexistent', ['DOCTOR'], undefined, 401)
  await denied({ doctorNote: 'blocked' }, doctor, ['USER'])
  const staleToken = await generateAccessToken(doctor, ['DOCTOR'], [])
  const doctorRole = await db.role.findUniqueOrThrow({ where: { name: 'DOCTOR' } })
  await db.userRole.deleteMany({ where: { userId: doctor, roleId: doctorRole.id } })
  await denied({ doctorNote: 'blocked' }, doctor, ['DOCTOR'], staleToken)
  await db.userRole.create({ data: { userId: doctor, roleId: doctorRole.id } })
  pass('current-role-and-revocation', 'USER token rejected; current DB DOCTOR role removal rejects stale DOCTOR token')
  for (const status of ['INACTIVE', 'BLOCKED']) {
    await db.user.update({ where: { id: doctor }, data: { status } })
    await denied({ doctorNote: 'blocked' }, doctor, ['DOCTOR'], staleToken, 401)
  }
  await db.user.update({ where: { id: doctor }, data: { status: 'ACTIVE', deletedAt: new Date() } })
  await denied({ doctorNote: 'blocked' }, doctor, ['DOCTOR'], staleToken, 401)
  await db.user.update({ where: { id: doctor }, data: { deletedAt: null } })
  pass('active-nondeleted-account', 'Inactive/blocked/deleted denied')
  for (const status of ['PENDING', 'REJECTED', 'SUSPENDED']) {
    await db.doctor.update({ where: { id: seed.doctorId }, data: { status } })
    await denied({ doctorNote: 'blocked' }, doctor)
  }
  await db.doctor.update({ where: { id: seed.doctorId }, data: { status: 'APPROVED' } })
  pass('doctor-approval', 'Actual schema status rejects pending/rejected/suspended')
  await denied({ doctorNote: 'blocked' }, 'codex01b-doctor-two')
  await denied({ doctorNote: 'blocked' }, 'codex01b-patient', ['USER'])
  pass('ownership-and-patient-role', 'Other doctor and patient denied')
  for (const status of ['CONFIRMED', 'COMPLETED', 'CANCELLED']) await denied({ status, doctorNote: 'must not persist' }, doctor, ['DOCTOR'], undefined, 403, 'PATIENT_CONSENT_REQUIRED')
  pass('all-pending-transitions-denied', '403 PATIENT_CONSENT_REQUIRED, no partial note persistence')
  // Fixture state only; application must not turn cancellation into completion.
  await db.contract.update({ where: { id }, data: { status: 'CANCELLED' } })
  await denied({ status: 'COMPLETED' }, doctor, ['DOCTOR'], undefined, 403, 'PATIENT_CONSENT_REQUIRED')
  await db.contract.update({ where: { id }, data: { status: 'PENDING' } })
  pass('cancelled-to-completed-denied', 'Fixture transition attempt rejected')
  const beforeParallel = await stateHash()
  const responses = await Promise.all(Array.from({ length: 4 }, () => request({ status: 'COMPLETED' }, doctor).then(r => PATCH(r, params))))
  assert.deepEqual(responses.map(r => r.status), [403, 403, 403, 403])
  for (const r of responses) assert.equal((await r.json()).error.code, 'PATIENT_CONSENT_REQUIRED')
  assert.equal(await stateHash(), beforeParallel)
  await denied({ status: 'COMPLETED' }, doctor, ['DOCTOR'], undefined, 403, 'PATIENT_CONSENT_REQUIRED')
  pass('parallel-and-repeated-status', '4 concurrent plus retry denied; six tables unchanged')
  const beforeNotes = await db.contract.findUniqueOrThrow({ where: { id } })
  const note = await PATCH(await request({ doctorNote: 'synthetic allowed note', diagnosis: 'synthetic diagnosis', prescriptions: 'synthetic prescription' }, doctor), params)
  assert.equal(note.status, 200)
  const same = await PATCH(await request({ status: 'PENDING', doctorNote: 'second synthetic note', doctorId: 'forged', userId: 'forged', totalAmount: 99999, completedAt: '2035-01-01', consent: true }, doctor), params)
  assert.equal(same.status, 200)
  const afterNotes = await db.contract.findUniqueOrThrow({ where: { id } })
  assert.equal(afterNotes.doctorNote, 'second synthetic note')
  for (const key of ['status', 'confirmedAt', 'completedAt', 'doctorId', 'userId', 'userPlanId', 'totalAmount', 'discountAmount'] as const) assert.deepEqual(afterNotes[key], beforeNotes[key])
  pass('notes-same-status-mass-assignment', 'Only allowed notes changed; status/clinical timestamps/owners/amounts preserved')
  const beforeAuditFailure = await stateHash()
  // Fault injection stays entirely in this disposable SQLite fixture.
  await db.$executeRawUnsafe("CREATE TRIGGER consent02_audit_failure BEFORE INSERT ON AuditLog WHEN NEW.action = 'CONTRACT_NOTES_UPDATED' AND NEW.entityId = 'codex02-contained-contract' BEGIN SELECT RAISE(ABORT, 'isolated audit failure'); END")
  try {
    assert.equal((await PATCH(await request({ doctorNote: 'must rollback' }, doctor), params)).status, 500)
    assert.equal(await stateHash(), beforeAuditFailure)
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER consent02_audit_failure')
  }
  pass('audit-failure-rolls-back-notes', 'Real SQLite trigger failure returns500 and preserves all six domain table snapshots')
  const beforeNoop = await stateHash()
  assert.equal((await PATCH(await request({ status: 'PENDING' }, doctor), params)).status, 200)
  assert.equal(await stateHash(), beforeNoop)
  for (let i = 0; i < 2; i++) assert.equal((await GET(await request(undefined, doctor), params)).status, 200)
  assert.equal(await stateHash(), beforeNoop)
  pass('same-status-noop-and-refresh-read', 'No status-only updatedAt rewrite; repeated fresh GET is read-only (not browser UI evidence)')
  assert.equal((await GET(await request(undefined, seed.userId, ['USER']), params)).status, 200)
  assert.equal((await GET(await request(undefined, 'codex01b-doctor-two'), params)).status, 403)
  assert.equal((await listContracts(await request(undefined, doctor))).status, 200)
  for (const handler of [createContract, createVisit]) assert.equal((await handler(await request({ consent: true, status: 'CONFIRMED' }, doctor))).status, 403)
  pass('GET-and-root-POST-regression', 'Owner/patient reads retained, other doctor denied, both creations remain403')
  const logs = await db.auditLog.findMany({ where: { entity: 'Contract', entityId: id } })
  assert.ok(logs.some(l => l.action === 'CONTRACT_STATUS_CHANGE_DENIED'))
  assert.ok(logs.some(l => l.action === 'CONTRACT_NOTES_UPDATED'))
  assert.ok(logs.every(l => !l.details?.includes('synthetic') && !l.details?.includes('Bearer')))
  pass('existing-audit-no-clinical-content', 'Existing AuditLog stores denial reason/states or allowed field names only')
  checks.push({ test: 'commercial-positive-consent', status: 'NOT VERIFIED', evidence: 'No authorized positive protocol; not implemented or fabricated.' })
  console.log(JSON.stringify({ checks }, null, 2))
} finally { await db.$disconnect() }
