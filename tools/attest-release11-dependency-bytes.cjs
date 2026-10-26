const fs=require('node:fs'),crypto=require('node:crypto')
const entries=[]
function walk(relative){
 const root='/runtime/node_modules'+(relative?'/'+relative:'')
 for(const name of fs.readdirSync(root).sort()){
  const rel=relative?relative+'/'+name:name,p='/runtime/node_modules/'+rel,st=fs.lstatSync(p)
  if(st.isSymbolicLink()){entries.push({path:rel,type:'symlink',target:fs.readlinkSync(p)});continue}
  if(st.isDirectory()){walk(rel);continue}
  if(st.isFile()){const raw=fs.readFileSync(p);entries.push({path:rel,type:'file',bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex')})}
 }
}
walk('')
entries.sort((a,b)=>a.path.localeCompare(b.path,'en'))
const treeSha256=crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex')
const result={scope:'Exact existing offline dependency filesystem bytes,including generated Prisma mount; symlinks recorded without following. Does not by itself verify upstream tarball integrity.',treeSha256,files:entries.filter(x=>x.type==='file').length,symlinks:entries.filter(x=>x.type==='symlink').length,totalBytes:entries.reduce((n,x)=>n+(x.bytes||0),0),entries}
fs.writeFileSync('/out/DEPENDENCY_BYTES.json',JSON.stringify(result,null,2));console.log(JSON.stringify({treeSha256,files:result.files,symlinks:result.symlinks,totalBytes:result.totalBytes}))
