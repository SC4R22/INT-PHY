/**
 * Generates all PWA icon sizes from your logo.
 *
 * Usage:
 *   node setup_pwa_icons.js "C:\Users\yusuf\Downloads\logo.jpeg"
 *
 * Requires sharp:
 *   npm install sharp --save-dev
 */

const fs   = require('fs')
const path = require('path')

const src = process.argv[2]
if (!src || !fs.existsSync(src)) {
  console.error('\n❌  Pass the path to your المبدع logo image.')
  console.error('    Example:')
  console.error('      node setup_pwa_icons.js "C:\\Users\\yusuf\\Downloads\\logo.jpeg"\n')
  process.exit(1)
}

const iconsDir = path.join(__dirname, 'public', 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

async function run() {
  const sharp = require('sharp').default || require('sharp')

  // ── Helper: logo centred on dark bg with padding (maskable safe zone) ──
  async function maskable(size, logoRatio = 0.6) {
    const logoSize = Math.round(size * logoRatio)
    const pad      = Math.round((size - logoSize) / 2)

    const logo = await sharp(src)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    return sharp({
      create: { width: size, height: size, channels: 4, background: { r: 26, g: 26, b: 26, alpha: 255 } }
    })
      .composite([{ input: logo, top: pad, left: pad }])
      .png()
      .toBuffer()
  }

  const targets = [
    // Standard — logo fills the whole canvas (no bg)
    { name: 'icon-16.png',            size: 16,  type: 'plain'     },
    { name: 'icon-32.png',            size: 32,  type: 'plain'     },
    { name: 'icon-192.png',           size: 192, type: 'plain'     },
    { name: 'icon-512.png',           size: 512, type: 'plain'     },
    // Maskable — dark bg + centred logo (safe for Android adaptive masks)
    { name: 'icon-192-maskable.png',  size: 192, type: 'maskable'  },
    { name: 'icon-512-maskable.png',  size: 512, type: 'maskable'  },
    // Apple touch icon — 180×180, dark bg + centred logo
    { name: 'apple-touch-icon.png',   size: 180, type: 'maskable'  },
  ]

  for (const { name, size, type } of targets) {
    const dest = path.join(iconsDir, name)
    if (type === 'maskable') {
      const buf = await maskable(size)
      fs.writeFileSync(dest, buf)
    } else {
      await sharp(src)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(dest)
    }
    console.log(`  ✅  public/icons/${name}`)
  }

  console.log('\n🎉  All PWA icons generated!  Deploy to see them live.')
}

run().catch(err => {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error('\n❌  sharp is not installed.')
    console.error('    Run:  npm install sharp --save-dev')
    console.error('    Then re-run this script.\n')
  } else {
    console.error('\n❌  Error:', err.message)
  }
  process.exit(1)
})
