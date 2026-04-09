/**
 * Fixes all raw <img> tags in store pages to use next/image.
 * Run once from the project root: node fix_img_tags.js
 */
const fs = require('fs')
const path = require('path')

const files = [
  'app/admin/store/page.tsx',
  'app/(public)/store/page.tsx',
]

for (const rel of files) {
  const filePath = path.join(__dirname, rel)
  let src = fs.readFileSync(filePath, 'utf8')

  // 1. Add Image import if not already present
  if (!src.includes("import Image from 'next/image'") && !src.includes('import Image from "next/image"')) {
    src = src.replace(
      /^('use client'\n\n)/,
      `'use client'\n\nimport Image from 'next/image'\n`
    )
    // fallback if no 'use client'
    if (!src.includes("import Image from 'next/image'")) {
      src = `import Image from 'next/image'\n` + src
    }
  }

  // 2. Replace all <img src={...} alt={...} className="w-full h-full object-cover..." />
  //    with <Image src={...} alt={...} fill className="object-cover" unoptimized />
  //    These are always inside a relative-positioned container with a fixed height.
  src = src.replace(
    /<img\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+className="w-full h-full object-cover([^"]*)"(\s*\/?>)/g,
    (match, src2, alt, extraClass, closing) => {
      return `<Image src={${src2}} alt={${alt}} fill className="object-cover${extraClass}" unoptimized />`
    }
  )

  // 3. Handle variant: className="..." then src= (different attribute order)
  src = src.replace(
    /<img\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+className="([^"]*)"(\s*\/?>)/g,
    (match, src2, alt, cls, closing) => {
      if (match.includes('Image')) return match // already replaced
      return `<Image src={${src2}} alt={${alt}} fill className="${cls}" unoptimized />`
    }
  )

  fs.writeFileSync(filePath, src, 'utf8')
  console.log(`✅  Fixed: ${rel}`)
}

console.log('\n🎉  Done! You can delete this script now.')
