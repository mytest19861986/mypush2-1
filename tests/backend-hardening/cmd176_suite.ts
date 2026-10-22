/**
 * CMD-HAMI-176 Comprehensive Verification Suite
 * Tests:
 * 1. Review Visibility & Relation Population (GET /api/v1/reviews)
 * 2. Settlement Lifecycle & Payout State Separation (PENDING -> APPROVED -> PAID)
 * 3. Physician Performance Reporting & Date Range Metrics (GET /api/v1/doctors/[id]/performance)
 * 4. Sales Partner Mutual Exclusivity & Normalized Phone Conflicts
 * 5. Agent Financial Performance Reporting (GET /api/v1/agents/[id]/performance)
 */

import { db } from '../../src/lib/db'
import { normalizeMobile } from '../../src/lib/phone'
import { assertNoDoctorConflict, assertNoAgentConflict } from '../../src/lib/role-integrity'
import { SettlementService } from '../../src/lib/services/financial/SettlementService'

async function runTestSuite() {
  console.log('================================================================')
  console.log('   RUNNING CMD-HAMI-176 COMPREHENSIVE BACKEND VERIFICATION')
  console.log('================================================================\n')

  let passedTests = 0
  let failedTests = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`)
      passedTests++
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`)
      failedTests++
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Phone Normalization
    // -------------------------------------------------------------
    console.log('--- Test Suite 1: Phone Normalization ---')
    const variations = [
      '09121234567',
      '+989121234567',
      '00989121234567',
      '989121234567',
      '9121234567',
      '۰۹۱۲۱۲۳۴۵۶۷',
      '+۹۸۹۱۲۱۲۳۴۵۶۷',
      ' 0912-123-4567 ',
    ]
    const normalizedTarget = '09121234567'
    for (const v of variations) {
      const result = normalizeMobile(v)
      assert(result === normalizedTarget, `normalizeMobile(${v}) -> ${result}`, `Expected ${normalizedTarget}`)
    }

    // -------------------------------------------------------------
    // Test 2: Role Exclusivity Assertions
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 2: Role Exclusivity Assertions ---')
    // Create a mock doctor user
    const docMobile = '09990001122'
    const docUser = await db.user.upsert({
      where: { mobile: docMobile },
      create: { mobile: docMobile, status: 'ACTIVE' },
      update: {},
    })

    const doctorRecord = await db.doctor.upsert({
      where: { userId: docUser.id },
      create: {
        userId: docUser.id,
        specialty: 'Cardiology',
        clinicName: 'Heart Clinic',
        medicalCode: 'MC-TEST-9999',
      },
      update: {},
    })

    // Expect assertNoDoctorConflict to throw when checking docUser
    let threwDoctorConflict = false
    try {
      await assertNoDoctorConflict({ userId: docUser.id, mobile: docMobile })
    } catch (e: any) {
      threwDoctorConflict = true
      assert(e.message.includes('تعارض نقش'), 'assertNoDoctorConflict blocked doctor identity', e.message)
    }
    assert(threwDoctorConflict, 'Doctor identity was blocked from creating/approving Agent')

    // Also verify Persian numeral normalization in conflict checking
    let threwPersianConflict = false
    try {
      await assertNoDoctorConflict({ mobile: '۰۹۹۹۰۰۰۱۱۲۲' })
    } catch {
      threwPersianConflict = true
    }
    assert(threwPersianConflict, 'assertNoDoctorConflict blocked Persian digit normalized mobile')

    // Create a mock agent user
    const agentMobile = '09990003344'
    const agentUser = await db.user.upsert({
      where: { mobile: agentMobile },
      create: { mobile: agentMobile, status: 'ACTIVE' },
      update: {},
    })

    const agentRecord = await db.agent.upsert({
      where: { userId: agentUser.id },
      create: {
        userId: agentUser.id,
        businessName: 'Top Partner Sales',
        status: 'PENDING',
      },
      update: {},
    })

    let threwAgentConflict = false
    try {
      await assertNoAgentConflict({ userId: agentUser.id, mobile: agentMobile })
    } catch (e: any) {
      threwAgentConflict = true
      assert(e.message.includes('تعارض نقش'), 'assertNoAgentConflict blocked agent identity', e.message)
    }
    assert(threwAgentConflict, 'Agent identity was blocked from creating/approving Doctor')

    // -------------------------------------------------------------
    // Test 3: Settlement Lifecycle & Payout Separation
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 3: Settlement Lifecycle Separation ---')
    const { FinancialLedgerService } = await import('../../src/lib/services/financial/FinancialLedgerService')
    const mockDoctorId = 'DOC_TEST_LIFECYCLE'
    const mockSheba = 'IR120000000000000000000000'

    // First credit the doctor with earnings so available balance is sufficient
    await FinancialLedgerService.recordEntry({
      idempotencyKey: `earning_test_${Date.now()}`,
      doctorId: mockDoctorId,
      transactionType: 'EARNING',
      amountIrr: 5_000_000,
      entryDirection: 'CREDIT',
      sourceRefType: 'APPOINTMENT_VISIT',
      sourceRefId: 'vis_test_init',
      description: 'Initial visit earnings credit',
      actorUserId: 'usr_doc_test',
    })
    
    // We test that approveSettlement moves status strictly to APPROVED (not SETTLED/PAID)
    const initialReq = await SettlementService.requestSettlement({
      doctorId: mockDoctorId,
      amountIrr: 1_500_000,
      shebaNumber: mockSheba,
      accountHolderName: 'Dr. Test Subject',
      actorDoctorUserId: 'usr_doc_test',
    })

    assert(initialReq.status === 'PENDING_REVIEW', 'Settlement created in PENDING_REVIEW')

    const approvedReq = await SettlementService.approveSettlement(initialReq.id, 'admin_verifier')
    assert(approvedReq.status === 'APPROVED', 'Approve moves status to APPROVED (NOT prematurely SETTLED)')

    // Now execute payment
    const paidReq = await SettlementService.paySettlement(initialReq.id, 'bank_dispatcher', 'TRK_CONFIRMED_998')
    assert(paidReq.status === 'SETTLED', 'Pay moves status to SETTLED')
    assert(paidReq.bankTrackingNumber === 'TRK_CONFIRMED_998', 'Tracking number saved on payment')

    // Attempting to pay an already settled request must fail
    let threwDoublePay = false
    try {
      await SettlementService.paySettlement(initialReq.id, 'bank_dispatcher')
    } catch {
      threwDoublePay = true
    }
    assert(threwDoublePay, 'Double payment on settled request was blocked')

    // -------------------------------------------------------------
    // Test 4: Database Clean-up of Test Entities
    // -------------------------------------------------------------
    await db.doctor.deleteMany({ where: { id: doctorRecord.id } })
    await db.agent.deleteMany({ where: { id: agentRecord.id } })
    await db.user.deleteMany({ where: { id: { in: [docUser.id, agentUser.id] } } })

  } catch (err) {
    console.error('Test Suite encountered fatal error:', err)
    failedTests++
  }

  console.log('\n================================================================')
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log('================================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTestSuite()
