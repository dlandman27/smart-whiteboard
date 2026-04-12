import type { StorybookConfig } from '@storybook/react-vite'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
    '../../../src/components/widgets/**/*.stories.@(ts|tsx)',
  ],
  addons:  [],
  framework: {
    name:    '@storybook/react-vite',
    options: {},
  },
  viteFinal(config) {
    const root = resolve(__dirname, '../../..')
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@whiteboard/sdk':    join(root, 'src/sdk/index.ts'),
      '@whiteboard/ui-kit': join(root, 'packages/ui-kit/src/index.ts'),
    }
    config.css = config.css ?? {}
    config.css.postcss = root
    return config
  },
}

export default config
