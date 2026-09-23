import { generateAccessToken } from '@/lib/jwt'
import { GET as getDashboardOverview } from '@/app/api/v1/dashboard/overview/route'
import { GET as getUsersList } from '@/app/api/v1/users/route'
import { NextRequest } from 'next/server'

async function runRbacAndSecurityAudit() {
  console.log('--- STARTING RBAC & SECURE DATA ACCESS AUDIT (MISSION 543) ---\n')

  // Generate test JWT tokens
  const adminToken = await generateAccessToken('user-admin-1', ['ADMIN'], ['manage_users', 'view_reports'])
  const regularUserToken = await generateAccessToken('user-reg-1', ['USER'], [])

  // 1. Test Unauthenticated Access on Dashboard Overview (Should return 401)
  console.log('1. Testing Unauthenticated Access -> /api/v1/dashboard/overview...')
  const req1 = new NextRequest('http://localhost:3000/api/v1/dashboard/overview')
  const res1 = await getDashboardOverview(req1)
  const data1 = await res1.json()
  if (res1.status === 401 && !data1.success) {
    console.log('   ✅ PASS (401 Unauthorized Blocked as expected)')
  } else {
    throw new Error(`Expected 401 Unauthorized, got status ${res1.status}`)
  }

  // 2. Test Forbidden Regular User Access on Dashboard Overview (Should return 403)
  console.log('2. Testing Forbidden Regular User Access -> /api/v1/dashboard/overview...')
  const req2 = new NextRequest('http://localhost:3000/api/v1/dashboard/overview', {
    headers: { Authorization: `Bearer ${regularUserToken}` },
  })
  const res2 = await getDashboardOverview(req2)
  const data2 = await res2.json()
  if (res2.status === 403 && !data2.success) {
    console.log('   ✅ PASS (403 Forbidden Blocked for non-admin role)')
  } else {
    throw new Error(`Expected 403 Forbidden, got status ${res2.status}`)
  }

  // 3. Test Authorized Admin Access on Dashboard Overview (Should return 200 OK)
  console.log('3. Testing Authorized Admin Access -> /api/v1/dashboard/overview...')
  const req3 = new NextRequest('http://localhost:3000/api/v1/dashboard/overview', {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const res3 = await getDashboardOverview(req3)
  const data3 = await res3.json()
  if (res3.status === 200 && data3.success && data3.data.kpis) {
    console.log('   ✅ PASS (200 OK - Dashboard Data Loaded with KPIs: ' + data3.data.kpis.activeUsers.value + ')')
  } else {
    throw new Error(`Expected 200 OK with data, got status ${res3.status}`)
  }

  // 4. Test Unauthenticated Access on Users List (Should return 401)
  console.log('4. Testing Unauthenticated Access -> /api/v1/users...')
  const req4 = new NextRequest('http://localhost:3000/api/v1/users')
  const res4 = await getUsersList(req4)
  const data4 = await res4.json()
  if (res4.status === 401 && !data4.success) {
    console.log('   ✅ PASS (401 Unauthorized Blocked on Users API)')
  } else {
    throw new Error(`Expected 401 Unauthorized, got status ${res4.status}`)
  }

  // 5. Test Authorized Admin Access on Users List with Filtering & Pagination (200 OK)
  console.log('5. Testing Authorized Admin Query -> /api/v1/users?role=ALL&page=1&pageSize=5...')
  const req5 = new NextRequest('http://localhost:3000/api/v1/users?role=ALL&page=1&pageSize=5', {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const res5 = await getUsersList(req5)
  const data5 = await res5.json()
  if (res5.status === 200 && data5.success && Array.isArray(data5.data.users)) {
    console.log('   ✅ PASS (200 OK - Retrieved ' + data5.data.users.length + ' users, Total count: ' + data5.data.totalCount + ')')
  } else {
    throw new Error(`Expected 200 OK with users array, got status ${res5.status}`)
  }

  // 6. Test Demo Controlled Query Flag -> /api/v1/users?demo=true
  console.log('6. Testing Demo Mode Fallback Flag -> /api/v1/users?demo=true...')
  const req6 = new NextRequest('http://localhost:3000/api/v1/users?demo=true', {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const res6 = await getUsersList(req6)
  const data6 = await res6.json()
  if (res6.status === 200 && data6.data.source === 'DEMO_FALLBACK') {
    console.log('   ✅ PASS (200 OK - Demo fallback verified safely)')
  } else {
    throw new Error(`Expected DEMO_FALLBACK source, got ${data6.data.source}`)
  }

  console.log('\n--- ALL RBAC & SECURITY AUDIT CHECKS PASSED (100%) ---')
}

runRbacAndSecurityAudit().catch((err) => {
  console.error('❌ Security Audit Failed:', err)
  process.exit(1)
})
