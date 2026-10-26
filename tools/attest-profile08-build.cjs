const fs = require('node:fs'), crypto = require('node:crypto')
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')
const manifest = JSON.parse(fs.readFileSync('/validation/reports/input-manifest.json'))
const mismatches = Object.entries(manifest.sources).filter(([path, expected]) => hash('/source/' + path) !== expected).map(([path]) => path)
const artifacts = {}
function walk(dir) { for (const entry of fs.readdirSync('/validation/' + dir, { withFileTypes: true })) {
 const path = dir + '/' + entry.name
 if (entry.isDirectory()) { if (entry.name !== 'cache') walk(path) }
 else artifacts[path] = hash('/validation/' + path)
} }
walk('.next')
const result = { buildId: manifest.buildId, inputs: Object.keys(manifest.sources).length, mismatches, packageMatches: hash('/source/package.json') === manifest.packageSha256, artifacts }
fs.writeFileSync('/data/BUILD_ATTESTATION.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify({ buildId: result.buildId, inputs: result.inputs, mismatches, packageMatches: result.packageMatches, artifacts: Object.keys(artifacts).length }))
process.exitCode = mismatches.length || !result.packageMatches ? 1 : 0
