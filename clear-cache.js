/**
 * Deletes the entire .next folder so Next.js starts with a clean slate.
 * Run once with:  node clear-cache.js
 * Then start dev normally:  npm run dev
 */
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

const nextDir = join(__dirname, '.next')
if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true })
  console.log('✅  .next deleted — run "npm run dev" now')
} else {
  console.log('ℹ️  .next does not exist, nothing to delete')
}
