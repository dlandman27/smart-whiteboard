import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerPluginWidgets } from './components/widgets/registry'
import { loadPluginDefs } from './plugins/loader'

registerPluginWidgets(loadPluginDefs())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
