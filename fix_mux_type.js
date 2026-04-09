// Run once: node fix_mux_type.js
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'app', 'dashboard', 'watch', '[videoId]', 'video-player.tsx')
let src = fs.readFileSync(file, 'utf8')

const OLD = `style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, '--controls': 'none', '--media-object-fit': 'contain' } as React.CSSProperties}`
const NEW = `style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, '--controls': 'none', '--media-object-fit': 'contain' } as any}`

if (!src.includes(OLD)) {
  console.error('❌  Pattern not found — may already be fixed or file changed.')
  process.exit(1)
}

fs.writeFileSync(file, src.replace(OLD, NEW), 'utf8')
console.log('✅  Fixed MuxPlayer style type cast in video-player.tsx')
console.log('    Push to Vercel and the build should pass.')
