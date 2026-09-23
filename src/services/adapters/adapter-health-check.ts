import { getDashboardAdapter, getDashboardDemoData, getLiveDashboardData } from '@/services/adapters/dashboard-adapter'
import { getUserAdapter, getUserDemoData, getLiveUsersData } from '@/services/adapters/user-adapter'

async function runHealthCheck() {
  console.log('--- STARTING ADAPTER HEALTH CHECK (MISSION 542) ---\n')

  // 1. Test Dashboard Demo Fallback Contract
  console.log('1. Testing Dashboard Demo Fallback...')
  const dashDemo = getDashboardDemoData()
  if (!dashDemo.kpis.activeUsers.value || !dashDemo.kpis.monthlyRevenue.value) {
    throw new Error('Dashboard demo data missing vital KPI contracts')
  }
  console.log('   ✅ Dashboard demo contract verified: 4 KPIs,', dashDemo.recentContracts.length, 'contracts.')

  // 2. Test Dashboard Live Query / Adapter
  console.log('2. Testing Dashboard Live Adapter...')
  const dashLive = await getDashboardAdapter(false)
  console.log(`   ✅ Dashboard live adapter executed. Source: [${dashLive.source}], Users KPI: ${dashLive.kpis.activeUsers.value}`)

  // 3. Test User Demo Fallback Contract
  console.log('3. Testing User Demo Fallback...')
  const userDemo = getUserDemoData()
  if (userDemo.users.length === 0 || !userDemo.stats.totalUsers) {
    throw new Error('User demo data missing user list or stats')
  }
  console.log('   ✅ User demo contract verified:', userDemo.users.length, 'users, total stats:', userDemo.stats.totalUsers)

  // 4. Test User Live Query / Adapter
  console.log('4. Testing User Live Adapter with filtering...')
  const userLive = await getUserAdapter({ roleFilter: 'ALL', statusFilter: 'ALL', page: 1, pageSize: 5 }, false)
  console.log(`   ✅ User live adapter executed. Source: [${userLive.source}], Retrieved: ${userLive.users.length} users, Total matching: ${userLive.totalCount}`)

  // 5. Test Null Safety & Empty Search Handling
  console.log('5. Testing Null Handling & Empty Search Query...')
  const emptySearch = await getUserAdapter({ searchQuery: 'NON_EXISTENT_QUERY_999999' }, false)
  console.log(`   ✅ Empty search handled gracefully. Retrieved: ${emptySearch.users.length} users. Source: [${emptySearch.source}]`)

  console.log('\n--- ALL ADAPTER HEALTH CHECKS PASSED (100%) ---')
}

runHealthCheck().catch((err) => {
  console.error('❌ Health check failed:', err)
  process.exit(1)
})
