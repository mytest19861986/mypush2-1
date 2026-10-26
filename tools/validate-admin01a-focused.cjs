const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
if (fs.existsSync('/workspace/src')) throw Error('A fresh workspace volume is required')
for (const directory of ['src', 'tests', 'prisma']) fs.cpSync('/source/' + directory, '/workspace/' + directory, { recursive: true })
for (const name of ['package.json', 'tsconfig.json', 'next-env.d.ts', 'eslint.config.mjs']) {
  if (fs.existsSync('/source/' + name)) fs.copyFileSync('/source/' + name, '/workspace/' + name)
}
fs.copyFileSync('/fixtures/reference.sqlite', '/workspace/prisma/admin01b-sandbox.sqlite')
fs.mkdirSync('/workspace/reports', { recursive: true })
const env = {
  ...process.env, NODE_ENV: 'production', DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite',
  JWT_SECRET: 'isolated-admin01a-test-secret-never-for-deployment',
  TOKEN_PEPPER: 'isolated-admin01a-test-pepper-never-for-deployment',
  PRISMA_QUERY_ENGINE_LIBRARY: '/artifacts/libquery_engine-debian-openssl-3.0.x.so.node',
  PRISMA_SCHEMA_ENGINE_BINARY: '/artifacts/schema-engine-debian-openssl-3.0.x',
}
const checks = [
  ['security-contracts-modelb', '/bun/bun', ['run', 'tests/contracts-consent-01b.ts']],
  ['admin-reports-medical-code', '/bun/bun', ['run', 'tests/admin-reports-01a.ts']],
  ['admin-call-logs', '/bun/bun', ['run', 'tests/admin-call-logs-01a.ts']],
  ['admin-dashboard-summary', '/bun/bun', ['run', 'tests/admin-dashboard-summary-01a.ts']],
  ['admin-user-service-usage', '/bun/bun', ['run', 'tests/admin-user-service-usage-01a.ts']],
  ['admin-agent-scope', '/bun/bun', ['run', 'tests/admin-agent-scope-01a.ts']],
  ['admin-role-assignment', '/bun/bun', ['run', 'tests/admin-role-assignment-01a.ts']],
  ['admin-reviews', '/bun/bun', ['run', 'tests/admin-reviews-01a.ts']],
  ['typecheck', process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false']],
  ['lint-changed', process.execPath, ['node_modules/eslint/bin/eslint.js',
    'src/app/api/v1/contracts/route.ts', 'src/app/api/v1/doctors/[id]/route.ts',
    'src/app/api/v1/doctors/[id]/performance/route.ts', 'src/app/api/v1/agents/[id]/performance/route.ts',
    'src/app/doctors-clinics-premium-preview/page.tsx', 'src/app/agents-premium-preview/page.tsx',
    'src/app/dashboard-premium-preview/page.tsx', 'src/components/shared/dashboard-app-shell.tsx',
    'src/components/shared/analytics-charts-block.tsx', 'src/components/shared/jalali-iso-date-range-filter.tsx',
    'src/utils/report-date-range.ts', 'src/lib/report-client.ts', 'src/lib/medical-code.ts',
    'src/app/api/v1/admin/call-logs', 'src/lib/call-log-access.ts', 'src/lib/call-log-contract.ts',
    'src/components/shared/admin-activity-overview.tsx', 'src/components/shared/jalali-date-range-filter.tsx',
    'src/app/api/v1/admin/agents/[id]/performance/route.ts', 'src/components/shared/admin-agent-scoped-report.tsx',
    'src/app/admin/agents/[id]', 'src/app/api/v1/sales-customers/route.ts', 'src/app/admin/sales-customers/page.tsx',
    'src/app/api/v1/agents/route.ts', 'src/components/shared/admin-agent-recent-commissions.tsx',
    'src/app/admin/reviews/page.tsx',
    'src/app/api/v1/admin/users/[id]/roles/route.ts', 'src/components/shared/admin-user-role-assignment.tsx',
    'src/app/api/v1/admin/users/[id]/profile-summary/route.ts', 'src/lib/user-service-usage.ts',
    'src/components/shared/admin-user-service-usage.tsx', 'src/app/users-premium-preview/page.tsx',
    'src/app/api/v1/admin/dashboard-summary', 'src/components/shared/admin-dashboard-data.tsx',
    'src/components/shared/tehran-clock.tsx', 'src/lib/current-permissions.ts',
  ]],
]
const results = {}
for (const [name, executable, args] of checks) {
  const result = spawnSync(executable, args, { cwd: '/workspace', env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 })
  fs.writeFileSync('/workspace/reports/' + name + '.txt', (result.stdout || '') + (result.stderr || ''))
  results[name] = { exit: result.status, signal: result.signal, error: result.error?.message ?? null }
  console.log(name + ': ' + JSON.stringify(results[name]))
  if (name === 'security-contracts-modelb' && result.status !== 0) break
}
fs.writeFileSync('/workspace/reports/results.json', JSON.stringify(results, null, 2))
process.exitCode = Object.values(results).some(result => result.exit !== 0) ? 1 : 0
