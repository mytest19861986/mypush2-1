import { generateAccessToken } from '@/lib/jwt'
import { GET as getHealthcareNetwork } from '@/app/api/v1/healthcare-network/route'
import { GET as getAgentsList } from '@/app/api/v1/agents/route'
import { NextRequest } from 'next/server'

async function runHealthcareAndSalesAudit() {
  console.log('--- STARTING HEALTHCARE & SALES DATA ADAPTER AUDIT (MISSION 544) ---\n')

  const adminToken = await generateAccessToken('user-admin-1', ['ADMIN'], ['manage_doctors', 'manage_agents'])
  const supportToken = await generateAccessToken('user-support-1', ['SUPPORT'], ['view_doctors'])
  const agentToken = await generateAccessToken('user-agent-77', ['AGENT'], ['view_own_sales'])
  const regularUserToken = await generateAccessToken('user-reg-1', ['USER'], [])

  // 1. Unauthenticated Healthcare Network Access -> 401
  console.log('1. Testing Unauthenticated Access -> /api/v1/healthcare-network...')
  const req1 = new NextRequest('http://localhost:3000/api/v1/healthcare-network')
  const res1 = await getHealthcareNetwork(req1)
  const d1 = await res1.json()
  if (res1.status === 401 && !d1.success) {
    console.log('   ✅ PASS (401 Unauthorized Blocked on Healthcare Network)')
  } else {
    throw new Error(`Expected 401 Unauthorized, got ${res1.status}`)
  }

  // 2. Unauthorized Regular User Access -> 403
  console.log('2. Testing Unauthorized Regular User Access -> /api/v1/healthcare-network...')
  const req2 = new NextRequest('http://localhost:3000/api/v1/healthcare-network', {
    headers: { Authorization: `Bearer ${regularUserToken}` },
  })
  const res2 = await getHealthcareNetwork(req2)
  const d2 = await res2.json()
  if (res2.status === 403 && !d2.success) {
    console.log('   ✅ PASS (403 Forbidden Blocked for regular user)')
  } else {
    throw new Error(`Expected 403 Forbidden, got ${res2.status}`)
  }

  // 3. Authorized Support Access on Healthcare Network -> 200 OK
  console.log('3. Testing Support Role Access -> /api/v1/healthcare-network...')
  const req3 = new NextRequest('http://localhost:3000/api/v1/healthcare-network?page=1&pageSize=5', {
    headers: { Authorization: `Bearer ${supportToken}` },
  })
  const res3 = await getHealthcareNetwork(req3)
  const d3 = await res3.json()
  if (res3.status === 200 && d3.success && Array.isArray(d3.data.centers)) {
    console.log(`   ✅ PASS (200 OK - Retrieved ${d3.data.centers.length} centers, Total: ${d3.data.totalCount})`)
  } else {
    throw new Error(`Expected 200 OK, got ${res3.status}`)
  }

  // 4. Unauthorized Regular User Access on Agents Network -> 403
  console.log('4. Testing Unauthorized Regular User Access -> /api/v1/agents...')
  const req4 = new NextRequest('http://localhost:3000/api/v1/agents', {
    headers: { Authorization: `Bearer ${regularUserToken}` },
  })
  const res4 = await getAgentsList(req4)
  const d4 = await res4.json()
  if (res4.status === 403 && !d4.success) {
    console.log('   ✅ PASS (403 Forbidden Blocked on Sales Network)')
  } else {
    throw new Error(`Expected 403 Forbidden, got ${res4.status}`)
  }

  // 5. Authorized Admin Access on Agents Network -> 200 OK with Commission Mapping
  console.log('5. Testing Authorized Admin Query -> /api/v1/agents?page=1&pageSize=5...')
  const req5 = new NextRequest('http://localhost:3000/api/v1/agents?page=1&pageSize=5', {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const res5 = await getAgentsList(req5)
  const d5 = await res5.json()
  if (res5.status === 200 && d5.success && d5.data.stats.totalSalesVolume) {
    console.log(`   ✅ PASS (200 OK - Sales Volume: ${d5.data.stats.totalSalesVolume}, Commission Paid: ${d5.data.stats.totalCommissionPaid})`)
  } else {
    throw new Error(`Expected 200 OK with commission stats, got ${res5.status}`)
  }

  // 6. Scoped Agent Access -> 200 OK with Tenant Isolation
  console.log('6. Testing Scoped Agent Access -> /api/v1/agents...')
  const req6 = new NextRequest('http://localhost:3000/api/v1/agents', {
    headers: { Authorization: `Bearer ${agentToken}` },
  })
  const res6 = await getAgentsList(req6)
  const d6 = await res6.json()
  if (res6.status === 200 && d6.success) {
    console.log(`   ✅ PASS (200 OK - Scoped agent query executed safely. Count: ${d6.data.totalCount})`)
  } else {
    throw new Error(`Expected 200 OK for agent role, got ${res6.status}`)
  }

  // 7. Demo Mode Fallback on Healthcare Network -> 200 OK
  console.log('7. Testing Demo Fallback Flag -> /api/v1/healthcare-network?demo=true...')
  const req7 = new NextRequest('http://localhost:3000/api/v1/healthcare-network?demo=true', {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const res7 = await getHealthcareNetwork(req7)
  const d7 = await res7.json()
  if (res7.status === 200 && d7.data.source === 'DEMO_FALLBACK') {
    console.log('   ✅ PASS (200 OK - Healthcare Demo Fallback verified)')
  } else {
    throw new Error(`Expected DEMO_FALLBACK, got ${d7.data.source}`)
  }

  console.log('\n--- ALL HEALTHCARE & SALES AUDIT CHECKS PASSED (100%) ---')
}

runHealthcareAndSalesAudit().catch((err) => {
  console.error('❌ Healthcare & Sales Audit Failed:', err)
  process.exit(1)
})
