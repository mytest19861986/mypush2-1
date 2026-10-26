const fs=require('node:fs'),crypto=require('node:crypto')
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const out={scope:'Input inventory; package metadata and core binary hashes only. Full dependency byte manifest/source commit/build/image attestation still pending.',node:process.version,sourcePackageSha256:hash(fs.readFileSync('/source/package.json')),lockRawSha256:hash(fs.readFileSync('/source/bun.lock')),lockLfSha256:hash(fs.readFileSync('/source/bun.lock','utf8').replace(/\r\n/g,'\n')),packages:[],binaries:{}}
let lock=null
try { lock=require('/runtime/node_modules/json5').parse(fs.readFileSync('/source/bun.lock','utf8'));out.lockParsed=true } catch { out.lockParsed=false }
const declared=JSON.parse(fs.readFileSync('/source/package.json'))
for(const name of Object.keys({...declared.dependencies,...declared.devDependencies}).sort()){
 const path='/runtime/node_modules/'+name+'/package.json';const item={name,declaredRange:declared.dependencies?.[name]||declared.devDependencies?.[name],present:fs.existsSync(path)}
 if(item.present){const raw=fs.readFileSync(path),p=JSON.parse(raw);item.version=p.version;item.manifestSha256=hash(raw);const entry=lock?.packages?.[name]?.[0];item.lockResolution=typeof entry==='string'?entry:null;item.matchesLockVersion=item.lockResolution===name+'@'+p.version}
 out.packages.push(item)
}
for(const path of ['/artifacts/schema-engine-debian-openssl-3.0.x','/artifacts/libquery_engine-debian-openssl-3.0.x.so.node','/bun/bun','/runtime/node_modules/.prisma/client/schema.prisma']){
 if(fs.existsSync(path)){const raw=fs.readFileSync(path);out.binaries[path]={bytes:raw.length,sha256:hash(raw)};if(path.endsWith('schema.prisma'))out.binaries[path].lfSha256=hash(raw.toString().replace(/\r\n/g,'\n'))}else out.binaries[path]={missing:true}
}
fs.writeFileSync('/out/INPUT_INVENTORY.json',JSON.stringify(out,null,2));console.log(JSON.stringify({node:out.node,lockParsed:out.lockParsed,directPackageCount:out.packages.length,present:out.packages.filter(p=>p.present).length,lockMatches:out.packages.filter(p=>p.matchesLockVersion).length,scope:out.scope}))
