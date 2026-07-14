const WEBAPP_URL = import.meta.env.VITE_SHEETS_WEBAPP_URL || ''

const LOCAL_KEYS = {
  entries: 'tcm-essence:entries',
  logs: 'tcm-essence:logs',
  queue: 'tcm-essence:queue',
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
    body: JSON.stringify({ action, ...payload }),
  })
  if (!res.ok) throw new Error('post-failed')
  return res.json()
}

function queuePush(item) {
  const queue = readLocal(LOCAL_KEYS.queue, [])
  queue.push(item)
  writeLocal(LOCAL_KEYS.queue, queue)
}

export async function fetchAll() {
  if (isConfigured()) {
    try {
      const res = await fetch(`${WEBAPP_URL}?action=list`)
      if (!res.ok) throw new Error('list-failed')
      const data = await res.json()
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
