import '../src/global.css'
import type { Preview } from '@storybook/react'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'parchment',
      values: [
        { name: 'parchment', value: '#f5f0eb' },
        { name: 'white',     value: '#ffffff'  },
        { name: 'dark',      value: '#1a1a1a'  },
      ],
    },
    controls: { matchers: { color: /(color)$/i } },
    layout: 'fullscreen',
  },
}

export default preview
