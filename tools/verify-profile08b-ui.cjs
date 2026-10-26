const fs = require('node:fs'),crypto = require('node:crypto'),assert = require('node:assert/strict')
const {PrismaClient} = require('/validation/.next/standalone/node_modules/@prisma/client')
const db = new PrismaClient({log:[]})
;(async()=>{
 const state=await Promise.all([db.userProfile.findMany({orderBy:{id:'asc'}}),db.planHolder.findMany({orderBy:{id:'asc'}}),db.contract.findMany({orderBy:{id:'asc'}}),db.visit.findMany({orderBy:{id:'asc'}}),db.userPlan.findMany({orderBy:{id:'asc'}}),db.wallet.findMany({orderBy:{id:'asc'}}),db.walletTransaction.findMany({orderBy:{id:'asc'}}),db.settlement.findMany({orderBy:{id:'asc'}})])
 const before=JSON.parse(fs.readFileSync('/data/domain-before.json')).hash
 const after=crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');assert.equal(after,before)
 console.log(JSON.stringify({status:'PASS',profileHolderAndSixDomainsUnchanged:true,before,after,buildId:fs.readFileSync('/validation/.next/BUILD_ID','utf8').trim()}))
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect())
