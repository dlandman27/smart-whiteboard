import colors      from './packages/ui-kit/src/tokens/color.json'
import fontFamily  from './packages/ui-kit/src/tokens/fontFamily.json'
import fontSizeRaw from './packages/ui-kit/src/tokens/fontSize.json'
import spaceRaw    from './packages/ui-kit/src/tokens/space.json'
import radiusRaw   from './packages/ui-kit/src/tokens/radius.json'

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
    './packages/ui-kit/src/**/*.{js,ts,jsx,tsx}',
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
