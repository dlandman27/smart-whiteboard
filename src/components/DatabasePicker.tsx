import { Database, X, AlertCircle } from 'lucide-react'
import { useNotionDatabases, useNotionHealth } from '../hooks/useNotion'
import { useWhiteboardStore } from '../store/whiteboard'

interface Props {
  onClose: () => void
}

function dbTitle(db: any): string {
  return db.title?.map((t: any) => t.plain_text).join('') || 'Untitled'
}

export function DatabasePicker({ onClose }: Props) {
  const health = useNotionHealth()
  const { data, isLoading, error } = useNotionDatabases()
  const { boards, activeBoardId, addWidget } = useWhiteboardStore()
  const widgets = boards.find((b) => b.id === activeBoardId)?.widgets ?? []

  function handleAdd(db: any) {
    const title = dbTitle(db)
    const offset = widgets.length * 24
    addWidget({
      databaseId: db.id,
      databaseTitle: title,
      x: 60 + offset,
      y: 60 + offset,
      width: 500,
      height: 380,
    })
    onClose()
  }

  const notConfigured = health.data && !health.data.configured

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl shadow-xl w-96 max-h-[520px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h2 className="text-stone-700 font-semibold text-sm">Add Database Widget</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {notConfigured && (
            <div className="flex items-start gap-2 m-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>NOTION_API_KEY is not set. Copy .env.example to .env and restart the server.</span>
            </div>
          )}

          {isLoading && (
            <div className="text-stone-400 text-sm text-center py-8">Loading databases…</div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center py-8 px-4">
              <p className="font-medium">Could not load databases</p>
              <p className="text-xs text-red-400 mt-1">{(error as Error).message}</p>
            </div>
          )}

          {data?.results?.length === 0 && (
            <div className="text-stone-400 text-sm text-center py-8 px-4">
              No databases found. Make sure your integration has been shared with at least one database in Notion.
            </div>
          )}

          {data?.results?.map((db: any) => {
            const title = dbTitle(db)
            const alreadyAdded = widgets.some((w) => w.databaseId === db.id)
            return (
              <button
                key={db.id}
                onClick={() => !alreadyAdded && handleAdd(db)}
                disabled={alreadyAdded}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <Database size={14} className="text-blue-500" />
                </div>
                <span className="text-stone-700 text-sm flex-1 truncate">{title}</span>
                {alreadyAdded && (
                  <span className="text-xs text-stone-400 flex-shrink-0">On board</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
