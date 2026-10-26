import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { strict as assert } from 'node:assert'
import { inspectRecoveredHistory } from './migration-history-preflight'

const source = '/candidate/prisma/admin01b-sandbox.sqlite'
const target = '/data/c-fixture.sqlite'
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')
const original = hash(source)
copyFileSync(source, target)
const before = hash(target)
const result = inspectRecoveredHistory(target, '/source/prisma/migrations')
assert.equal(result.ready, false)
assert.equal(result.checks.find(check => check.migration === '20261025010000_admin_call_logs')?.status, 'BLOCKED_TABLE_WITHOUT_HISTORY')
assert.equal(hash(target), before)
assert.equal(hash(source), original)
writeFileSync('/data/c-preflight.json', JSON.stringify({ result, sourceSha256: original, sourceAndCopyUnchanged: true, automaticRepair: false }, null, 2))
console.log('Actual C test-fixture preflight blocks unrecorded CallLog; source and copy unchanged')
