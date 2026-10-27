import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MapPin, Search, Waves } from 'lucide-react'
import { search, type SearchItem } from '../lib/search'

const ICON = { place: MapPin, river: Waves, page: FileText }

/** Ctrl/⌘ K or "/" opens a quick finder for places, river points and pages. */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const nav = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const results = useMemo(() => search(q), [q])

  useEffect(() => {
    if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 0) }
  }, [open])
  useEffect(() => setI(0), [q])

  if (!open) return null
  const go = (r?: SearchItem) => { if (!r) return; onClose(); nav(r.href) }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search LankaTwin"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="size-4 text-muted" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(results.length - 1, n + 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(0, n - 1)) }
              else if (e.key === 'Enter') go(results[i])
            }}
            placeholder="Search towns, rivers, pages — English, සිංහල, தமிழ்"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="lt-search-results"
            aria-activedescendant={results[i] ? `lt-r-${results[i].id}` : undefined}
          />
          <kbd className="rounded border border-line px-1.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul id="lt-search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{q}”.</li>}
          {results.map((r, k) => {
            const Icon = ICON[r.kind]
            return (
              <li
                key={r.id}
                id={`lt-r-${r.id}`}
                role="option"
                aria-selected={k === i}
                onMouseEnter={() => setI(k)}
                onClick={() => go(r)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${k === i ? 'bg-lagoon-soft' : ''}`}
              >
                <Icon className={`size-4 shrink-0 ${k === i ? 'text-lagoon' : 'text-muted'}`} aria-hidden />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.title}</div>
                  <div className="truncate text-xs text-muted">{r.sub}</div>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex gap-3 border-t border-line px-3 py-2 text-[11px] text-muted">
          <span><kbd className="font-sans">↑↓</kbd> move</span><span><kbd className="font-sans">↵</kbd> open</span><span><kbd className="font-sans">/</kbd> or <kbd className="font-sans">Ctrl K</kbd> search</span>
        </div>
      </div>
    </div>
  )
}
