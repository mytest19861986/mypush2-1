import { generateAccessToken } from '@/lib/jwt'
import { GET as getDashboardOverview } from '@/app/api/v1/dashboard/overview/route'
import { GET as getUsersList } from '@/app/api/v1/users/route'
import { GET as getHealthcareNetwork } from '@/app/api/v1/healthcare-network/route'
import { GET as getAgentsList } from '@/app/api/v1/agents/route'
import { GET as getReportsBi } from '@/app/api/v1/reports-bi/route'
import { NextRequest } from 'next/server'

async function runEndToEndPhase3Validation() {
  console.log('=== STARTING PHASE 3 END-TO-END SYSTEM VALIDATION (MISSION 545) ===\n')

  const superAdminToken = await generateAccessToken('user-super-1', ['SUPER_ADMIN', 'ADMIN'], ['all'])
  const supportToken = await generateAccessToken('user-support-1', ['SUPPORT'], ['view_doctors', 'view_users'])
  const regularUserToken = await generateAccessToken('user-reg-1', ['USER'], [])

  // 1. Dashboard Overview E2E Test
  console.log('1. [Dashboard KPI E2E] Testing /api/v1/dashboard/overview...')
  const dashRes = await getDashboardOverview(new NextRequest('http://localhost:3000/api/v1/dashboard/overview', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  }))
  const dashData = await dashRes.json()
  if (dashRes.status === 200 && dashData.data.kpis.activeUsers) {
    console.log(`   ✅ PASS (Status 200 - Active Users: ${dashData.data.kpis.activeUsers.value}, Source: ${dashData.data.source})`)
  } else {
    throw new Error('Dashboard E2E failed')
  }

  // 2. Users Management E2E Test
  console.log('2. [Users Management E2E] Testing /api/v1/users?role=ALL&page=1&pageSize=5...')
  const usersRes = await getUsersList(new NextRequest('http://localhost:3000/api/v1/users?role=ALL&page=1&pageSize=5', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  }))
  const usersData = await usersRes.json()
  if (usersRes.status === 200 && Array.isArray(usersData.data.users)) {
    console.log(`   ✅ PASS (Status 200 - Returned ${usersData.data.users.length} users, Total: ${usersData.data.totalCount})`)
  } else {
    throw new Error('Users E2E failed')
  }

  // 3. Healthcare Analytics E2E Test
  console.log('3. [Healthcare Network E2E] Testing /api/v1/healthcare-network...')
  const healthRes = await getHealthcareNetwork(new NextRequest('http://localhost:3000/api/v1/healthcare-network?page=1&pageSize=5', {
    headers: { Authorization: `Bearer ${supportToken}` },
  }))
  const healthData = await healthRes.json()
  if (healthRes.status === 200 && healthData.data.centers) {
    console.log(`   ✅ PASS (Status 200 - Centers: ${healthData.data.centers.length}, Total Doctors: ${healthData.data.stats.totalDoctors})`)
  } else {
    throw new Error('Healthcare Network E2E failed')
  }

  // 4. Sales Network & Commission E2E Test
  console.log('4. [Sales & Commission E2E] Testing /api/v1/agents...')
  const agentsRes = await getAgentsList(new NextRequest('http://localhost:3000/api/v1/agents?page=1&pageSize=5', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  }))
  const agentsData = await agentsRes.json()
  if (agentsRes.status === 200 && agentsData.data.agents) {
    console.log(`   ✅ PASS (Status 200 - Agents: ${agentsData.data.agents.length}, Volume: ${agentsData.data.stats.totalSalesVolume})`)
  } else {
    throw new Error('Sales Network E2E failed')
  }

  // 5. Reports & BI Executive Access E2E Test
  console.log('5. [Reports & BI Executive E2E] Testing /api/v1/reports-bi...')
  const biRes = await getReportsBi(new NextRequest('http://localhost:3000/api/v1/reports-bi', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  }))
  const biData = await biRes.json()
  if (biRes.status === 200 && biData.data.kpis.totalHealthcareRevenue) {
    console.log(`   ✅ PASS (Status 200 - Total Revenue: ${biData.data.kpis.totalHealthcareRevenue}, Top Centers: ${biData.data.topCenters.length})`)
  } else {
    throw new Error('Reports & BI E2E failed')
  }

  // 6. Security Check: Unauthorized user blocked from Reports & BI (403 Forbidden)
  console.log('6. [Security RBAC Barrier] Testing unauthorized access on /api/v1/reports-bi...')
  const unauthBiRes = await getReportsBi(new NextRequest('http://localhost:3000/api/v1/reports-bi', {
    headers: { Authorization: `Bearer ${regularUserToken}` },
  }))
  const unauthBiData = await unauthBiRes.json()
  if (unauthBiRes.status === 403 && !unauthBiData.success) {
    console.log('   ✅ PASS (Status 403 Forbidden - Non-admin strictly blocked)')
  } else {
    throw new Error(`Expected 403, got ${unauthBiRes.status}`)
  }

  // 7. Security Check: Support user blocked from Reports & BI (403 Forbidden)
  console.log('7. [Security RBAC Barrier] Testing Support role blocked on financial BI...')
  const supportBiRes = await getReportsBi(new NextRequest('http://localhost:3000/api/v1/reports-bi', {
    headers: { Authorization: `Bearer ${supportToken}` },
  }))
  if (supportBiRes.status === 403) {
    console.log('   ✅ PASS (Status 403 Forbidden - Support role denied from executive financial metrics)')
  } else {
    throw new Error(`Expected 403, got ${supportBiRes.status}`)
  }

  // 8. Controlled Demo Fallback Verification
  console.log('8. [Demo Fallback Safety] Testing ?demo=true flag on /api/v1/reports-bi...')
  const demoBiRes = await getReportsBi(new NextRequest('http://localhost:3000/api/v1/reports-bi?demo=true', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  }))
  const demoBiData = await demoBiRes.json()
  if (demoBiRes.status === 200 && demoBiData.data.source === 'DEMO_FALLBACK') {
    console.log('   ✅ PASS (Status 200 - DEMO_FALLBACK safely preserved)')
  } else {
    throw new Error('Demo fallback verification failed')
  }

  console.log('\n=== ALL 8 END-TO-END VALIDATION GATES PASSED (100%) ===')
}

runEndToEndPhase3Validation().catch((err) => {
  console.error('❌ E2E Validation Gate Failed:', err)
  process.exit(1)
})
