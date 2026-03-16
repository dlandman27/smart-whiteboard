// Wait for Vite, then open Chrome in kiosk mode
import { exec } from 'child_process'
import http from 'http'

const URL = 'http://localhost:5173'

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      res.resume()
      resolve(true)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(500, () => { req.destroy(); resolve(false) })
  })
}

async function waitForServer(retries = 40) {
  for (let i = 0; i < retries; i++) {
    if (await checkServer()) {
      console.log(`[kiosk] Server ready, launching Chrome...`)
      exec(`start chrome --kiosk --app=${URL}`, (err) => {
        if (err) console.error('[kiosk] Failed to open Chrome:', err.message)
      })
      return
    }
    await new Promise(r => setTimeout(r, 500))
  }
  console.error('[kiosk] Server never became ready, giving up.')
}

await waitForServer()
