import { Database } from 'bun:sqlite'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { strict as assert } from 'node:assert'
import { inspectRecoveredHistory } from './migration-history-preflight'

const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')
const cases: { name: string; ready: boolean; statuses: string[] }[] = []
function check(name: string, source: string, mutate: ((db: Database) => void) | null, ready: boolean, expected?: string) {
  const path = '/data/' + name + '.sqlite'
  copyFileSync(source, path)
  if (mutate) { const db = new Database(path); try { mutate(db) } finally { db.close() } }
  const before = hash(path)
  const result = inspectRecoveredHistory(path, '/source/prisma/migrations')
  assert.equal(result.ready, ready, name)
  if (expected) assert.ok(result.checks.some(check => check.status === expected), name)
  assert.equal(hash(path), before, 'Preflight never writes: ' + name)
  cases.push({ name, ready, statuses: result.checks.map(check => check.status) })
}
check('fresh-history', '/fresh/prisma/combined-migration-fresh.sqlite', null, true)
check('existing-exact', '/fixtures/reference.sqlite', null, true)
check('missing-history', '/fixtures/reference.sqlite', db => db.exec("DELETE FROM _prisma_migrations WHERE migration_name='20261014130000_add_two_way_support_domain'"), false, 'BLOCKED_TABLE_WITHOUT_HISTORY')
check('bad-checksum', '/fixtures/reference.sqlite', db => db.exec("UPDATE _prisma_migrations SET checksum='tampered-test-only' WHERE migration_name='20261004120000_add_refund_domain'"), false, 'BLOCKED_CHECKSUM')
check('missing-applied-table', '/fixtures/reference.sqlite', db => db.exec('DROP TABLE TicketMessage'), false, 'BLOCKED_MISSING_APPLIED_TABLE')
check('wrong-column', '/fixtures/reference.sqlite', db => db.exec('ALTER TABLE Refund ADD COLUMN unexpected TEXT'), false, 'BLOCKED_SCHEMA_MISMATCH')
check('unrecorded-calllog', '/fixtures/reference.sqlite', db => db.exec(readFileSync('/source/prisma/migrations/20261025010000_admin_call_logs/migration.sql', 'utf8')), false, 'BLOCKED_TABLE_WITHOUT_HISTORY')
check('mixed-consistent', '/fixtures/reference.sqlite', db => {
  db.exec('DROP TABLE TicketMessage; DROP TABLE Ticket; DROP TABLE UserReferral')
  db.exec("DELETE FROM _prisma_migrations WHERE migration_name IN ('20261014130000_add_two_way_support_domain','20261014180000_add_user_referral_relational_domain')")
}, true)
assert.throws(() => inspectRecoveredHistory('/unapproved/live.sqlite', '/source/prisma/migrations'))
writeFileSync('/data/preflight-results.json', JSON.stringify({ result: 'PASS', scope: 'Isolated local fixture copies only; no live adoption or repair', cases }, null, 2))
console.log(JSON.stringify({ result: 'PASS', cases: cases.length, readonlyVerified: true }))
