/**
 * Run once: node setup_favicon.js
 * Copies your sharp-generated icon into app/ so Next.js uses it as the favicon.
 */
const fs = require('fs')
const path = require('path')

const src32  = path.join(__dirname, 'public', 'icons', 'icon-32.png')
const srcApple = path.join(__dirname, 'public', 'icons', 'apple-touch-icon.png')
const destIcon = path.join(__dirname, 'app', 'icon.png')
const destApple = path.join(__dirname, 'app', 'apple-icon.png')

if (!fs.existsSync(src32)) {
  console.error('❌  Run setup_pwa_icons.js first to generate icons.')
  process.exit(1)
}

fs.copyFileSync(src32,   destIcon)
fs.copyFileSync(srcApple, destApple)

console.log('✅  app/icon.png       — browser tab favicon')
console.log('✅  app/apple-icon.png — iOS home screen icon')
console.log('\n🎉  Done! Next.js will now use your logo as the favicon.')
