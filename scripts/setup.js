// Kill stale processes before starting - always exits 0
import { exec } from 'child_process'
await new Promise(resolve => exec('npx kill-port 3001 5173', () => resolve()))
console.log('[setup] Ports cleared')
