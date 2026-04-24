import { useWidgetSettings } from '@whiteboard/sdk'
import { Container } from '@whiteboard/ui-kit'

interface ImageSettings {
  url:     string
  prompt:  string
  loading: boolean
  error:   boolean
}

const DEFAULT_IMAGE_SETTINGS: ImageSettings = { url: '', prompt: '', loading: false, error: false }

export function ImageWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<ImageSettings>(widgetId, DEFAULT_IMAGE_SETTINGS)

  if (settings.loading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center gap-3 h-full select-none">
          <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin opacity-40" />
          <span className="text-xs opacity-30 max-w-[80%] text-center leading-snug">{settings.prompt}</span>
        </div>
      </Container>
    )
  }

  if (settings.error || (!settings.loading && !settings.url)) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center gap-2 h-full select-none opacity-40">
          <span className="text-2xl">⚠</span>
          <span className="text-xs">Image generation failed</span>
        </div>
      </Container>
    )
  }

  return (
    <Container className="overflow-hidden !p-0">
      <img
        src={settings.url}
        alt={settings.prompt}
        title={settings.prompt}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </Container>
  )
}
