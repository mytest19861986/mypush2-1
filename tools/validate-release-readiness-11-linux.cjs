const fs = require('node:fs')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

if (fs.existsSync('/workspace/src')) throw new Error('Use a fresh isolated workspace volume; existing work is preserved.')
for (const dir of ['src', 'public', 'scripts', 'tests']) {
  if (fs.existsSync('/source/' + dir)) fs.cpSync('/source/' + dir, '/workspace/' + dir, { recursive: true })
}
fs.mkdirSync('/workspace/prisma', { recursive: true })
fs.mkdirSync('/workspace/reports', { recursive: true })
fs.copyFileSync('/source/prisma/schema.prisma', '/workspace/prisma/schema.prisma')
fs.cpSync('/source/prisma/migrations', '/workspace/prisma/migrations', { recursive: true })
for (const name of ['package.json', 'bun.lock', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts', 'eslint.config.mjs', 'components.json']) {
  if (fs.existsSync('/source/' + name)) fs.copyFileSync('/source/' + name, '/workspace/' + name)
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
if (hash(fs.readFileSync('/workspace/bun.lock', 'utf8').replace(/\r\n/g, '\n')) !== '5d47f012358145e5716f0bffc78f232078b476f692e73037bc1eaca1425fea11') {
  throw new Error('Frozen candidate dependency lock changed')
}
const fixtureBefore = hash(fs.readFileSync('/fixtures/reference.sqlite'))
fs.copyFileSync('/fixtures/reference.sqlite', '/workspace/prisma/admin01b-sandbox.sqlite')
const env = {
  ...process.env, NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production',
  JWT_SECRET: 'isolated-admin01b-test-secret-never-for-deployment',
  TOKEN_PEPPER: 'isolated-admin01b-test-pepper-never-for-deployment',
  PRISMA_QUERY_ENGINE_LIBRARY: '/artifacts/libquery_engine-debian-openssl-3.0.x.so.node',
}
const results = {}
function run(name, executable, args, overrides = {}) {
  const result = spawnSync(executable, args, {
    cwd: '/workspace', env: { ...env, ...overrides }, encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024, timeout: 300000,
  })
  fs.writeFileSync('/workspace/reports/' + name + '.txt', (result.stdout || '') + (result.stderr || ''))
  results[name] = { exit: result.status, signal: result.signal, error: result.error?.message ?? null }
  console.log(name + ': ' + JSON.stringify(results[name]))
}
run('prisma-generate', process.execPath, ['node_modules/prisma/build/index.js', 'generate', '--schema', 'prisma/schema.prisma'], { DATABASE_URL: 'file:/workspace/prisma/build-isolated.sqlite', PRISMA_SCHEMA_ENGINE_BINARY: '/artifacts/schema-engine-debian-openssl-3.0.x' })
if (results['prisma-generate'].exit !== 0) { fs.writeFileSync('/workspace/reports/results.json', JSON.stringify(results, null, 2)); process.exit(1) }
run('security-contracts-modelb', '/bun/bun', ['run', 'tests/contracts-consent-01b.ts'], {
  DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite',
})
run('auth-hardening', '/bun/bun', ['run', 'tests/auth-hardening-07.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('patient-consent-containment', '/bun/bun', ['run', 'tests/patient-consent-containment-02.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('admin-reports-medical-code', '/bun/bun', ['run', 'tests/admin-reports-01a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('admin-call-logs', '/bun/bun', ['run', 'tests/admin-call-logs-01a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('admin-dashboard-summary', '/bun/bun', ['run', 'tests/admin-dashboard-summary-01a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('admin-user-service-usage', '/bun/bun', ['run', 'tests/admin-user-service-usage-01a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('admin-agent-scope', '/bun/bun', ['run', 'tests/admin-agent-scope-01a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('admin-role-assignment', '/bun/bun', ['run', 'tests/admin-role-assignment-01a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('admin-reviews', '/bun/bun', ['run', 'tests/admin-reviews-01a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
fs.copyFileSync('/workspace/prisma/admin01b-sandbox.sqlite', '/workspace/payment-sandbox.sqlite')
run('payment-permission-matrix', '/bun/bun', ['run', 'tests/commission-payment-permissions-01.ts'], { DATABASE_URL: 'file:/workspace/payment-sandbox.sqlite' })
run('profile-link', '/bun/bun', ['run', 'tests/profile-link-08a.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('profile-link-lint', process.execPath, ['node_modules/eslint/bin/eslint.js', 'src/lib/plan-holder-linking.ts', 'src/app/api/v1/users/profile/route.ts', 'src/app/user/profile/page.tsx', 'src/app/user/dashboard/page.tsx', 'tests/profile-link-08a.ts'])
run('referral-stats', '/bun/bun', ['run', 'tests/referral-stats-11.ts'], { DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite' })
run('referral-stats-lint', process.execPath, ['node_modules/eslint/bin/eslint.js', 'src/app/api/v1/referrals/stats/route.ts', 'src/lib/referral-stats-contract.ts', 'src/app/user/dashboard/page.tsx', 'tests/referral-stats-11.ts'])
run('typecheck', process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'], {
  DATABASE_URL: 'file:/workspace/prisma/build-isolated.sqlite',
})
run('lint-changed', process.execPath, ['node_modules/eslint/bin/eslint.js',
    'src/app/commission-payments/page.tsx', 'src/app/api/v1/commission-payments/route.ts', 'src/components/shared/commission-payment-entry.tsx', 'src/app/auth/login/page.tsx', 'src/app/user/layout.tsx', 'src/app/doctor/layout.tsx', 'src/app/agent/layout.tsx', 'src/lib/commission-permissions.ts', 'src/lib/commission-payment-access.ts', 'src/lib/wallets.ts', 'src/app/api/v1/commissions/[id]/pay/route.ts', 'src/app/admin/commissions/page.tsx', 'src/app/api/v1/contracts/route.ts', 'src/app/api/v1/doctors/[id]/route.ts',
    'src/app/api/v1/doctors/[id]/performance/route.ts', 'src/app/api/v1/agents/[id]/performance/route.ts',
    'src/app/doctors-clinics-premium-preview/page.tsx', 'src/app/agents-premium-preview/page.tsx',
    'src/app/dashboard-premium-preview/page.tsx', 'src/components/shared/dashboard-app-shell.tsx',
    'src/components/shared/analytics-charts-block.tsx', 'src/components/shared/jalali-iso-date-range-filter.tsx',
    'src/utils/report-month-label.ts', 'src/utils/report-date-range.ts', 'src/lib/report-client.ts', 'src/lib/medical-code.ts',
    'src/app/api/v1/admin/agents/[id]/performance/route.ts', 'src/components/shared/admin-agent-scoped-report.tsx',
    'src/app/admin/agents/[id]', 'src/app/api/v1/sales-customers/route.ts', 'src/app/admin/sales-customers/page.tsx',
    'src/app/api/v1/agents/route.ts', 'src/components/shared/admin-agent-recent-commissions.tsx',
    'src/app/admin/reviews/page.tsx',
    'src/app/api/v1/admin/users/[id]/roles/route.ts', 'src/components/shared/admin-user-role-assignment.tsx',
    'src/app/api/v1/admin/users/[id]/profile-summary/route.ts', 'src/lib/user-service-usage.ts',
    'src/components/shared/admin-user-service-usage.tsx', 'src/app/users-premium-preview/page.tsx',
    'src/app/api/v1/admin/dashboard-summary', 'src/components/shared/admin-dashboard-data.tsx',
    'src/components/shared/tehran-clock.tsx', 'src/lib/current-permissions.ts',
    'src/app/api/v1/admin/call-logs', 'src/lib/call-log-access.ts', 'src/lib/call-log-contract.ts',
    'src/components/shared/admin-activity-overview.tsx', 'src/components/shared/jalali-date-range-filter.tsx',
  ], { DATABASE_URL: 'file:/workspace/prisma/build-isolated.sqlite' })
run('containment-lint', process.execPath, ['node_modules/eslint/bin/eslint.js', 'src/app/api/v1/contracts/[id]/route.ts', 'tests/patient-consent-containment-02.ts'])
run('auth-hardening-lint', process.execPath, ['node_modules/eslint/bin/eslint.js', 'src/lib/auth.ts', 'tests/auth-hardening-07.ts'])
run('build', process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], {
  DATABASE_URL: 'file:/workspace/prisma/build-isolated.sqlite',
})
if (results.build.exit === 0) run('standalone-assets', process.execPath, ['scripts/copy-standalone-assets.mjs'])
const sourceInputs = {}
function recordInputs(directory) {
  for (const entry of fs.readdirSync('/workspace/' + directory, { withFileTypes: true })) {
    const relative = directory + '/' + entry.name
    if (entry.isDirectory()) recordInputs(relative)
    else if (!relative.endsWith('.sqlite') && !relative.endsWith('.sqlite-journal')) sourceInputs[relative] = hash(fs.readFileSync('/workspace/' + relative))
  }
}
for (const directory of ['src', 'tests', 'prisma']) recordInputs(directory)
fs.writeFileSync('/workspace/reports/input-manifest.json', JSON.stringify({
  scope: 'Isolated local candidate only; does not attest active Test',
  sourceCommit: process.env.SOURCE_COMMIT || null,
  buildId: fs.existsSync('/workspace/.next/BUILD_ID') ? fs.readFileSync('/workspace/.next/BUILD_ID', 'utf8').trim() : null,
  packageSha256: hash(fs.readFileSync('/workspace/package.json')),
  lockSha256: hash(fs.readFileSync('/workspace/bun.lock', 'utf8').replace(/\r\n/g, '\n')),
  sources: sourceInputs,
}, null, 2))
results.referenceFixture = { unchanged: hash(fs.readFileSync('/fixtures/reference.sqlite')) === fixtureBefore, sha256: fixtureBefore }
fs.writeFileSync('/workspace/reports/results.json', JSON.stringify(results, null, 2))
process.exitCode = Object.entries(results).some(([name, value]) => name === 'referenceFixture' ? !value.unchanged : value.exit !== 0) ? 1 : 0
