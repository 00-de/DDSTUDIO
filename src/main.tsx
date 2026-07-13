import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useStore } from '@/store/useStore'

// ---- 永続化（最近使用したプロジェクト・設定）----
try {
  const rawRecent = localStorage.getItem('dds.recent')
  const rawSettings = localStorage.getItem('dds.settings')
  if (rawRecent) useStore.setState({ recent: JSON.parse(rawRecent) })
  if (rawSettings) useStore.setState({ settings: { ...useStore.getState().settings, ...JSON.parse(rawSettings) } })
} catch {
  /* noop */
}

useStore.subscribe((state) => {
  try {
    localStorage.setItem('dds.recent', JSON.stringify(state.recent))
    localStorage.setItem('dds.settings', JSON.stringify(state.settings))
  } catch {
    /* noop */
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
