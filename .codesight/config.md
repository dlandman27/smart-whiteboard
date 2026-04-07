# Config

## Environment Variables

- `ANTHROPIC_API_KEY` (has default) — .env.example
- `BING_SEARCH_API_KEY` **required** — .env.example
- `BRAVE_SEARCH_API_KEY` **required** — server\services\voice-tools\web.ts
- `DEV` **required** — src\ui\web\Icon.tsx
- `ELEVENLABS_API_KEY` (has default) — .env.example
- `ELEVENLABS_VOICE_ID` **required** — server\routes\voice.ts
- `GOOGLE_CLIENT_ID` (has default) — .env
- `GOOGLE_CLIENT_SECRET` (has default) — .env
- `NOTION_API_KEY` (has default) — .env.example
- `NOTION_PARENT_PAGE_ID` **required** — server\routes\notion.ts
- `NTFY_SERVER` **required** — server\lib\notify.ts
- `NTFY_TOPIC` **required** — server\lib\notify.ts
- `PORT` (has default) — .env.example
- `SPOTIFY_CLIENT_ID` (has default) — .env
- `SPOTIFY_CLIENT_SECRET` (has default) — .env
- `VITE_ANTHROPIC_API_KEY` (has default) — .env
- `VITE_BING_SEARCH_API_KEY` **required** — server\services\voice-tools\web.ts
- `VITE_BRAVE_SEARCH_API_KEY` (has default) — .env
- `VITE_ELEVENLABS_API_KEY` (has default) — .env
- `VITE_ELEVENLABS_VOICE_ID` (has default) — .env
- `VITE_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (has default) — .env.example
- `VITE_PUBLIC_SUPABASE_URL` (has default) — .env.example
- `VITE_YOUTUBE_API_KEY` (has default) — .env
- `WHITEBOARD_URL` **required** — mcp\server.ts
- `YOUTUBE_API_KEY` (has default) — .env.example

## Config Files

- `.env.example`
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
