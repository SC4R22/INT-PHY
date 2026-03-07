// Run once: node scripts/download-profile.mjs
import https from 'https'
import fs from 'fs'
import path from 'path'

const url = 'https://ahmed-badwy.com/assets/Setting/CA1Bprofile.png'
const dest = path.resolve('public/profile.jpg')

https.get(url, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream(dest)
    res.pipe(file)
    file.on('finish', () => {
      file.close()
      console.log('✅ Saved to public/profile.jpg')
    })
  } else {
    console.error('❌ Failed:', res.statusCode)
  }
}).on('error', (err) => {
  console.error('❌ Error:', err.message)
})
