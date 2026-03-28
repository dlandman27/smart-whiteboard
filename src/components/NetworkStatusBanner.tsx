import { Icon, Text } from '../ui/web'

export function NetworkStatusBanner() {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-xl shadow-lg pointer-events-none">
      <Icon icon="WifiSlash" size={14} className="text-red-400" />
      <Text as="span" variant="label" className="text-white">No internet connection</Text>
    </div>
  )
}
