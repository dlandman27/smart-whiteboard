import { useWidgetSettings } from '@whiteboard/sdk'
import { Center } from '../../ui/layouts'
import { Text } from '../../ui/web'

interface HtmlWidgetSettings {
  html:  string
  title?: string
}

const DEFAULTS: HtmlWidgetSettings = { html: '', title: '' }

const BASE_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100vw; height: 100vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: transparent;
    color: #e2e8f0;
  }
  ::-webkit-scrollbar { display: none; }
`

// Inject base styles into any HTML — full doc or bare snippet
function wrapHtml(raw: string): string {
  if (/^\s*<!doctype/i.test(raw) || /^\s*<html/i.test(raw)) {
    // Inject base styles after the first <style> tag, or add a new one in <head>
    if (/<head>/i.test(raw)) {
      return raw.replace(/<head>/i, `<head><style>${BASE_STYLES}</style>`)
    }
    return raw
  }
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${BASE_STYLES}</style>
</head>
<body>${raw}</body>
</html>`
}

export function HtmlWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<HtmlWidgetSettings>(widgetId, DEFAULTS)

  if (!settings.html) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">No HTML set — ask Claude to generate this widget's content</Text>
      </Center>
    )
  }

  return (
    <iframe
      srcDoc={wrapHtml(settings.html)}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'inherit', display: 'block' }}
      title={settings.title ?? 'Custom widget'}
    />
  )
}
