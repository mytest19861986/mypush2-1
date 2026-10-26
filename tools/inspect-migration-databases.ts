import { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const tables = ['Refund', 'Ticket', 'TicketMessage', 'UserReferral']
const paths = ['/fixtures/reference.sqlite', '/candidate/prisma/admin01b-sandbox.sqlite', '/fresh/prisma/combined-migration-fresh.sqlite']
const results = paths.map(path => {
  const bytes = readFileSync(path)
  if (bytes.subarray(0, 16).toString() !== 'SQLite format 3\0') throw Error('Not a confirmed SQLite source: ' + path)
  const db = new Database(path, { readonly: true })
  try {
    const migrationTable = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get()
    return {
      path, provider: 'sqlite', sha256: createHash('sha256').update(bytes).digest('hex'),
      integrity: db.query('PRAGMA integrity_check').all(), foreignKeyViolations: db.query('PRAGMA foreign_key_check').all(),
      migrations: migrationTable ? db.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name').all() : null,
      tables: tables.map(name => {
        const definition = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name)
        return { name, definition,
          columns: db.query(`PRAGMA table_info("${name}")`).all(),
          foreignKeys: db.query(`PRAGMA foreign_key_list("${name}")`).all(),
          indexes: db.query("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name=? ORDER BY name").all(name),
          rowCount: definition ? db.query(`SELECT COUNT(*) AS count FROM "${name}"`).get() : null,
        }
      }),
    }
  } finally { db.close() }
})
writeFileSync('/data/database-metadata.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results.map(result => ({ path: result.path, provider: result.provider, tables: result.tables.map(table => ({ name: table.name, present: Boolean(table.definition), rowCount: table.rowCount })) })), null, 2))
