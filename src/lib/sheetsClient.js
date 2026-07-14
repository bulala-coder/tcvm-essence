const WEBAPP_URL = import.meta.env.VITE_SHEETS_WEBAPP_URL || ''
const PIN_KEY = 'tcm-essence:pin'

const LOCAL_KEYS = {
  entries: 'tcm-essence:entries',
  logs: 'tcm-essence:logs',
  queue: 'tcm-essence:queue',
}

// 密碼只存在這支裝置的瀏覽器本機，不會出現在網頁原始碼裡
function getPin() {
  let pin = localStorage.getItem(PIN_KEY)
  if (!pin) {
    pin = window.prompt('請輸入使用密碼') || ''
    if (pin) localStorage.setItem(PIN_KEY, pin)
  }
  return pin
}

function clearPin() {
  localStorage.removeItem(PIN_KEY)
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 儲存空間爆了也不擋住使用者
  }
}

function isConfigured() {
  return Boolean(WEBAPP_URL)
}

async function postAction(action, payload) {
  if (!isConfigured()) throw new Error('not-configured')
  const res = await fetch(WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload, pin: getPin() }),
  })
  if (!res.ok) throw new Error('post-failed')
  const data = await res.json()
  if (data.error === 'unauthorized') {
    clearPin()
    throw new Error('密碼錯誤')
  }
  return data
}

function queuePush(item) {
  const queue = readLocal(LOCAL_KEYS.queue, [])
  queue.push(item)
  writeLocal(LOCAL_KEYS.queue, queue)
}

export async function fetchAll() {
  if (isConfigured()) {
    try {
      const res = await fetch(`${WEBAPP_URL}?action=list&pin=${encodeURIComponent(getPin())}`)
      if (!res.ok) throw new Error('list-failed')
      const data = await res.json()
      if (data.error === 'unauthorized') {
        clearPin()
        throw new Error('密碼錯誤')
      }
      writeLocal(LOCAL_KEYS.entries, data.entries || [])
      writeLocal(LOCAL_KEYS.logs, data.logs || [])
      return { entries: data.entries || [], logs: data.logs || [], online: true }
    } catch {
      // 掉線就退回本機資料
    }
  }
  return {
    entries: readLocal(LOCAL_KEYS.entries, []),
    logs: readLocal(LOCAL_KEYS.logs, []),
    online: false,
  }
}

export async function saveEntry(entry) {
  const entries = readLocal(LOCAL_KEYS.entries, [])
  const idx = entries.findIndex((e) => e.id === entry.id)
  if (idx >= 0) entries[idx] = entry
  else entries.unshift(entry)
  writeLocal(LOCAL_KEYS.entries, entries)

  try {
    await postAction('upsert_entry', { entry })
    return { synced: true }
  } catch {
    queuePush({ action: 'upsert_entry', entry })
    return { synced: false }
  }
}

export async function deleteEntry(id) {
  const entries = readLocal(LOCAL_KEYS.entries, []).filter((e) => e.id !== id)
  writeLocal(LOCAL_KEYS.entries, entries)
  const logs = readLocal(LOCAL_KEYS.logs, []).filter((l) => l.entry_id !== id)
  writeLocal(LOCAL_KEYS.logs, logs)

  try {
    await postAction('delete_entry', { id })
    return { synced: true }
  } catch {
    queuePush({ action: 'delete_entry', id })
    return { synced: false }
  }
}

export async function saveLog(log) {
  const logs = readLocal(LOCAL_KEYS.logs, [])
  const idx = logs.findIndex((l) => l.id === log.id)
  if (idx >= 0) logs[idx] = log
  else logs.unshift(log)
  writeLocal(LOCAL_KEYS.logs, logs)

  try {
    await postAction('upsert_log', { log })
    return { synced: true }
  } catch {
    queuePush({ action: 'upsert_log', log })
    return { synced: false }
  }
}

export async function deleteLog(id) {
  const logs = readLocal(LOCAL_KEYS.logs, []).filter((l) => l.id !== id)
  writeLocal(LOCAL_KEYS.logs, logs)

  try {
    await postAction('delete_log', { id })
    return { synced: true }
  } catch {
    queuePush({ action: 'delete_log', id })
    return { synced: false }
  }
}

export async function flushQueue() {
  if (!isConfigured()) return { flushed: 0, remaining: 0 }
  const queue = readLocal(LOCAL_KEYS.queue, [])
  if (queue.length === 0) return { flushed: 0, remaining: 0 }

  const remaining = []
  let flushed = 0
  for (const item of queue) {
    try {
      await postAction(item.action, item)
      flushed++
    } catch {
      remaining.push(item)
    }
  }
  writeLocal(LOCAL_KEYS.queue, remaining)
  return { flushed, remaining: remaining.length }
}

export function pendingCount() {
  return readLocal(LOCAL_KEYS.queue, []).length
}

export function sheetsConfigured() {
  return isConfigured()
}

export function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
