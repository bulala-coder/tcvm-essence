import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  fetchAll,
  saveEntry,
  deleteEntry,
  saveLog,
  deleteLog,
  flushQueue,
  pendingCount,
  sheetsConfigured,
  newId,
} from './lib/sheetsClient'
import { CATEGORIES, CATEGORY_LIST, EFFECTS, effectColor, getCategoryMeta } from './lib/constants'

function SealBadge({ category, size = 'md' }) {
  const meta = getCategoryMeta(category)
  const dims = size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-9 h-9 text-base'
  return (
    <div
      className={`${dims} shrink-0 flex items-center justify-center rounded-sm font-display font-bold text-paper -rotate-6 shadow-sm select-none`}
      style={{ backgroundColor: meta.accent }}
      aria-hidden="true"
    >
      {meta.seal}
    </div>
  )
}

function Tag({ children }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-ink/20 text-ink-soft/80 bg-paper-warm/60">
      {children}
    </span>
  )
}

function SyncDot({ online, pending }) {
  if (!sheetsConfigured()) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-mono text-ink-faint">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-faint/50" />
        僅本機儲存
      </span>
    )
  }
  if (pending > 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-mono text-seal">
        <span className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
        {pending} 筆待同步
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-mono text-needle">
      <span className="w-1.5 h-1.5 rounded-full bg-needle" />
      {online ? '已同步' : '離線'}
    </span>
  )
}

