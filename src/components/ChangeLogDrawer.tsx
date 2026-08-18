import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Camera,
  ChevronDown,
  ChevronUp,
  History,
  Search,
  Undo2,
  User,
  X,
} from 'lucide-react'
import { useApp } from '../state/store'
import { CHANGE_OP_LABELS, type ChangeEntry, type ChangeOp } from '../types'
import { formatTime } from '../utils'

const OP_OPTIONS: { value: ChangeOp | 'all'; label: string }[] = [
  { value: 'all', label: 'All operations' },
  ...(Object.entries(CHANGE_OP_LABELS) as [ChangeOp, string][]).map(([value, label]) => ({
    value,
    label,
  })),
]

export function ChangeLogDrawer() {
  const { state, dispatch } = useApp()
  const [query, setQuery] = useState('')
  const [wsFilter, setWsFilter] = useState<'all' | string>('all')
  const [opFilter, setOpFilter] = useState<ChangeOp | 'all'>('all')
  const [skuFilter, setSkuFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const close = () => dispatch({ type: 'panel', key: 'changeLogOpen', value: false })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const all = useMemo(
    () =>
      state.workspaces
        .flatMap((w) => w.changes)
        .sort((a, b) => b.ts - a.ts),
    [state.workspaces],
  )

  const filtered = all.filter((c) => {
    if (wsFilter !== 'all' && c.workspaceId !== wsFilter) return false
    if (opFilter !== 'all' && c.op !== opFilter) return false
    if (skuFilter && !(c.sku ?? '').toLowerCase().includes(skuFilter.toLowerCase()))
      return false
    if (query) {
      const q = query.toLowerCase()
      const hay = `${c.summary} ${c.component} ${c.workspaceName} ${c.sku ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const latestApplied = filtered.find((c) => c.status === 'applied')

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer left" role="dialog" aria-modal="true" aria-label="Change log">
        <div className="drawer-header">
          <History size={17} color="var(--accent)" />
          <div className="drawer-title">Change log</div>
          <button
            type="button"
            className="btn small"
            disabled={!latestApplied}
            title={
              latestApplied
                ? `Revert “${latestApplied.summary}”`
                : 'No applied operations to revert'
            }
            onClick={() =>
              latestApplied &&
              dispatch({
                type: 'revert-target',
                target: { workspaceId: latestApplied.workspaceId, changeId: latestApplied.id },
              })
            }
          >
            <Undo2 size={13} />
            Revert latest
          </button>
          <button type="button" className="icon-btn" aria-label="Close change log" onClick={close}>
            <X size={16} />
          </button>
        </div>

        <div className="filter-row">
          <div className="search-wrap">
            <Search size={13} className="search-icon" />
            <input
              className="filter-input"
              placeholder="Search changes…"
              aria-label="Search change log"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            aria-label="Filter by workspace"
            value={wsFilter}
            onChange={(e) => setWsFilter(e.target.value)}
          >
            <option value="all">All workspaces</option>
            {state.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Filter by operation type"
            value={opFilter}
            onChange={(e) => setOpFilter(e.target.value as ChangeOp | 'all')}
          >
            {OP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className="filter-input"
            style={{ flex: '0 1 130px', minWidth: 110 }}
            placeholder="VEX SKU"
            aria-label="Filter by VEX SKU"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
          />
        </div>

        <div className="drawer-body">
          {filtered.length === 0 ? (
            <div className="drawer-empty">
              <History size={24} />
              {all.length === 0
                ? 'No CAD changes recorded yet. Operations from Claude and local operators will appear here.'
                : 'No changes match the current filters.'}
            </div>
          ) : (
            filtered.map((c) => (
              <ChangeRow
                key={c.id}
                entry={c}
                expanded={expanded.has(c.id)}
                onToggle={() => toggleExpand(c.id)}
                onRevert={() =>
                  dispatch({
                    type: 'revert-target',
                    target: { workspaceId: c.workspaceId, changeId: c.id },
                  })
                }
              />
            ))
          )}
        </div>
      </aside>
    </>
  )
}

function ChangeRow({
  entry: c,
  expanded,
  onToggle,
  onRevert,
}: {
  entry: ChangeEntry
  expanded: boolean
  onToggle: () => void
  onRevert: () => void
}) {
  return (
    <div className="change-entry">
      <div className="change-head">
        <span className="change-summary">{c.summary}</span>
        <span className={`tag ${c.actor}`}>
          {c.actor === 'claude' ? <Bot size={11} /> : <User size={11} />}
          {c.actor === 'claude' ? 'Claude' : 'Operator'}
        </span>
        <span className={`tag ${c.status}`}>{c.status}</span>
      </div>

      <div className="change-meta">
        <span>{formatTime(c.ts)}</span>
        <span>{c.workspaceName}</span>
        <span className="tag">{CHANGE_OP_LABELS[c.op]}</span>
        {c.sku && <span className="tag sku">SKU {c.sku}</span>}
      </div>

      <div className="change-shots">
        <div className="shot">
          {c.beforeShot ? (
            <img src={c.beforeShot} alt={`Before ${c.summary}`} />
          ) : (
            <>
              <Camera size={14} />
              Before · no screenshot
            </>
          )}
        </div>
        <div className="shot">
          {c.afterShot ? (
            <img src={c.afterShot} alt={`After ${c.summary}`} />
          ) : (
            <>
              <Camera size={14} />
              After · no screenshot
            </>
          )}
        </div>
      </div>

      {expanded && <div className="change-details">{c.details}</div>}

      <div className="change-actions">
        <button
          type="button"
          className="btn small"
          disabled={c.status !== 'applied'}
          title={c.status !== 'applied' ? `Already ${c.status}` : 'Revert this operation'}
          onClick={onRevert}
        >
          <Undo2 size={13} />
          Revert
        </button>
        <button type="button" className="btn small" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide details' : 'Details'}
        </button>
      </div>
    </div>
  )
}
