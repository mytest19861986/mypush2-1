import { strict as assert } from 'node:assert'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { generateAccessToken } = await import('../src/lib/jwt')
const { POST, GET } = await import('../src/app/api/v1/reviews/route')
const { PATCH: approve } = await import('../src/app/api/v1/reviews/[id]/approve/route')
const { PATCH: reject } = await import('../src/app/api/v1/reviews/[id]/reject/route')
const admin = await generateAccessToken('codex01b-admin', ['SUPER_ADMIN'], [])
const patient = await generateAccessToken('codex01b-patient', ['USER'], [])
const other = await generateAccessToken('codex01b-agent', ['AGENT'], [])
const request = (method: string, token?: string, body?: unknown, query = '') => new NextRequest('http://localhost/api/v1/reviews' + query, {
  method, headers: { 'content-type': 'application/json', 'x-user-role': 'SUPER_ADMIN', ...(token ? { 'x-app-authorization': `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})
const params = (id: string) => ({ params: Promise.resolve({ id }) })
try {
  const visits = ['codex01a-review-approve', 'codex01a-review-reject', 'codex01a-review-pending']
  for (const id of visits) await db.visit.create({ data: { id, userId: 'codex01b-patient', userPlanId: 'codex01b-limited', planHolderId: 'codex01b-holder', doctorId: 'codex01b-physician', status: id.endsWith('pending') ? 'PENDING' : 'COMPLETED' } })
  const body = { visitId: visits[0], rating: 4, comment: 'نظر ساختگی بررسی جریان ثبت تا مدیریت' }
  assert.equal((await POST(request('POST', undefined, body))).status, 401)
  assert.equal((await POST(request('POST', other, body))).status, 403)
  assert.equal((await POST(request('POST', patient, { ...body, rating: 6 }))).status, 400)
  assert.equal((await POST(request('POST', patient, { ...body, visitId: visits[2] }))).status, 400)
  const response = await POST(request('POST', patient, body))
  assert.equal(response.status, 201)
  const created = (await response.json()).data
  assert.equal(created.status, 'PENDING')
  assert.equal((await POST(request('POST', patient, body))).status, 409)
  assert.equal(await db.review.count({ where: { visitId: visits[0] } }), 1)
  assert.equal((await GET(request('GET', patient))).status, 403)
  const pending = await GET(request('GET', admin, undefined, '?status=PENDING&doctorId=codex01b-physician'))
  assert.equal(pending.status, 200)
  const listed = (await pending.json()).data.filter((row: { reviewId: string }) => row.reviewId === created.reviewId)
  assert.equal(listed.length, 1)
  assert.equal(listed[0].comment, body.comment)
  assert.equal((await approve(request('PATCH', patient), params(created.reviewId))).status, 403)
  assert.equal((await approve(request('PATCH', admin), params(created.reviewId))).status, 200)
  assert.equal((await approve(request('PATCH', admin), params(created.reviewId))).status, 409)
  assert.equal((await reject(request('PATCH', admin, { reason: 'ساختگی' }), params(created.reviewId))).status, 409)
  const audit = await db.auditLog.findFirstOrThrow({ where: { action: 'REVIEW_APPROVED', entityId: created.reviewId } })
  assert.equal(audit.userId, 'codex01b-admin')
  assert.equal((await db.review.findUniqueOrThrow({ where: { id: created.reviewId } })).status, 'APPROVED')
  const secondResponse = await POST(request('POST', patient, { ...body, visitId: visits[1] }))
  const second = (await secondResponse.json()).data
  assert.equal((await reject(request('PATCH', admin, { reason: 'آزمون رد نظر' }), params(second.reviewId))).status, 200)
  assert.equal((await db.review.findUniqueOrThrow({ where: { id: second.reviewId } })).status, 'REJECTED')
  assert.equal(await db.auditLog.count({ where: { action: 'REVIEW_CREATED', entityId: { in: [created.reviewId, second.reviewId] } } }), 2)
  console.log(JSON.stringify({ status: 'LOCAL_ONLY', passed: [
    'Actual user review POST creates exactly one pending record and appears once in admin queue',
    'Anonymous/other owner/invalid rating/pending visit rejected; duplicate blocked',
    'Admin approval and rejection persist with correct actor audit; ordinary user cannot moderate',
    'Repeated or conflicting final moderation rejected; existing workflow retained',
  ], notVerified: ['Browser pending indicator, actual error presentation and refresh on latest build'] }, null, 2))
} finally { await db.$disconnect() }
