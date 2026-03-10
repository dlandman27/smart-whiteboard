import colors      from './src/ui/tokens/color.json'
import fontFamily  from './src/ui/tokens/fontFamily.json'
import fontSizeRaw from './src/ui/tokens/fontSize.json'
import spaceRaw    from './src/ui/tokens/space.json'
import radiusRaw   from './src/ui/tokens/radius.json'

// Convert px numbers to rem strings for Tailwind
const px = (n) => `${n / 16}rem`

const fontSize = Object.fromEntries(
  Object.entries(fontSizeRaw).map(([k, v]) => [k, px(v)])
)

const spacing = Object.fromEntries(
  Object.entries(spaceRaw).map(([k, v]) => [k, px(v)])
)

const borderRadius = Object.fromEntries(
  Object.entries(radiusRaw).map(([k, v]) => [k, v === 999 ? '9999px' : px(v)])
)

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans:    fontFamily.base,
        display: fontFamily.display,
        mono:    fontFamily.mono,
      },
      fontSize,
      spacing,
      borderRadius,
    },
  },
  plugins: [],
}
