# Config

## Environment Variables

- `ANTHROPIC_API_KEY` (has default) — .env.example
- `BING_API_KEY` **required** — server/routes/notion.ts
- `BING_SEARCH_API_KEY` **required** — .env.example
- `BRAVE_SEARCH_API_KEY` **required** — server/services/voice-tools/web.ts
- `DB_PATH` **required** — server/services/db.ts
- `DEV` **required** — packages/ui-kit/src/Icon.tsx
- `ELEVENLABS_API_KEY` (has default) — .env.example
- `ELEVENLABS_VOICE_ID` **required** — server/routes/voice.ts
- `ENCRYPTION_KEY` (has default) — .env.example
- `GOOGLE_CLIENT_ID` (has default) — .env.example
- `GOOGLE_CLIENT_SECRET` (has default) — .env.example
- `GOOGLE_REDIRECT_URI` (has default) — .env.example
- `NODE_ENV` **required** — server/index.ts
- `NOTION_API_KEY` (has default) — .env.example
- `NOTION_PARENT_PAGE_ID` **required** — server/routes/notion.ts
- `NTFY_SERVER` **required** — server/lib/notify.ts
- `NTFY_TOPIC` **required** — server/lib/notify.ts
- `PORT` (has default) — .env.example
- `SUPABASE_SERVICE_ROLE_KEY` (has default) — .env.example
- `SUPABASE_URL` (has default) — .env.example
- `VITE_ANTHROPIC_API_KEY` **required** — server/routes/canvas.ts
- `VITE_BING_SEARCH_API_KEY` **required** — server/services/voice-tools/web.ts
- `VITE_BRAVE_SEARCH_API_KEY` **required** — server/services/voice-tools/web.ts
- `VITE_ELEVENLABS_API_KEY` **required** — server/routes/voice.ts
- `VITE_ELEVENLABS_VOICE_ID` **required** — server/routes/voice.ts
- `VITE_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (has default) — .env.example
- `VITE_PUBLIC_SUPABASE_URL` (has default) — .env.example
- `WALLI_API_URL` **required** — server/routes/voice.ts
- `WHITEBOARD_URL` **required** — mcp/server.ts
- `YOUTUBE_API_KEY` (has default) — .env.example

## Config Files

- `.env.example`
- `railway.json`
- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`

## Key Dependencies

- @anthropic-ai/sdk: ^0.80.0
- @supabase/supabase-js: ^2.100.0
- better-sqlite3: ^12.8.0
- express: ^4.19.2
- react: ^18.3.1
- zod: ^3.25.76
