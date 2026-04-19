import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = path.join(__dirname, '..')

// ── Helpers ───────────────────────────────────────────────────────────────────

const results: { name: string; status: 'pass' | 'fail' | 'skip'; error?: string; note?: string }[] = []

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${name} ... `)
  try {
    await fn()
    results.push({ name, status: 'pass' })
    console.log('\x1b[32m✓\x1b[0m')
  } catch (e: any) {
    results.push({ name, status: 'fail', error: e?.message ?? String(e) })
    console.log('\x1b[31m✗\x1b[0m', e?.message ?? e)
  }
}

function skip(name: string, reason: string) {
  results.push({ name, status: 'skip', note: reason })
  console.log(`  ${name} ... \x1b[33mskip\x1b[0m (${reason})`)
}

async function call(client: Client, tool: string, args: Record<string, unknown> = {}) {
  const res = await client.callTool({ name: tool, arguments: args })
  const content = (res.content as any[])[0]
  if (!content?.text) throw new Error('No text in response')
  if (content.text.startsWith('Error:') || content.text.includes('not found')) {
    throw new Error(content.text)
  }
  return content.text as string
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n\x1b[1mWhiteboard MCP — End-to-End Test Suite\x1b[0m')
  console.log('─'.repeat(50))
  console.log('Spawning MCP server...\n')

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'mcp/server.ts'],
    env: { ...process.env, WHITEBOARD_URL: 'http://localhost:3001' },
  })

  const client = new Client({ name: 'mcp-test', version: '1.0.0' })
  await client.connect(transport)

  // Track IDs across tests for cleanup
  let clockWidgetId = ''
  let noteWidgetId = ''
  let htmlWidgetId = ''
  let dupWidgetId = ''
  let testBoardId = ''
  let originalBoardId = ''

  // ── Board tools ─────────────────────────────────────────────────────────────
  console.log('\x1b[1mBoards\x1b[0m')

  await test('list_boards', async () => {
    const text = await call(client, 'list_boards')
    // Extract original active board ID
    const match = text.match(/id: ([a-f0-9-]+)/)
    if (match) originalBoardId = match[1]
  })

  await test('create_board', async () => {
    const text = await call(client, 'create_board', { name: 'MCP Test Board' })
    const match = text.match(/\(id: ([a-f0-9-]+)\)/)
    if (!match) throw new Error('No board ID in response')
    testBoardId = match[1]
  })

  await test('rename_board', async () => {
    if (!testBoardId) throw new Error('No test board ID')
    await call(client, 'rename_board', { id: testBoardId, name: 'MCP Test Board (renamed)' })
  })

  await test('list_board_widgets', async () => {
    if (!testBoardId) throw new Error('No test board ID')
    await call(client, 'list_board_widgets', { boardId: testBoardId })
  })

  // ── Widget schema tools ──────────────────────────────────────────────────────
  console.log('\n\x1b[1mWidget Schema\x1b[0m')

  await test('describe_widget_type (clock)', async () => {
    const text = await call(client, 'describe_widget_type', { widgetType: '@whiteboard/clock' })
    if (!text.includes('display')) throw new Error('Missing settings in response')
  })

  await test('describe_widget_type (unknown)', async () => {
    const res = await client.callTool({ name: 'describe_widget_type', arguments: { widgetType: '@whiteboard/fake' } })
    const text = (res.content as any[])[0]?.text ?? ''
    if (!text.includes('Unknown widget type')) throw new Error('Expected unknown widget error')
  })

  await test('describe_design_system', async () => {
    const text = await call(client, 'describe_design_system')
    if (!text.includes('useWidgetSettings')) throw new Error('Missing design system content')
  })

  await test('get_widget_source (clock)', async () => {
    const text = await call(client, 'get_widget_source', { widgetType: '@whiteboard/clock' })
    if (!text.includes('ClockWidget')) throw new Error('Missing widget source')
  })

  await test('get_widget_source (unknown)', async () => {
    const res = await client.callTool({ name: 'get_widget_source', arguments: { widgetType: '@whiteboard/fake' } })
    const text = (res.content as any[])[0]?.text ?? ''
    if (!text.includes('not found') && !text.includes('File not found')) throw new Error('Expected not found error')
  })

  // ── Widget CRUD ──────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mWidget CRUD\x1b[0m')

  await test('list_widgets (empty board)', async () => {
    const text = await call(client, 'list_widgets')
    if (!text.includes('Canvas size')) throw new Error('Missing canvas info')
  })

  await test('create_widget (clock, centered)', async () => {
    const text = await call(client, 'create_widget', { widgetType: '@whiteboard/clock' })
    const match = text.match(/id: ([a-f0-9-]+)/)
    if (!match) throw new Error('No widget ID in response')
    clockWidgetId = match[1]
  })

  await test('create_widget (note, with settings)', async () => {
    const text = await call(client, 'create_widget', {
      widgetType: '@whiteboard/note',
      x: 100, y: 100,
      settings: { content: 'MCP test note ✓', fontSize: 20 },
    })
    const match = text.match(/id: ([a-f0-9-]+)/)
    if (!match) throw new Error('No widget ID in response')
    noteWidgetId = match[1]
  })

  await test('create_widget (countdown, with settings)', async () => {
    await call(client, 'create_widget', {
      widgetType: '@whiteboard/countdown',
      x: 500, y: 100,
      settings: { title: 'Test Event', targetDate: '2026-12-31' },
    })
  })

  await test('create_widget (quote)', async () => {
    await call(client, 'create_widget', { widgetType: '@whiteboard/quote', x: 800, y: 100 })
  })

  await test('list_widgets (populated)', async () => {
    const text = await call(client, 'list_widgets')
    if (!text.includes(clockWidgetId)) throw new Error('Clock widget not listed')
  })

  await test('update_widget (move)', async () => {
    if (!clockWidgetId) throw new Error('No clock widget ID')
    await call(client, 'update_widget', { id: clockWidgetId, x: 50, y: 50 })
  })

  await test('update_widget (resize + settings)', async () => {
    if (!clockWidgetId) throw new Error('No clock widget ID')
    await call(client, 'update_widget', {
      id: clockWidgetId,
      width: 400, height: 250,
      settings: { display: 'analog', showDate: true },
    })
  })

  await test('duplicate_widget', async () => {
    if (!noteWidgetId) throw new Error('No note widget ID')
    const text = await call(client, 'duplicate_widget', { id: noteWidgetId, offsetX: 40, offsetY: 40 })
    const match = text.match(/new id: ([a-f0-9-]+)/)
    if (!match) throw new Error('No new widget ID in response')
    dupWidgetId = match[1]
  })

  await test('focus_widget', async () => {
    if (!clockWidgetId) throw new Error('No clock widget ID')
    await call(client, 'focus_widget', { id: clockWidgetId })
  })

  await test('unfocus_widget', async () => {
    await call(client, 'unfocus_widget')
  })

  // ── HTML widget ──────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mHTML Widget\x1b[0m')

  await test('create_html_widget', async () => {
    const text = await call(client, 'create_html_widget', {
      html: `<!DOCTYPE html><html><body style="margin:0;background:transparent;display:flex;align-items:center;justify-content:center;height:100vh"><p style="color:#e2e8f0;font-size:4vw;font-family:sans-serif">MCP Test Widget ✓</p></body></html>`,
      title: 'MCP Test',
      x: 1200, y: 400,
      width: 400, height: 200,
    })
    const match = text.match(/id: ([a-f0-9-]+)/)
    if (!match) throw new Error('No widget ID in response')
    htmlWidgetId = match[1]
  })

  await test('update_html_widget', async () => {
    if (!htmlWidgetId) throw new Error('No HTML widget ID')
    await call(client, 'update_html_widget', {
      id: htmlWidgetId,
      html: `<!DOCTYPE html><html><body style="margin:0;background:transparent;display:flex;align-items:center;justify-content:center;height:100vh"><p style="color:#68d391;font-size:4vw;font-family:sans-serif">Updated ✓</p></body></html>`,
    })
  })

  // ── Theme tools ──────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mThemes\x1b[0m')

  const themes = ['midnight', 'ocean', 'dracula', 'paper']
  for (const theme of themes) {
    await test(`set_theme (${theme})`, async () => {
      await call(client, 'set_theme', { themeId: theme })
    })
  }

  await test('create_custom_theme', async () => {
    await call(client, 'create_custom_theme', {
      baseTheme: 'midnight',
      accent: '#ff6b6b',
      canvasBg: '#0a0a0f',
      canvasDot: '#1a1a2e',
      widgetBg: 'rgba(20,20,40,0.9)',
    })
  })

  // ── Layout tools ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mLayouts\x1b[0m')

  await test('create_layout', async () => {
    await call(client, 'create_layout', {
      slots: [
        { id: 'sidebar', x: 0, y: 0, width: 0.25, height: 1, label: 'Sidebar' },
        { id: 'main', x: 0.25, y: 0, width: 0.75, height: 1, label: 'Main' },
      ],
    })
  })

  await test('apply_layout', async () => {
    await call(client, 'apply_layout', {
      clearExisting: true,
      widgets: [
        { widgetType: '@whiteboard/clock', x: 20, y: 20 },
        { widgetType: '@whiteboard/note', x: 20, y: 250, settings: { content: 'Applied via apply_layout ✓' } },
        { widgetType: '@whiteboard/quote', x: 500, y: 20 },
      ],
    })
    // Re-capture clock widget ID from list
    const listText = await call(client, 'list_widgets')
    const match = listText.match(/"id":\s*"([a-f0-9-]+)"/)
    if (match) clockWidgetId = match[1]
  })

  // ── Screensaver ──────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mScreensaver\x1b[0m')

  await test('enable_screensaver', async () => {
    await call(client, 'enable_screensaver')
  })

  await test('disable_screensaver', async () => {
    await call(client, 'disable_screensaver')
  })

  // ── Notion ───────────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mNotion\x1b[0m')

  await test('list_notion_databases', async () => {
    // Just check it responds — may have 0 DBs if Notion key not set
    const res = await client.callTool({ name: 'list_notion_databases', arguments: {} })
    const text = (res.content as any[])[0]?.text ?? ''
    if (!text) throw new Error('Empty response')
  })

  skip('create_notion_database', 'requires parentPageId — manual test only')
  skip('link_notion_database', 'requires existing DB ID — manual test only')
  skip('set_notion_workspace_page', 'modifies persistent config — manual test only')
  skip('create_widget_component', 'writes source files to disk — manual test only')

  // ── Board switch + cleanup ───────────────────────────────────────────────────
  console.log('\n\x1b[1mCleanup\x1b[0m')

  await test('switch_board (back to original)', async () => {
    if (!originalBoardId) throw new Error('No original board ID')
    await call(client, 'switch_board', { id: originalBoardId })
  })

  await test('delete_board (test board)', async () => {
    if (!testBoardId) throw new Error('No test board ID')
    await call(client, 'delete_board', { id: testBoardId })
  })

  // ── Results ──────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const skipped = results.filter((r) => r.status === 'skip').length

  console.log('\n' + '─'.repeat(50))
  console.log(`\x1b[1mResults: \x1b[32m${passed} passed\x1b[0m  \x1b[31m${failed} failed\x1b[0m  \x1b[33m${skipped} skipped\x1b[0m`)

  if (failed > 0) {
    console.log('\n\x1b[1mFailures:\x1b[0m')
    for (const r of results.filter((r) => r.status === 'fail')) {
      console.log(`  \x1b[31m✗\x1b[0m ${r.name}: ${r.error}`)
    }
  }

  await client.close()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((e) => {
  console.error('\x1b[31mFatal error:\x1b[0m', e)
  process.exit(1)
})
