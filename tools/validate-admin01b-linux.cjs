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
for (const name of ['package.json', 'bun.lock', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'tailwind.config.ts', 'eslint.config.mjs', 'components.json']) {
  if (fs.existsSync('/source/' + name)) fs.copyFileSync('/source/' + name, '/workspace/' + name)
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
if (hash(fs.readFileSync('/workspace/bun.lock')) !== '5d47f012358145e5716f0bffc78f232078b476f692e73037bc1eaca1425fea11') {
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
run('security-contracts-modelb', '/bun/bun', ['run', 'tests/contracts-consent-01b.ts'], {
  DATABASE_URL: 'file:/workspace/prisma/admin01b-sandbox.sqlite',
})
run('typecheck', process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'], {
  DATABASE_URL: 'file:/workspace/prisma/build-isolated.sqlite',
})
run('lint-changed', process.execPath, ['node_modules/eslint/bin/eslint.js',
  'src/app/api/v1/contracts/route.ts', 'src/app/admin/layout.tsx',
  'src/app/dashboard-premium-preview/page.tsx', 'src/components/shared/analytics-charts-block.tsx',
], { DATABASE_URL: 'file:/workspace/prisma/build-isolated.sqlite' })
run('build', process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], {
  DATABASE_URL: 'file:/workspace/prisma/build-isolated.sqlite',
})
results.referenceFixture = { unchanged: hash(fs.readFileSync('/fixtures/reference.sqlite')) === fixtureBefore, sha256: fixtureBefore }
fs.writeFileSync('/workspace/reports/results.json', JSON.stringify(results, null, 2))
process.exitCode = Object.entries(results).some(([name, value]) => name === 'referenceFixture' ? !value.unchanged : value.exit !== 0) ? 1 : 0
