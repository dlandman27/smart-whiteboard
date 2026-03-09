# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start both client (port 5173) and server (port 3001) concurrently
npm run client     # Vite dev server only
npm run server     # Express server only (tsx watch)
npm run build      # tsc -b && vite build
npm run preview    # Preview production build
```

## Environment Setup

Copy `.env.example` to `.env` and set `NOTION_API_KEY` (get from https://www.notion.so/my-integrations — create an integration and share your databases with it).

## Architecture

**Full-stack TypeScript app** with a React frontend and Express backend. The Vite dev server proxies all `/api/*` requests to the Express server at `http://localhost:3001`, so the frontend always calls `/api/...` without hardcoding ports.

**Backend (`server/index.ts`)** — Express server that wraps the Notion API:
- `GET /api/health` — config status check
- `GET /api/databases` — list all databases accessible to the integration
- `GET /api/databases/:id` — retrieve database metadata/properties
- `POST /api/databases/:id/query` — query database entries (supports sorts, filter, page_size)
- `POST /api/databases/:id/pages` — create a new page in a database
- `PATCH /api/pages/:id` — update a page's properties
- `DELETE /api/pages/:id` — archive (soft-delete) a page

**Frontend (`src/`)** — React 18 app with:
- **Zustand** for client-side state management
- **TanStack Query** for server state / data fetching from the Express API
- **react-rnd** for draggable and resizable whiteboard widgets
- **Tailwind CSS** for styling
