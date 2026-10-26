const fs = require('node:fs')
const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
if (fs.existsSync('/workspace/src')) throw Error('Use a fresh isolated workspace volume')
for (const directory of ['src', 'public', 'scripts', 'tests']) if (fs.existsSync('/source/' + directory)) fs.cpSync('/source/' + directory, '/workspace/' + directory, { recursive: true })
fs.mkdirSync('/workspace/prisma', { recursive: true })
fs.copyFileSync('/source/prisma/schema.prisma', '/workspace/prisma/schema.prisma')
fs.cpSync('/source/prisma/migrations', '/workspace/prisma/migrations', { recursive: true })
for (const name of ['package.json', 'bun.lock', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts', 'eslint.config.mjs', 'components.json']) if (fs.existsSync('/source/' + name)) fs.copyFileSync('/source/' + name, '/workspace/' + name)
fs.mkdirSync('/workspace/reports', { recursive: true })
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const canonicalLockHash = createHash('sha256').update(fs.readFileSync('/workspace/bun.lock', 'utf8').replace(/\r\n/g, '\n')).digest('hex')
if (canonicalLockHash !== '5d47f012358145e5716f0bffc78f232078b476f692e73037bc1eaca1425fea11') throw Error('Frozen dependency lock changed')
const fixtureHash = digest('/fixtures/prisma/admin01b-sandbox.sqlite')
fs.copyFileSync('/fixtures/prisma/admin01b-sandbox.sqlite', '/workspace/payment-sandbox.sqlite')
const results = {}
const env = { ...process.env, DATABASE_URL: 'file:/workspace/payment-sandbox.sqlite', JWT_SECRET: 'isolated-payment-test-secret-never-for-deployment', TOKEN_PEPPER: 'isolated-payment-test-pepper-never-for-deployment', NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production', PRISMA_QUERY_ENGINE_LIBRARY: '/artifacts/libquery_engine-debian-openssl-3.0.x.so.node' }
function run(name, executable, args) {
  const result = spawnSync(executable, args, { cwd: '/workspace', env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 300000 })
  results[name] = { exit: result.status, signal: result.signal, error: result.error?.message ?? null }
  fs.writeFileSync('/workspace/reports/' + name + '.txt', (result.stdout || '') + (result.stderr || ''))
  console.log(name + ': ' + JSON.stringify(results[name]))
}
run('payment-permission-matrix', '/bun/bun', ['run', 'tests/commission-payment-permissions-01.ts'])
run('typecheck', process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'])
run('lint', process.execPath, ['node_modules/eslint/bin/eslint.js', 'src/lib/commission-permissions.ts', 'src/lib/commission-payment-access.ts', 'src/lib/wallets.ts', 'src/app/api/v1/commissions/[id]/pay/route.ts', 'src/app/admin/commissions/page.tsx'])
if (process.env.FULL_BUILD === '1') {
  run('build', process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'])
  if (results.build.exit === 0) run('standalone-assets', process.execPath, ['scripts/copy-standalone-assets.mjs'])
}
const sources = {}
function recordInputs(directory) {
  for (const entry of fs.readdirSync('/workspace/' + directory, { withFileTypes: true })) {
    const relative = directory + '/' + entry.name
    if (entry.isDirectory()) recordInputs(relative)
    else sources[relative] = digest('/workspace/' + relative)
  }
}
for (const directory of ['src', 'tests', 'prisma']) recordInputs(directory)
fs.writeFileSync('/workspace/reports/input-manifest.json', JSON.stringify({ sources, lockRawSha256: digest('/workspace/bun.lock'), lockCanonicalSha256: canonicalLockHash, buildId: fs.existsSync('/workspace/.next/BUILD_ID') ? fs.readFileSync('/workspace/.next/BUILD_ID', 'utf8').trim() : null, scope: 'Independent local payment-permission worktree; no active Test provenance claim' }, null, 2))
fs.writeFileSync('/workspace/reports/results.json', JSON.stringify(results, null, 2))
fs.writeFileSync('/workspace/reports/fixture-preservation.json', JSON.stringify({ sha256: fixtureHash, unchanged: digest('/fixtures/prisma/admin01b-sandbox.sqlite') === fixtureHash, scope: 'Read-only synthetic Build F test fixture, not a live database' }, null, 2))
process.exitCode = Object.values(results).some(result => result.exit !== 0) ? 1 : 0
