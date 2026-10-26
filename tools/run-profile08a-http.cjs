const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
if (fs.existsSync('/workspace/src')) throw Error('Fresh workspace required')
fs.cpSync('/source/src', '/workspace/src', { recursive: true })
fs.mkdirSync('/workspace/tools', { recursive: true })
fs.copyFileSync('/source/tools/validate-profile-link-08a-http.ts', '/workspace/tools/validate-profile-link-08a-http.ts')
fs.copyFileSync('/source/tsconfig.json', '/workspace/tsconfig.json')
fs.copyFileSync('/source/eslint.config.mjs', '/workspace/eslint.config.mjs')
const lint = spawnSync(process.execPath, ['/workspace/node_modules/eslint/bin/eslint.js', 'tools/validate-profile-link-08a-http.ts'], { cwd: '/workspace', encoding: 'utf8' })
fs.writeFileSync('/data/HTTP_TOOL_LINT.txt', (lint.stdout || '') + (lint.stderr || ''))
// Lint is executed separately from the copied workspace using its existing configuration.
const run = spawnSync('/bun/bun', ['run', '/workspace/tools/validate-profile-link-08a-http.ts'], { cwd: '/workspace', env: process.env, stdio: 'inherit', timeout: 300000 })
process.exitCode = lint.status === 0 ? (run.status ?? 1) : 1
