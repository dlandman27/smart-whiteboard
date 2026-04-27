import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { canvas } from '../board-utils.js'
import type { VoiceTool } from './_types.js'

const IMAGES_DIR = path.join(process.cwd(), 'data', 'images')
fs.mkdirSync(IMAGES_DIR, { recursive: true })

export { IMAGES_DIR }

export const imageTools: VoiceTool[] = [
  {
    definition: {
      name: 'generate_image',
      description: 'Generate an image from a text prompt using AI and place it as a widget on the board. Use this when the user says "draw", "make an image of", "generate a picture of", etc. Returns immediately — the image appears on the board once ready.',
      input_schema: {
        type: 'object' as const,
        properties: {
          prompt: { type: 'string', description: 'Detailed description of the image to generate' },
          size: {
            type: 'string',
            enum: ['1024x1024', '1024x1536', '1536x1024'],
            description: 'Image dimensions. Default: 1024x1024. Use 1024x1536 for portrait, 1536x1024 for landscape.',
          },
        },
        required: ['prompt'],
      },
    },
    async execute(input, ctx) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return 'OPENAI_API_KEY is not set — add it to your .env file'

      const size = (input.size as '1024x1024' | '1024x1536' | '1536x1024') ?? '1024x1024'
      const [w, h] = size.split('x').map(Number)
      const widgetW = 420
      const widgetH = Math.round(widgetW / (w / h))
      const userId = ctx.userId

      const { id } = canvas.createWidget({
        widgetType: '@whiteboard/image',
        width: widgetW,
        height: widgetH,
        settings: { url: '', prompt: input.prompt as string, loading: true },
      }, userId)

      const openai = new OpenAI({ apiKey })
      openai.images.generate({
        model: 'gpt-image-1',
        prompt: input.prompt as string,
        n: 1,
        size,
      }).then((res) => {
        const b64 = res.data[0].b64_json
        if (!b64) {
          canvas.updateWidget(id, { settings: { url: '', prompt: input.prompt as string, loading: false, error: true } }, userId)
          return
        }
        const filename = `${crypto.randomUUID()}.png`
        fs.writeFileSync(path.join(IMAGES_DIR, filename), Buffer.from(b64, 'base64'))
        canvas.updateWidget(id, {
          settings: { url: `/images/${filename}`, prompt: input.prompt as string, loading: false, error: false },
        }, userId)
      }).catch(() => {
        canvas.updateWidget(id, { settings: { url: '', prompt: input.prompt as string, loading: false, error: true } }, userId)
      })

      return 'Generating your image — it will appear on the board in a moment!'
    },
  },
]
