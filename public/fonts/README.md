# Fonts Directory

## Required Font Files

Place the following Payback font files in this directory:

1. `payback-regular.woff2` (weight: 400)
2. `payback-bold.woff2` (weight: 700)

## Font Fallback

If you don't have the Payback font files yet:
- The site will automatically use fallback fonts (system-ui, arial)
- Everything will work normally
- You can add the fonts later when available

## Font Sources

The Payback font may need to be:
- Purchased from a font vendor
- Licensed for web use
- Converted to .woff2 format if in other formats

## Alternative Fonts

If you want to use a different font temporarily:

1. Update `app/layout.tsx` to use a Google Font
2. Update `tailwind.config.ts` font family
3. Choose from: https://fonts.google.com/

Example with Bebas Neue (similar display font):
```typescript
import { Bebas_Neue } from 'next/font/google'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-payback',
})
```

## Current Status

✅ Font configuration is set up in layout.tsx
✅ Tailwind is configured to use the fonts
✅ Fallback fonts are working
⏳ Add actual .woff2 files when available
