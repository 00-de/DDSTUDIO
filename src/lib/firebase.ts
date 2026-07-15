import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

export interface FbConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
}

let app: FirebaseApp | null = null
let db: Firestore | null = null

const KEY = 'dds.firebase'

export function saveConfig(cfg: FbConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}
export function loadConfig(): FbConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as FbConfig) : null
  } catch {
    return null
  }
}
export function clearConfig() {
  localStorage.removeItem(KEY)
}

// 設定文字列（Firebase コンソールからコピーした内容）を解析
export function parseConfig(text: string): FbConfig | null {
  try {
    // まず JSON として試す
    return JSON.parse(text) as FbConfig
  } catch {
    /* JS オブジェクト形式を試す */
  }
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    // キーをクォート、末尾カンマ除去
    const json = m[0]
      .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/,(\s*[}\]])/g, '$1')
    const o = JSON.parse(json)
    if (o.apiKey && o.projectId && o.appId) return o as FbConfig
    return null
  } catch {
    return null
  }
}

export function getDb(): Firestore | null {
  if (db) return db
  const cfg = loadConfig()
  if (!cfg) return null
  try {
    app = initializeApp(cfg)
    db = getFirestore(app)
    return db
  } catch (e) {
    console.error('Firebase 初期化に失敗:', e)
    return null
  }
}

export function isConfigured(): boolean {
  return !!loadConfig()
}
