import { Database } from 'bun:sqlite'
import { strict as assert } from 'node:assert'
import { copyFileSync, writeFileSync } from 'node:fs'

copyFileSync('/validated/fresh.sqlite', '/data/constraints.sqlite')
const db = new Database('/data/constraints.sqlite')
const passed: string[] = []
db.exec('PRAGMA foreign_keys=ON; BEGIN')
try {
  db.exec("INSERT INTO User(id,mobile,updatedAt) VALUES('migration-user-1','09999000001',CURRENT_TIMESTAMP),('migration-user-2','09999000002',CURRENT_TIMESTAMP),('migration-user-3','09999000003',CURRENT_TIMESTAMP)")
  assert.throws(() => db.exec("INSERT INTO Ticket(id,ticketNumber,userId,subject,updatedAt) VALUES('bad','bad','missing','synthetic',CURRENT_TIMESTAMP)"), /FOREIGN KEY/)
  db.exec("INSERT INTO Ticket(id,ticketNumber,userId,subject,updatedAt) VALUES('ticket-ok','MIG-1','migration-user-1','synthetic',CURRENT_TIMESTAMP)")
  assert.throws(() => db.exec("INSERT INTO Ticket(id,ticketNumber,userId,subject,updatedAt) VALUES('dupe','MIG-1','migration-user-2','synthetic',CURRENT_TIMESTAMP)"), /UNIQUE/)
  assert.throws(() => db.exec("INSERT INTO TicketMessage(id,ticketId,senderId,senderRole,content) VALUES('bad-message','missing','migration-user-2','USER','synthetic')"), /FOREIGN KEY/)
  assert.throws(() => db.exec("INSERT INTO TicketMessage(id,ticketId,senderId,senderRole,content) VALUES('bad-sender','ticket-ok','missing','USER','synthetic')"), /FOREIGN KEY/)
  db.exec("INSERT INTO TicketMessage(id,ticketId,senderId,senderRole,content) VALUES('message-ok','ticket-ok','migration-user-2','USER','synthetic')")
  assert.throws(() => db.exec("DELETE FROM Ticket WHERE id='ticket-ok'"), /FOREIGN KEY/)
  passed.push('Ticket owner FK, unique ticket number; message ticket/sender FKs and delete restrict')
  db.exec("INSERT INTO UserReferral(id,referrerId,referredUserId,referralCode) VALUES('ref-ok','migration-user-1','migration-user-2','synthetic')")
  assert.throws(() => db.exec("INSERT INTO UserReferral(id,referrerId,referredUserId,referralCode) VALUES('ref-dupe','migration-user-3','migration-user-2','synthetic')"), /UNIQUE/)
  assert.throws(() => db.exec("INSERT INTO UserReferral(id,referrerId,referredUserId,referralCode) VALUES('ref-bad','missing','migration-user-3','synthetic')"), /FOREIGN KEY/)
  assert.throws(() => db.exec("DELETE FROM User WHERE id='migration-user-2'"), /FOREIGN KEY/)
  passed.push('Referral uniqueness, referrer FK and user deletion restrict')
  db.exec("INSERT INTO Payment(id,userId,amount,updatedAt) VALUES('payment-synthetic','migration-user-3',123,CURRENT_TIMESTAMP)")
  assert.throws(() => db.exec("INSERT INTO Refund(id,paymentId,userId,updatedAt) VALUES('refund-bad','missing','migration-user-3',CURRENT_TIMESTAMP)"), /FOREIGN KEY/)
  db.exec("INSERT INTO Refund(id,paymentId,userId,idempotencyKey,updatedAt) VALUES('refund-1','payment-synthetic','migration-user-3','unique-synthetic',CURRENT_TIMESTAMP)")
  assert.throws(() => db.exec("INSERT INTO Refund(id,paymentId,userId,idempotencyKey,updatedAt) VALUES('refund-dupe','payment-synthetic','migration-user-3','unique-synthetic',CURRENT_TIMESTAMP)"), /UNIQUE/)
  db.exec("INSERT INTO Refund(id,paymentId,userId,updatedAt) VALUES('refund-null-1','payment-synthetic','migration-user-3',CURRENT_TIMESTAMP),('refund-null-2','payment-synthetic','migration-user-3',CURRENT_TIMESTAMP)")
  assert.equal((db.query('SELECT COUNT(*) AS count FROM Refund').get() as { count: number }).count, 3)
  db.exec("DELETE FROM Payment WHERE id='payment-synthetic'")
  assert.equal((db.query('SELECT COUNT(*) AS count FROM Refund').get() as { count: number }).count, 0)
  passed.push('Refund payment FK, unique nonnull idempotency, nullable-key behavior and payment cascade')
  assert.deepEqual(db.query('PRAGMA foreign_key_check').all(), [])
} finally { db.exec('ROLLBACK'); db.close() }
writeFileSync('/data/constraint-results.json', JSON.stringify({ result: 'PASS', scope: 'Fresh migrated scratch SQLite; all synthetic inserts/deletes rolled back; no real financial action', passed }, null, 2))
console.log(JSON.stringify({ result: 'PASS', groups: passed.length, rolledBack: true }))
