import fs from 'node:fs'
import { execSync } from 'node:child_process'

function readRedisPasswordFromEnv() {
  const envRaw = fs.readFileSync('.env', 'utf8')
  const line = envRaw.split(/\r?\n/).find((l) => l.startsWith('REDIS_PASSWORD='))

  if (!line) {
    throw new Error('REDIS_PASSWORD no definido en backend/.env')
  }

  return line
    .slice('REDIS_PASSWORD='.length)
    .trim()
    .replace(/^['\"]|['\"]$/g, '')
}

function main() {
  const password = readRedisPasswordFromEnv()
  execSync(`docker exec cinevault-redis redis-cli -a ${password} ping`, {
    stdio: 'inherit',
  })
}

main()
