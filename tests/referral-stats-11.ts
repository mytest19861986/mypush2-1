import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

assert.equal(process.env.DATABASE_URL, 'file:/workspace/prisma/admin01b-sandbox.sqlite')
const db = new PrismaClient({ log: [] })
;(globalThis as unknown as { prisma: PrismaClient }).prisma = db
const { GET } = await import('../src/app/api/v1/referrals/stats/route')
const { generateAccessToken } = await import('../src/lib/jwt')
const { REFERRAL_MEMBER_LABEL, isReferralStats } = await import('../src/lib/referral-stats-contract')
const checks: Array<{ test: string; status: string; evidence: unknown }> = []
const ids = ['referrer-a', 'referrer-b', 'member-a1', 'member-a2', 'member-b1', 'legacy-only', 'zero', 'admin', 'superadmin'].map(x => 'codex11-' + x)
const tokens: Record<string, string> = {}
function pass(test: string, evidence: unknown) { checks.push({ test, status: 'PASS', evidence }) }
function req(id?: string, query = '', headers: Record<string, string> = {}) {
  return new NextRequest('http://isolated.invalid/api/v1/referrals/stats' + query, { headers: { ...(id ? { 'x-app-authorization': `Bearer ${tokens[id]}` } : {}), ...headers } })
}
async function read(id?: string, query = '', headers: Record<string, string> = {}) {
  const response = await GET(req(id, query, headers))
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  return { status: response.status, body: await response.json() }
}
async function snapshot() {
  const models = await Promise.all([db.userReferral.findMany({orderBy:{id:'asc'}}),db.auditLog.findMany({orderBy:{id:'asc'}}),db.userPlan.findMany({orderBy:{id:'asc'}}),db.contract.findMany({orderBy:{id:'asc'}}),db.visit.findMany({orderBy:{id:'asc'}}),db.commission.findMany({orderBy:{id:'asc'}}),db.wallet.findMany({orderBy:{id:'asc'}}),db.walletTransaction.findMany({orderBy:{id:'asc'}}),db.settlement.findMany({orderBy:{id:'asc'}})])
  return createHash('sha256').update(JSON.stringify(models)).digest('hex')
}
try {
  for (let i=0;i<ids.length;i++) {
    const roleName=i===7?'ADMIN':i===8?'SUPER_ADMIN':'USER'
    const role=await db.role.upsert({where:{name:roleName},create:{name:roleName,title:roleName},update:{}})
    await db.user.create({data:{id:ids[i],mobile:'0999911'+String(i).padStart(4,'0'),profile:{create:{firstName:'PRIVATE_MEMBER_'+i}},roles:{create:{roleId:role.id}}}})
    tokens[ids[i]]=await generateAccessToken(ids[i],[roleName],[])
  }
  for (const [owner,member,suffix] of [[0,2,'a1'],[0,3,'a2'],[1,4,'b1'],[0,0,'invalid-self']] as const) {
    await db.userReferral.create({data:{id:'codex11-link-'+suffix,referrerId:ids[owner],referredUserId:ids[member],referralCode:'SYNTHETIC_ONLY'}})
  }
  await db.auditLog.create({data:{userId:ids[5],action:'REFERRAL_ATTRIBUTED',entity:'User',entityId:ids[5],details:JSON.stringify({referrerId:ids[0]})}})
  const before=await snapshot()
  const a=await read(ids[0]);assert.equal(a.status,200)
  assert.deepEqual(a.body.data,{totalReferrals:2,referrals:[{label:REFERRAL_MEMBER_LABEL},{label:REFERRAL_MEMBER_LABEL}]})
  assert.equal(isReferralStats(a.body.data),true)
  assert.ok(!JSON.stringify(a.body).includes('codex11-'));assert.ok(!JSON.stringify(a.body).includes('PRIVATE_MEMBER'));assert.ok(!JSON.stringify(a.body).includes('0999911'))
  pass('nonempty-own-authoritative-relations-no-identities', '200,count2,generic labels only; self-referral and legacy audit excluded')
  const b=await read(ids[1]);assert.equal(b.body.data.totalReferrals,1)
  const zero=await read(ids[6]);assert.deepEqual(zero.body.data,{totalReferrals:0,referrals:[]});assert.equal(zero.status,200)
  pass('ownership-and-successful-empty', 'Different owner count1; zero-owner200,count0 and empty list')
  for (const actor of [ids[0],ids[7],ids[8]]) {
    const result=await read(actor,'?userId='+ids[1]);assert.equal(result.status,403);assert.equal(result.body.error.code,'FORBIDDEN');assert.ok(!JSON.stringify(result.body).includes(ids[1]))
  }
  pass('cross-user-denied-including-admin-superadmin', '403 for all3; no target identifier disclosed')
  assert.equal((await read(ids[0],'?userId='+ids[0])).body.data.totalReferrals,2)
  assert.equal((await read(ids[0],'?userId='+ids[0]+'&userId='+ids[1])).status,403)
  assert.equal((await read(ids[0],'',{'x-user-id':ids[1],'x-user-role':'SUPER_ADMIN'})).body.data.totalReferrals,2)
  assert.equal((await read(ids[0],'',{'content-length':'2'})).status,403)
  assert.equal((await read(ids[0],'?referrerId='+ids[1])).status,400)
  pass('client-owner-overrides-and-body-rejected', 'Self echo allowed; duplicate/cross/body403,unknown query400; spoofed headers cannot change owner')
  assert.equal((await read()).status,401)
  const invalid=await GET(new NextRequest('http://isolated.invalid/api/v1/referrals/stats',{headers:{authorization:'Bearer invalid'}}));assert.equal(invalid.status,401)
  pass('unauthenticated-invalid-token', '401; no successful count')
  const count=db.userReferral.count
  Object.assign(db.userReferral,{count:()=>Promise.reject(new Error('synthetic private query failure'))})
  try { const failure=await read(ids[0]);assert.equal(failure.status,503);assert.equal(failure.body.error.code,'REFERRAL_STATS_UNAVAILABLE');assert.equal(failure.body.data,undefined);assert.ok(!JSON.stringify(failure.body).includes('synthetic private')) }
  finally { Object.assign(db.userReferral,{count}) }
  pass('database-error-not-zero-and-no-error-detail', '503,no data/count,controlled generic message; query method restored')
  assert.equal(isReferralStats({totalReferrals:0,referrals:[]}),true)
  for (const bad of [null,{totalReferrals:-1,referrals:[]},{totalReferrals:2,referrals:[]},{totalReferrals:0,referrals:[],userId:'private'},{totalReferrals:1,referrals:[{label:REFERRAL_MEMBER_LABEL,name:'private'}]}]) assert.equal(isReferralStats(bad),false)
  pass('client-contract-validation', 'Valid zero distinguished from missing/malformed/identifying payloads')
  const after=await snapshot();assert.equal(after,before)
  pass('no-attribution-financial-quota-or-audit-writes', {before,after})
  console.log(JSON.stringify({checks},null,2))
} finally {await db.$disconnect()}
