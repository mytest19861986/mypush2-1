const fs=require('node:fs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process')
const {PrismaClient}=require('/runtime/node_modules/@prisma/client')
const hash=x=>crypto.createHash('sha256').update(x).digest('hex')
const stringify=x=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v)
const canonical=rows=>[...rows].map(row=>stringify(row)).sort()
const expected='9409f2a1fd35c33a7ee8fbe822e7b9b3c916d8216396c25a01dc2bf092a25445'
if(hash(fs.readFileSync('/fixtures/old-backup.sqlite'))!==expected)throw Error('Old backup input mismatch')
fs.mkdirSync('/data/commands',{recursive:true});fs.mkdirSync('/work',{recursive:true})
const files={trial:'/data/trial.sqlite',fault:'/data/fault.sqlite',restored:'/data/restored.sqlite'}
for(const path of Object.values(files)){if(fs.existsSync(path))throw Error('Fresh rehearsal paths required');fs.copyFileSync('/fixtures/old-backup.sqlite',path)}
function command(name,args,file){
 const run=spawnSync('/usr/local/bin/node',['/runtime/node_modules/prisma/build/index.js',...args],{cwd:'/work',env:{...process.env,DATABASE_URL:'file:'+file,PRISMA_SCHEMA_ENGINE_BINARY:'/artifacts/schema-engine-debian-openssl-3.0.x',CHECKPOINT_DISABLE:'1'},encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024})
 fs.writeFileSync('/data/commands/'+name+'.txt',(run.stdout||'')+(run.stderr||''))
 return {exit:run.status,signal:run.signal,error:run.error?'Command observation error':null}
}
async function snapshot(file){
 const db=new PrismaClient({datasources:{db:{url:'file:'+file}},log:[]})
 try{
  const names=(await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).map(x=>x.name)
  const rows={},tables={}
  for(const name of names){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw Error('Unexpected table identifier');rows[name]=await db.$queryRawUnsafe('SELECT * FROM "'+name+'"');tables[name]={count:rows[name].length,sha256:hash(stringify(canonical(rows[name])))} }
  const schema=await db.$queryRawUnsafe("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name")
  return {rows,tables,schemaSha256:hash(stringify(schema)),callLogExists:names.includes('CallLog')}
 }finally{await db.$disconnect()}
}
function preservation(before,after){
 const changed=[]
 for(const name of Object.keys(before.tables)){
  if(['Permission','_prisma_migrations'].includes(name))continue
  if(before.tables[name].sha256!==after.tables[name]?.sha256)changed.push(name)
 }
 const historyIds=new Set((before.rows._prisma_migrations||[]).map(x=>x.id))
 const permissionIds=new Set((before.rows.Permission||[]).map(x=>x.id))
 const historyUnchanged=stringify(canonical(before.rows._prisma_migrations||[]))===stringify(canonical((after.rows._prisma_migrations||[]).filter(x=>historyIds.has(x.id))))
 const permissionsUnchanged=stringify(canonical(before.rows.Permission||[]))===stringify(canonical((after.rows.Permission||[]).filter(x=>permissionIds.has(x.id))))
 const addedPermissions=(after.rows.Permission||[]).filter(x=>!permissionIds.has(x.id)).map(x=>x.name).sort()
 return {historicalDataUnchanged:changed.length===0,changedHistoricalTables:changed,oldMigrationRowsUnchanged:historyUnchanged,oldPermissionRowsUnchanged:permissionsUnchanged,addedPermissionNames:addedPermissions,uatBefore:before.tables._UatSession,uatAfter:after.tables._UatSession}
}
;(async()=>{
 const before=await snapshot(files.trial)
 const deploy=command('normal-deploy',['migrate','deploy','--schema','/source/prisma/schema.prisma'],files.trial)
 const after=await snapshot(files.trial);const normalPreservation=preservation(before,after)
 const diff=command('post-deploy-diff',['migrate','diff','--from-url','file:'+files.trial,'--to-schema-datamodel','/source/prisma/schema.prisma','--exit-code'],files.trial)
 fs.mkdirSync('/work/fault-prisma',{recursive:true});fs.copyFileSync('/source/prisma/schema.prisma','/work/fault-prisma/schema.prisma');fs.cpSync('/source/prisma/migrations','/work/fault-prisma/migrations',{recursive:true})
 const faultPath='/work/fault-prisma/migrations/20261025010000_admin_call_logs/migration.sql'
 const sql=fs.readFileSync(faultPath,'utf8');if(!sql.includes('CREATE UNIQUE INDEX'))throw Error('Unexpected CallLog migration fixture')
 fs.writeFileSync(faultPath,sql.replace('CREATE UNIQUE INDEX','SELECT * FROM __release11_injected_missing_table__;\nCREATE UNIQUE INDEX'))
 const faultBefore=await snapshot(files.fault)
 const fault=command('fault-deploy',['migrate','deploy','--schema','/work/fault-prisma/schema.prisma'],files.fault)
 const faultAfter=await snapshot(files.fault);const faultPreservation=preservation(faultBefore,faultAfter)
 const retry=command('fault-retry',['migrate','deploy','--schema','/work/fault-prisma/schema.prisma'],files.fault)
 const restored=await snapshot(files.restored)
 const restoredExact=hash(fs.readFileSync(files.restored))===expected
 const result={scope:'Private copies of an older20261024backup only. No current-point recovery or live migration claim.',backupSha256:expected,normal:{deploy,postDeployDiff:diff,callLogExists:after.callLogExists,preservation:normalPreservation,beforeTables:before.tables,afterTables:after.tables,status:deploy.exit===0&&after.callLogExists&&normalPreservation.historicalDataUnchanged&&normalPreservation.oldMigrationRowsUnchanged?'PASS':'FAIL'},fault:{deploy:fault,retry,callLogExistsAfterFailure:faultAfter.callLogExists,preservation:faultPreservation,injectedMigrationSha256:hash(fs.readFileSync(faultPath)),sourceMigrationUnchanged:hash(fs.readFileSync('/source/prisma/migrations/20261025010000_admin_call_logs/migration.sql'))===hash(Buffer.from(sql)),failureObserved:fault.exit!==0?'PASS':'FAIL',atomicity:faultAfter.callLogExists?'FAIL':'PASS',retryBlocked:retry.exit!==0?'PASS':'FAIL'},restore:{status:restoredExact&&stringify(restored.tables)===stringify(before.tables)?'PASS':'FAIL',exactOldSnapshotBytes:restoredExact,source:'Separate new restored copy from immutable old backup; failed copy retained',currentPointRecovery:'NOT VERIFIED'},pristineBackupUnchanged:hash(fs.readFileSync('/fixtures/old-backup.sqlite'))===expected}
 fs.writeFileSync('/data/REHEARSAL_RESULTS.json',JSON.stringify(result,null,2));console.log(JSON.stringify({normal:result.normal.status,normalExit:deploy.exit,diffExit:diff.exit,faultExit:fault.exit,partialCallLogAfterFailure:result.fault.callLogExistsAfterFailure,atomicity:result.fault.atomicity,oldSnapshotRestore:result.restore.status,liveWrites:false}))
})().catch(error=>{fs.writeFileSync('/data/PRIVATE_REHEARSAL_ERROR.txt',String(error));console.error('Rehearsal did not complete; private error evidence retained');process.exitCode=1})
