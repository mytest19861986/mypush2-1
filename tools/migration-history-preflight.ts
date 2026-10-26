import { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const domains = [
  { migration: '20261004120000_add_refund_domain', tables: ['Refund'] },
  { migration: '20261014130000_add_two_way_support_domain', tables: ['Ticket', 'TicketMessage'] },
  { migration: '20261014180000_add_user_referral_relational_domain', tables: ['UserReferral'] },
  { migration: '20261025010000_admin_call_logs', tables: ['CallLog'] },
]
function shape(db: Database, name: string) {
  const definition = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name) as { sql: string } | null
  return {
    definition: definition?.sql.replace(/\s+/g, ' ').trim(),
    columns: db.query(`PRAGMA table_info("${name}")`).all(),
    foreignKeys: db.query(`PRAGMA foreign_key_list("${name}")`).all(),
    indexes: db.query("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name=? ORDER BY name").all(name),
  }
}

// Read-only local preflight. It never adopts history, repairs tables, or runs migration.
export function inspectRecoveredHistory(path: string, root: string) {
  if (!path.startsWith('/data/') || !path.endsWith('.sqlite')) throw Error('Only explicitly isolated /data SQLite fixtures are permitted')
  if (readFileSync(path).subarray(0, 16).toString() !== 'SQLite format 3\0') throw Error('PROVIDER_UNVERIFIED')
  const db = new Database(path, { readonly: true })
  const expected = new Database(':memory:')
  try {
    expected.exec('CREATE TABLE Permission(id TEXT PRIMARY KEY, name TEXT UNIQUE, module TEXT, title TEXT)')
    const hasHistory = Boolean(db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get())
    const checks = domains.map(domain => {
      const sql = readFileSync(join(root, domain.migration, 'migration.sql'))
      expected.exec(sql.toString())
      const checksum = createHash('sha256').update(sql).digest('hex')
      const records = hasHistory ? db.query('SELECT checksum, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name=?').all(domain.migration) as { checksum: string; finished_at: unknown; rolled_back_at: unknown }[] : []
      const applied = records.filter(row => row.finished_at && !row.rolled_back_at)
      const failed = records.some(row => !row.finished_at && !row.rolled_back_at)
      const present = domain.tables.filter(name => db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name))
      let status = 'READY_TO_APPLY'
      if (failed || applied.length > 1) status = 'BLOCKED_HISTORY_STATE'
      else if (applied.length === 1) {
        if (applied[0].checksum !== checksum) status = 'BLOCKED_CHECKSUM'
        else if (present.length !== domain.tables.length) status = 'BLOCKED_MISSING_APPLIED_TABLE'
        else if (domain.tables.some(name => JSON.stringify(shape(db, name)) !== JSON.stringify(shape(expected, name)))) status = 'BLOCKED_SCHEMA_MISMATCH'
        else status = 'ALREADY_APPLIED_EXACT_STRUCTURE'
      } else if (present.length) status = 'BLOCKED_TABLE_WITHOUT_HISTORY'
      return { migration: domain.migration, checksum, status }
    })
    const integrity = Object.values(db.query('PRAGMA integrity_check').get()!)[0] === 'ok'
    const foreignKeysValid = db.query('PRAGMA foreign_key_check').all().length === 0
    return { scope: 'Recovered domains and CallLog only; not a live deployment authorization or full database audit', ready: integrity && foreignKeysValid && checks.every(check => !check.status.startsWith('BLOCKED')), integrity, foreignKeysValid, checks }
  } finally { expected.close(); db.close() }
}

if (import.meta.main) {
  const result = inspectRecoveredHistory(process.argv[2] ?? '', '/source/prisma/migrations')
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.ready ? 0 : 1
}