function EntryCard({ entry, logs, onOpen }) {
  const meta = getCategoryMeta(entry.category)
  const entryLogs = logs.filter((l) => l.entry_id === entry.id)
  const lastLog = entryLogs[0]
  return (
    <button
      onClick={() => onOpen(entry.id)}
      className="group text-left bg-paper-warm/70 border border-ink/10 rounded-md p-4 hover:border-ink/30 hover:-translate-y-0.5 transition-all duration-150 hover:shadow-md relative overflow-hidden"
      style={{ borderLeftWidth: '3px', borderLeftColor: meta.accent }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-ink truncate">{entry.name}</h3>
          {entry.aliases ? (
            <p className="text-xs text-ink-faint font-mono truncate">{entry.aliases}</p>
          ) : null}
        </div>
        <SealBadge category={entry.category} />
      </div>
      {entry.indications ? (
        <p className="text-sm text-ink-soft/90 line-clamp-2 mb-2 leading-relaxed">
          {entry.indications}
        </p>
      ) : (
        <p className="text-sm text-ink-faint italic mb-2">尚未填寫主治／適應症</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap gap-1">
          {(entry.tags || []).slice(0, 3).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-ink-faint shrink-0">
          {lastLog ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: effectColor(lastLog.effect) }} />
              {entryLogs.length} 則心得
            </>
          ) : (
            '尚無臨床記錄'
          )}
        </div>
      </div>
    </button>
  )
}

function EntryForm({ initial, onCancel, onSave }) {
  const [category, setCategory] = useState(initial?.category || '中藥')
  const [name, setName] = useState(initial?.name || '')
  const [aliases, setAliases] = useState(initial?.aliases || '')
  const [keyInfo, setKeyInfo] = useState(initial?.key_info || '')
  const [indications, setIndications] = useState(initial?.indications || '')
  const [core, setCore] = useState(initial?.core || '')
  const [related, setRelated] = useState(initial?.related || '')
  const [tags, setTags] = useState((initial?.tags || []).join('、'))
  const meta = getCategoryMeta(category)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const now = new Date().toISOString()
    onSave({
      id: initial?.id || newId('entry'),
      category,
      name: name.trim(),
      aliases: aliases.trim(),
      key_info: keyInfo.trim(),
      indications: indications.trim(),
      core: core.trim(),
      related: related.trim(),
      tags: tags.split(/[、,，]/).map((t) => t.trim()).filter(Boolean),
      created_at: initial?.created_at || now,
      updated_at: now,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-mono text-ink-faint block mb-2">分類</label>
        <div className="flex gap-2">
          {CATEGORY_LIST.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-sm text-sm font-display border transition-colors ${
                category === c ? 'text-paper border-transparent' : 'text-ink-soft border-ink/20 hover:border-ink/40'
              }`}
              style={category === c ? { backgroundColor: CATEGORIES[c].accent } : {}}
            >
              {CATEGORIES[c].seal} {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-mono text-ink-faint block mb-1">名稱 *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-transparent border-b-2 border-ink/20 focus:border-seal px-1 py-1.5 font-display text-lg outline-none transition-colors"
            placeholder={category === '針灸' ? '例：足三里' : category === '方劑' ? '例：桂枝湯' : '例：黃耆'}
          />
        </div>
        <div>
          <label className="text-xs font-mono text-ink-faint block mb-1">別名／出處</label>
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            className="w-full bg-transparent border-b border-ink/20 focus:border-seal px-1 py-1.5 outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-mono text-ink-faint block mb-1">{meta.keyInfoLabel}</label>
        <input
          value={keyInfo}
          onChange={(e) => setKeyInfo(e.target.value)}
          className="w-full bg-transparent border-b border-ink/20 focus:border-seal px-1 py-1.5 outline-none transition-colors"
          placeholder={meta.keyInfoPlaceholder}
        />
      </div>

      <div>
        <label className="text-xs font-mono text-ink-faint block mb-1">{meta.indicationsLabel}</label>
        <textarea
          value={indications}
          onChange={(e) => setIndications(e.target.value)}
          rows={2}
          className="w-full bg-paper/60 border border-ink/15 focus:border-seal rounded-sm px-3 py-2 outline-none transition-colors resize-none"
          placeholder={meta.indicationsPlaceholder}
        />
      </div>

      <div>
        <label className="text-xs font-mono text-ink-faint block mb-1">{meta.coreLabel}｜本質探討</label>
        <textarea
          value={core}
          onChange={(e) => setCore(e.target.value)}
          rows={6}
          className="w-full bg-paper/60 border border-ink/15 focus:border-seal rounded-sm px-3 py-2 outline-none transition-colors leading-relaxed"
          placeholder={meta.corePlaceholder}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-mono text-ink-faint block mb-1">相關條目</label>
          <input
            value={related}
            onChange={(e) => setRelated(e.target.value)}
            className="w-full bg-transparent border-b border-ink/20 focus:border-seal px-1 py-1.5 outline-none transition-colors"
            placeholder="例：桂枝湯、麻黃湯"
          />
        </div>
        <div>
          <label className="text-xs font-mono text-ink-faint block mb-1">標籤（頓號分隔）</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-transparent border-b border-ink/20 focus:border-seal px-1 py-1.5 outline-none transition-colors"
            placeholder="例：解表、太陽病"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-ink-faint hover:text-ink transition-colors">
          取消
        </button>
        <button type="submit" className="px-5 py-2 text-sm font-display bg-ink text-paper rounded-sm hover:bg-ink-soft transition-colors">
          {initial ? '儲存修改' : '建立條目'}
        </button>
      </div>
    </form>
  )
}

function LogForm({ entryId, onSave, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [scenario, setScenario] = useState('')
  const [effect, setEffect] = useState('顯效')
  const [note, setNote] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!scenario.trim() && !note.trim()) return
    onSave({
      id: newId('log'),
      entry_id: entryId,
      date,
      scenario: scenario.trim(),
      effect,
      note: note.trim(),
      created_at: new Date().toISOString(),
    })
    setScenario('')
    setNote('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-paper/70 border border-ink/15 rounded-sm p-4 space-y-3">
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="text-xs font-mono text-ink-faint block mb-1">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent border-b border-ink/20 focus:border-seal px-1 py-1 text-sm outline-none"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-mono text-ink-faint block mb-1">應用情境／病症</label>
          <input
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="w-full bg-transparent border-b border-ink/20 focus:border-seal px-1 py-1 text-sm outline-none"
            placeholder="例：老犬慢性腹瀉、舌淡胖苔白"
          />
        </div>
        <div>
          <label className="text-xs font-mono text-ink-faint block mb-1">效果</label>
          <select
            value={effect}
            onChange={(e) => setEffect(e.target.value)}
            className="bg-transparent border-b border-ink/20 focus:border-seal px-1 py-1 text-sm outline-none"
          >
            {EFFECTS.map((ef) => (
              <option key={ef.value} value={ef.value}>{ef.value}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-mono text-ink-faint block mb-1">心得</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full bg-paper/60 border border-ink/15 focus:border-seal rounded-sm px-3 py-2 text-sm outline-none resize-none"
          placeholder="這次用下去，跟你原本對它本質的理解，印證了什麼、修正了什麼？"
        />
      </div>
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-ink-faint hover:text-ink">
            取消
          </button>
        )}
        <button type="submit" className="px-4 py-1.5 text-xs font-display bg-seal text-paper rounded-sm hover:bg-seal-soft transition-colors">
          加入記錄
        </button>
      </div>
    </form>
  )
}

function EntryDetail({ entry, logs, onClose, onEdit, onDelete, onSaveLog, onDeleteLog }) {
  const meta = getCategoryMeta(entry.category)
  const entryLogs = logs
    .filter((l) => l.entry_id === entry.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-paper overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-paper/95 backdrop-blur border-b border-ink/10 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex items-start gap-3 min-w-0">
            <SealBadge category={entry.category} size="lg" />
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold text-ink truncate">{entry.name}</h2>
              {entry.aliases && <p className="text-sm text-ink-faint font-mono">{entry.aliases}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onEdit(entry)} className="text-xs font-mono px-2.5 py-1.5 border border-ink/20 rounded-sm hover:border-ink/40 transition-colors">
              編輯
            </button>
            <button
              onClick={() => {
                if (confirm(`確定要刪除「${entry.name}」嗎？相關心得記錄也會一併刪除。`)) onDelete(entry.id)
              }}
              className="text-xs font-mono px-2.5 py-1.5 border border-seal/30 text-seal rounded-sm hover:bg-seal/5 transition-colors"
            >
              刪除
            </button>
            <button onClick={onClose} className="text-xl text-ink-faint hover:text-ink px-1 transition-colors" aria-label="關閉">
              ×
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {entry.key_info && (
            <div>
              <p className="text-xs font-mono text-ink-faint mb-1">{meta.keyInfoLabel}</p>
              <p className="font-display text-base text-ink-soft">{entry.key_info}</p>
            </div>
          )}
          {entry.indications && (
            <div>
              <p className="text-xs font-mono text-ink-faint mb-1">{meta.indicationsLabel}</p>
              <p className="text-ink-soft leading-relaxed">{entry.indications}</p>
            </div>
          )}
          {entry.core && (
            <div className="border-l-2 pl-4" style={{ borderColor: meta.accent }}>
              <p className="text-xs font-mono mb-1.5" style={{ color: meta.accent }}>{meta.coreLabel}｜本質探討</p>
              <p className="text-ink leading-loose whitespace-pre-wrap font-display">{entry.core}</p>
            </div>
          )}
          {(entry.related || (entry.tags || []).length > 0) && (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {entry.related && (
                <p className="text-ink-faint">
                  <span className="font-mono text-xs">相關 → </span>
                  {entry.related}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(entry.tags || []).map((t) => <Tag key={t}>{t}</Tag>)}
              </div>
            </div>
          )}

          <div className="brush-rule text-ink" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-ink">臨床應用心得</h3>
              <span className="text-xs font-mono text-ink-faint">{entryLogs.length} 則</span>
            </div>

            <LogForm entryId={entry.id} onSave={onSaveLog} />

            <div className="mt-5 space-y-3">
              {entryLogs.length === 0 && (
                <p className="text-sm text-ink-faint italic">還沒有臨床記錄，用過之後回來記一筆吧。</p>
              )}
              {entryLogs.map((log) => (
                <div key={log.id} className="group relative bg-paper-warm/60 border border-ink/10 rounded-sm p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: effectColor(log.effect) }} />
                      <span className="text-sm font-display font-medium text-ink">{log.effect}</span>
                      <span className="text-xs font-mono text-ink-faint">{log.date}</span>
                    </div>
                    <button
                      onClick={() => onDeleteLog(log.id)}
                      className="text-xs text-ink-faint hover:text-seal opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      刪除
                    </button>
                  </div>
                  {log.scenario && <p className="text-sm text-ink-soft mb-1">{log.scenario}</p>}
                  {log.note && <p className="text-sm text-ink-faint leading-relaxed whitespace-pre-wrap">{log.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [entries, setEntries] = useState([])
  const [logs, setLogs] = useState([])
  const [online, setOnline] = useState(false)
  const [pending, setPending] = useState(0)
  const [loading, setLoading] = useState(true)

  const [activeCategory, setActiveCategory] = useState('全部')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [formEntry, setFormEntry] = useState(undefined) // undefined = closed, null = new, obj = edit

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchAll()
    setEntries(data.entries)
    setLogs(data.logs)
    setOnline(data.online)
    setPending(pendingCount())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!sheetsConfigured()) return
    const onOnline = async () => {
      const res = await flushQueue()
      setPending(res.remaining)
      if (res.flushed > 0) load()
    }
    window.addEventListener('online', onOnline)
    const interval = setInterval(onOnline, 45000)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(interval)
    }
  }, [load])

  const filtered = useMemo(() => {
    let list = entries
    if (activeCategory !== '全部') list = list.filter((e) => e.category === activeCategory)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((e) =>
        [e.name, e.aliases, e.indications, e.core, (e.tags || []).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    }
    return [...list].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  }, [entries, activeCategory, query])

  const selectedEntry = entries.find((e) => e.id === selectedId)

  async function handleSaveEntry(entry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = entry
        return next
      }
      return [entry, ...prev]
    })
    setFormEntry(undefined)
    const res = await saveEntry(entry)
    setPending(pendingCount())
    if (!res.synced) setPending(pendingCount())
  }

  async function handleDeleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setLogs((prev) => prev.filter((l) => l.entry_id !== id))
    setSelectedId(null)
    await deleteEntry(id)
    setPending(pendingCount())
  }

  async function handleSaveLog(log) {
    setLogs((prev) => [log, ...prev])
    await saveLog(log)
    setPending(pendingCount())
  }

  async function handleDeleteLog(id) {
    setLogs((prev) => prev.filter((l) => l.id !== id))
    await deleteLog(id)
    setPending(pendingCount())
  }

  return (
    <div className="min-h-screen bg-paper bg-grain-overlay">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-ink/10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-sm bg-ink flex items-center justify-center -rotate-3 shrink-0">
              <span className="font-display text-paper text-xl font-bold">本</span>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-ink leading-tight">本草針義</h1>
              <p className="text-xs text-ink-faint font-mono">中藥・方劑・針灸　本質手記</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SyncDot online={online} pending={pending} />
            <button
              onClick={() => setFormEntry(null)}
              className="px-4 py-2 text-sm font-display bg-ink text-paper rounded-sm hover:bg-ink-soft transition-colors whitespace-nowrap"
            >
              ＋ 新增條目
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex gap-1.5 flex-wrap">
            {['全部', ...CATEGORY_LIST].map((c) => {
              const active = activeCategory === c
              const accent = c === '全部' ? '#17140F' : CATEGORIES[c].accent
              return (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-display border transition-colors ${
                    active ? 'text-paper border-transparent' : 'text-ink-soft border-ink/20 hover:border-ink/40'
                  }`}
                  style={active ? { backgroundColor: accent } : {}}
                >
                  {c === '全部' ? c : `${CATEGORIES[c].seal} ${c}`}
                </button>
              )
            })}
          </div>
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋名稱、主治、標籤、本質內文……"
              className="w-full bg-paper-warm/60 border border-ink/15 focus:border-seal rounded-full px-4 py-2 text-sm outline-none transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-ink-faint py-16 font-mono text-sm">載入中……</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink-faint mb-4">
              {entries.length === 0 ? '還沒有任何條目，開始記錄第一味藥、第一張方，或第一個穴位吧。' : '找不到符合的條目'}
            </p>
            {entries.length === 0 && (
              <button
                onClick={() => setFormEntry(null)}
                className="px-4 py-2 text-sm font-display bg-ink text-paper rounded-sm hover:bg-ink-soft transition-colors"
              >
                ＋ 新增第一筆
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} logs={logs} onOpen={setSelectedId} />
            ))}
          </div>
        )}
      </main>

      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          logs={logs}
          onClose={() => setSelectedId(null)}
          onEdit={(e) => {
            setSelectedId(null)
            setFormEntry(e)
          }}
          onDelete={handleDeleteEntry}
          onSaveLog={handleSaveLog}
          onDeleteLog={handleDeleteLog}
        />
      )}

      {formEntry !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={() => setFormEntry(undefined)} />
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-paper rounded-md shadow-2xl p-6">
            <h2 className="font-display text-xl font-bold text-ink mb-5">
              {formEntry ? `編輯「${formEntry.name}」` : '新增條目'}
            </h2>
            <EntryForm initial={formEntry} onCancel={() => setFormEntry(undefined)} onSave={handleSaveEntry} />
          </div>
        </div>
      )}
    </div>
  )
}
