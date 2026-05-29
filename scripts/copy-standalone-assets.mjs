import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

async function copyDirectory(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true })
  await cp(source, destination, { recursive: true, force: true })
}

await copyDirectory(
  path.join(root, '.next', 'static'),
  path.join(root, '.next', 'standalone', '.next', 'static')
)

await copyDirectory(
  path.join(root, 'public'),
  path.join(root, '.next', 'standalone', 'public')
)
