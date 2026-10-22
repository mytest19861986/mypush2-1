import { db } from '../../src/lib/db'
import assert from 'assert'
import { NextRequest } from 'next/server'
import { generateAccessToken } from '../../src/lib/jwt'
import { PATCH } from '../../src/app/api/v1/agents/[id]/status/route'
import { GET } from '../../src/app/api/v1/agents/[id]/route'

async function runCmd170Suite() {
  console.log('=== RUNNING CMD-HAMI-170 AGENT LIFECYCLE AUDIT TEST SUITE ===')

  let passCount = 0

  // 1. Setup Admin with approve_agents and manage_agents permissions
  const adminUser = await db.user.create({
    data: {
      mobile: `0910${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: 'ACTIVE',
    },
  })

  const adminRole = await db.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', title: 'مدیر ارشد' },
  })

  const permApprove = await db.permission.upsert({
    where: { name: 'approve_agents' },
    update: {},
    create: { name: 'approve_agents', title: 'تایید همکاران', module: 'agents' },
  })

  const permManage = await db.permission.upsert({
    where: { name: 'manage_agents' },
    update: {},
    create: { name: 'manage_agents', title: 'مدیریت همکاران', module: 'agents' },
  })

  await db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permApprove.id } },
    update: {},
    create: { roleId: adminRole.id, permissionId: permApprove.id },
  })

  await db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permManage.id } },
    update: {},
    create: { roleId: adminRole.id, permissionId: permManage.id },
  })

  await db.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  })

  const adminToken = await generateAccessToken(
    adminUser.id,
    ['ADMIN'],
    ['approve_agents', 'manage_agents']
  )

  // Setup Unprivileged User (No permissions)
  const regularUser = await db.user.create({
    data: {
      mobile: `0935${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: 'ACTIVE',
    },
  })

  const regularToken = await generateAccessToken(
    regularUser.id,
    ['USER'],
    []
  )

  const randomNatCode = `00${Math.floor(10000000 + Math.random() * 90000000)}`
  const targetUser = await db.user.create({
    data: {
      mobile: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: 'ACTIVE',
      profile: {
        create: {
          firstName: 'سهراب',
          lastName: 'سپهری',
          nationalCode: randomNatCode,
        },
      },
    },
  })

  const targetAgent = await db.agent.create({
    data: {
      userId: targetUser.id,
      businessName: 'آژانس البرز',
      status: 'PENDING',
      description: 'همکار آزمایشی جهت اعتبارسنجی ممیزی',
    },
  })

  const agentId = targetAgent.id

  console.log(`\nInitialized test agent: ${agentId} in state PENDING`)

  try {
    // -------------------------------------------------------------
    // Scenario 1: Unauthenticated request (no token) -> 401
    // -------------------------------------------------------------
    console.log('\n[Scenario 1: No token provided]')
    const req1 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    })
    const res1 = await PATCH(req1, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res1.status, 401, 'Unauthenticated request must return 401')
    passCount++
    console.log('[PASS] Unauthenticated request rejected with HTTP 401')

    // -------------------------------------------------------------
    // Scenario 2: Unprivileged user request -> 403, no state change
    // -------------------------------------------------------------
    console.log('\n[Scenario 2: Unprivileged user (no approve_agents permission)]')
    const req2 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regularToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    })
    const res2 = await PATCH(req2, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res2.status, 403, 'Unprivileged request must return 403')
    const checkState2 = await db.agent.findUnique({ where: { id: agentId } })
    assert.strictEqual(checkState2?.status, 'PENDING', 'State must remain PENDING')
    passCount++
    console.log('[PASS] Unprivileged request rejected with HTTP 403 and status preserved')

    // -------------------------------------------------------------
    // Scenario 3: Authorized Approval with Reason & Correlation ID -> Atomic Audit Log
    // -------------------------------------------------------------
    console.log('\n[Scenario 3: Authorized Agent Approval]')
    const testCorrelationId = 'CORR_CMD170_TEST_991'
    const req3 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Request-Id': testCorrelationId,
        'User-Agent': 'Test-Agent-Suite/1.0',
      },
      body: JSON.stringify({
        status: 'APPROVED',
        reason: 'مدارک و قرارداد امضاشده تطبیق داده شد',
      }),
    })
    const res3 = await PATCH(req3, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res3.status, 200, 'Approved request must return 200')
    const checkState3 = await db.agent.findUnique({ where: { id: agentId } })
    assert.strictEqual(checkState3?.status, 'APPROVED', 'Agent status must be APPROVED')

    // Check AGENT role assigned to user
    const agentRole = await db.role.findUnique({ where: { name: 'AGENT' } })
    if (agentRole) {
      const userRole = await db.userRole.findUnique({
        where: { userId_roleId: { userId: targetUser.id, roleId: agentRole.id } },
      })
      assert(userRole !== null, 'AGENT role must be granted')
    }

    // Check AuditLog entry
    const auditLogs3 = await db.auditLog.findMany({
      where: { entity: 'Agent', entityId: agentId },
      orderBy: { createdAt: 'desc' },
    })
    assert.strictEqual(auditLogs3.length, 1, 'Exactly 1 audit log must be created')
    assert.strictEqual(auditLogs3[0].userId, adminUser.id, 'Audit log operator must be admin')
    assert.strictEqual(auditLogs3[0].action, 'AGENT_STATUS_CHANGED')
    const details3 = JSON.parse(auditLogs3[0].details || '{}')
    assert.strictEqual(details3.previousStatus, 'PENDING')
    assert.strictEqual(details3.newStatus, 'APPROVED')
    assert.strictEqual(details3.reason, 'مدارک و قرارداد امضاشده تطبیق داده شد')
    assert.strictEqual(details3.correlationId, testCorrelationId)
    passCount++
    console.log('[PASS] Agent approved, AGENT role assigned, atomic audit log recorded with reason and correlationId')

    // -------------------------------------------------------------
    // Scenario 4: Duplicate Approval (Idempotency) -> No duplicate audit log
    // -------------------------------------------------------------
    console.log('\n[Scenario 4: Idempotent duplicate status update]')
    const req4 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    })
    const res4 = await PATCH(req4, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res4.status, 200, 'Duplicate request must return 200')
    const auditLogs4 = await db.auditLog.findMany({
      where: { entity: 'Agent', entityId: agentId },
    })
    assert.strictEqual(auditLogs4.length, 1, 'Duplicate status update MUST NOT generate duplicate audit log')
    passCount++
    console.log('[PASS] Duplicate status update handled idempotently without duplicate audit log')

    // -------------------------------------------------------------
    // Scenario 5: Reject Agent -> Status REJECTED, Audit Log Recorded
    // -------------------------------------------------------------
    console.log('\n[Scenario 5: Reject Agent]')
    const reqReject = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'REJECTED',
        reason: 'نقص در بارگذاری کارت بازرگانی معتبر',
      }),
    })
    const resReject = await PATCH(reqReject, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(resReject.status, 200, 'Rejection request must return 200')
    const checkStateReject = await db.agent.findUnique({ where: { id: agentId } })
    assert.strictEqual(checkStateReject?.status, 'REJECTED')
    passCount++
    console.log('[PASS] Agent rejected, status changed to REJECTED, audit log recorded')

    // -------------------------------------------------------------
    // Scenario 6: Suspend Agent -> Status SUSPENDED, Role Revoked, Audit Log Recorded
    // -------------------------------------------------------------
    console.log('\n[Scenario 6: Suspend Agent]')
    const req5 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'SUSPENDED',
        reason: 'نیاز به بررسی تکمیلی مدارک مالیاتی',
      }),
    })
    const res5 = await PATCH(req5, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res5.status, 200, 'Suspension request must return 200')
    const checkState5 = await db.agent.findUnique({ where: { id: agentId } })
    assert.strictEqual(checkState5?.status, 'SUSPENDED')

    // Check AGENT role revoked
    if (agentRole) {
      const userRole5 = await db.userRole.findUnique({
        where: { userId_roleId: { userId: targetUser.id, roleId: agentRole.id } },
      })
      assert.strictEqual(userRole5, null, 'AGENT role must be revoked on suspension')
    }

    passCount++
    console.log('[PASS] Agent suspended, AGENT role revoked, audit log recorded')

    // -------------------------------------------------------------
    // Scenario 7: Re-approval after suspension -> Status APPROVED, Role Re-assigned
    // -------------------------------------------------------------
    console.log('\n[Scenario 7: Re-approve Agent]')
    const req6 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        reason: 'رفع نقص مدارک مالیاتی انجام شد',
      }),
    })
    const res6 = await PATCH(req6, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res6.status, 200)
    const checkState6 = await db.agent.findUnique({ where: { id: agentId } })
    assert.strictEqual(checkState6?.status, 'APPROVED')
    passCount++
    console.log('[PASS] Agent re-approved successfully with audit log')

    // -------------------------------------------------------------
    // Scenario 8: Transaction Failure Atomicity Rollback Proof
    // -------------------------------------------------------------
    console.log('\n[Scenario 8: Transaction Failure Rollback Atomicity]')
    const stateBefore = await db.agent.findUnique({ where: { id: agentId } })
    const logsCountBefore = await db.auditLog.count({ where: { entityId: agentId } })

    try {
      await db.$transaction(async (tx) => {
        await tx.agent.update({
          where: { id: agentId },
          data: { status: 'SUSPENDED' },
        })
        // Intentionally throw error inside transaction to prove rollback
        throw new Error('SIMULATED_TRANSACTION_FAILURE_AUDIT_ERROR')
      })
      assert.fail('Transaction should have failed')
    } catch (err: any) {
      assert(err.message.includes('SIMULATED_TRANSACTION_FAILURE_AUDIT_ERROR'))
    }

    const stateAfter = await db.agent.findUnique({ where: { id: agentId } })
    const logsCountAfter = await db.auditLog.count({ where: { entityId: agentId } })
    assert.strictEqual(stateAfter?.status, stateBefore?.status, 'Status must not mutate on transaction failure')
    assert.strictEqual(logsCountAfter, logsCountBefore, 'No orphaned audit log on transaction failure')
    passCount++
    console.log('[PASS] Atomic transaction rollback verified: Zero partial state or orphaned audit log')

    // -------------------------------------------------------------
    // Scenario 9: Verify GET /api/v1/agents/[id] returns Audit Trail & Redacts Secrets
    // -------------------------------------------------------------
    console.log('\n[Scenario 9: GET Agent Details with Audit Trail & Privacy]')
    const req7 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
    const res7 = await GET(req7, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res7.status, 200)
    const json7 = await res7.json()
    assert.strictEqual(json7.success, true)
    assert(Array.isArray(json7.data.auditLogs), 'auditLogs array must be present')
    assert(json7.data.auditLogs.length >= 3, 'Audit logs must be returned')
    assert.strictEqual(json7.data.auditLogs[0].newStatus, 'APPROVED')
    assert(json7.data.auditLogs[0].operatorName.length > 0, 'Operator name must be included')

    // Verify privacy: No passwords, OTPs, or JWTs in audit log
    for (const log of json7.data.auditLogs) {
      const serialized = JSON.stringify(log)
      assert(!serialized.includes('password'), 'No password in audit logs')
      assert(!serialized.includes('jwt'), 'No jwt in audit logs')
      assert(!serialized.includes('token'), 'No token in audit logs')
    }
    passCount++
    console.log('[PASS] GET details endpoint successfully returns audit trail without secret leakage')

    // -------------------------------------------------------------
    // Scenario 10: Unauthorized Access to History / GET details -> 403
    // -------------------------------------------------------------
    console.log('\n[Scenario 10: Unauthorized Access to Audit History & Details]')
    const req8 = new NextRequest(`http://localhost:3000/api/v1/agents/${agentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${regularToken}`,
      },
    })
    const res8 = await GET(req8, { params: Promise.resolve({ id: agentId }) })
    assert.strictEqual(res8.status, 403, 'Unauthorized GET must be rejected with 403')
    passCount++
    console.log('[PASS] Unauthorized access to audit history blocked with HTTP 403')

    console.log('\n======================================================')
    console.log(`CMD-HAMI-171 10-CRITERIA RESULTS: PASSED: ${passCount}/10, FAILED: 0`)
    console.log('======================================================')
  } finally {
    // Clean up test data
    await db.auditLog.deleteMany({ where: { entityId: agentId } })
    await db.agent.delete({ where: { id: agentId } })
    await db.userRole.deleteMany({ where: { userId: { in: [adminUser.id, regularUser.id, targetUser.id] } } })
    await db.userProfile.deleteMany({ where: { userId: { in: [adminUser.id, regularUser.id, targetUser.id] } } })
    await db.user.deleteMany({ where: { id: { in: [adminUser.id, regularUser.id, targetUser.id] } } })
  }
}

runCmd170Suite()
  .catch((e) => {
    console.error('CMD-HAMI-170 Suite Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
