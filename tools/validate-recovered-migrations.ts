import { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { strict as assert } from 'node:assert'
import { inspectRecoveredHistory } from './migration-history-preflight'

const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const fixturePath = process.env.PARTIAL_FIXTURE === '1' ? '/partial/mixed-consistent.sqlite' : '/fixtures/reference.sqlite'
const sourceHash = digest(readFileSync(fixturePath))
const results: Record<string, unknown> = {}
function snapshot(path: string) {
  const db = new Database(path, { readonly: true })
  try {
    const names = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name").all() as { name: string }[]
    return Object.fromEntries(names.map(({ name }) => [name, digest(JSON.stringify(db.query(`SELECT * FROM "${name.replaceAll('"', '""')}" ORDER BY rowid`).all()))]))
  } finally { db.close() }
}
function command(name: string, path: string, args: string[]) {
  const run = spawnSync('/usr/local/bin/node', ['/runtime/node_modules/prisma/build/index.js', ...args], {
    cwd: '/source', env: { ...process.env, DATABASE_URL: 'file:' + path, PRISMA_SCHEMA_ENGINE_BINARY: '/artifacts/schema-engine-debian-openssl-3.0.x' },
    encoding: 'utf8', timeout: 120000,
  })
  writeFileSync('/data/' + name + '.txt', (run.stdout || '') + (run.stderr || ''))
  if (name === 'existing-diff' && run.status === 2) {
    assert.match(run.stdout.trim(), /^\[-\] Removed tables\s+- _UatSession$/, 'Only the observed pre-existing auxiliary table may differ')
    results.existingExtraTable = { name: '_UatSession', preserved: true, fullSchemaParity: 'FAIL: pre-existing extra table; not dropped' }
  } else assert.equal(run.status, 0, name + ': ' + run.stderr)
}
for (const mode of process.env.PARTIAL_FIXTURE === '1' ? ['existing'] : ['fresh', 'existing']) {
  const path = '/data/' + mode + '.sqlite'
  assert.equal(existsSync(path), false, 'Use fresh sandbox volume')
  if (mode === 'existing') {
    copyFileSync(fixturePath, path)
    assert.equal(inspectRecoveredHistory(path, '/source/prisma/migrations').ready, true, 'Read-only preflight required before upgrade')
  }
  const before = mode === 'existing' ? snapshot(path) : {}
  const permissionRowsBefore: Record<string, string> = {}
  if (mode === 'existing') {
    const original = new Database(path, { readonly: true })
    for (const row of original.query('SELECT * FROM Permission').all() as { id: string }[]) permissionRowsBefore[row.id] = digest(JSON.stringify(row))
    original.close()
  }
  command(mode + '-deploy', path, ['migrate', 'deploy', '--schema', '/source/prisma/schema.prisma'])
  command(mode + '-diff', path, ['migrate', 'diff', '--from-url', 'file:' + path, '--to-schema-datamodel', '/source/prisma/schema.prisma', '--exit-code'])
  const after = snapshot(path)
  for (const [name, hash] of Object.entries(before)) {
    if (name !== 'Permission') assert.equal(after[name], hash, 'Preserve existing rows: ' + name)
  }
  const db = new Database(path, { readonly: true })
  try {
    assert.deepEqual(db.query('PRAGMA foreign_key_check').all(), [])
    assert.equal(Object.values(db.query('PRAGMA integrity_check').get()!)[0], 'ok')
    const history = db.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name').all()
    assert.equal(history.length, 10)
    const permissions = db.query('SELECT * FROM Permission').all() as { id: string; name: string }[]
    for (const [id, hash] of Object.entries(permissionRowsBefore)) assert.equal(digest(JSON.stringify(permissions.find(row => row.id === id))), hash)
    if (mode === 'existing') assert.deepEqual(permissions.filter(row => !permissionRowsBefore[row.id]).map(row => row.name).sort(), ['manage_call_logs', 'view_call_logs'])
    results[mode] = { deploy: 'PASS', targetSchemaParity: 'PASS', fullSchemaParity: mode === 'fresh' ? 'PASS' : 'FAIL: only pre-existing extra _UatSession', integrity: 'PASS', foreignKeys: 'PASS', originalTableHashes: before, finalTableHashes: after, existingPermissionRowsUnchanged: true, history }
  } finally { db.close() }
  command(mode + '-repeat', path, ['migrate', 'deploy', '--schema', '/source/prisma/schema.prisma'])
  assert.deepEqual(snapshot(path), after, 'Repeated deploy preserves rows')
  assert.equal(inspectRecoveredHistory(path, '/source/prisma/migrations').ready, true, 'Applied history and tables remain consistent')
}
assert.equal(digest(readFileSync(fixturePath)), sourceHash)
writeFileSync('/data/results.json', JSON.stringify({ status: 'LOCAL_ONLY', result: 'PASS_WITH_RECORDED_EXISTING_EXTRA_TABLE', fixturePath, referencePreserved: true, referenceSha256: sourceHash, results }, null, 2))
console.log('Fresh schema parity PASS; existing upgrade/data/target parity PASS, existing full parity retains extra _UatSession; live environments NOT VERIFIED')
