import { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  Bot,
  Camera,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  Hourglass,
  ListChecks,
  Loader2,
  MessageSquare,
  PackagePlus,
  Paperclip,
  RotateCcw,
  Search,
  SearchCheck,
  SendHorizontal,
  User,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../state/store'
import {
  ACTIVITY_LABELS,
  type ActivityState,
  type ChatMessage,
} from '../types'
import { formatTime, uid } from '../utils'

const STEP_ICON: Record<ActivityState, typeof Search> = {
  planning: ListChecks,
  inspecting: SearchCheck,
  searching: Search,
  'adding-part': PackagePlus,
  modifying: Wrench,
  validating: BadgeCheck,
  capturing: Camera,
  'preparing-download': Download,
  waiting: Hourglass,
  completed: CheckCircle2,
  failed: XCircle,
}

const MIN_W = 320

function clampWidth(w: number) {
  return Math.min(Math.max(w, MIN_W), Math.max(MIN_W, window.innerWidth - 340))
}

export function ChatPanel() {
  const { state, dispatch, active: ws, toast } = useApp()
  const [draft, setDraft] = useState('')
  const [pendingFiles, setPendingFiles] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)

  const open = state.chatOpen
  const width = state.chatExpanded
    ? Math.max(720, window.innerWidth - 340)
    : state.chatWidth

  // Keep the latest exchange in view as messages arrive.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [ws.chat.length, ws.id, open])

  // --- Resize drag -----------------------------------------------------------
  const onHandleDown = (e: React.PointerEvent) => {
    if (state.chatExpanded) return
    dragRef.current = { startX: e.clientX, startW: state.chatWidth }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHandleMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const delta = dragRef.current.startX - e.clientX
    dispatch({
      type: 'chat-size',
      width: clampWidth(dragRef.current.startW + delta),
    })
  }
  const onHandleUp = () => {
    dragRef.current = null
  }

  // --- Sending ---------------------------------------------------------------
  const send = (text: string, files: string[]) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const msg: ChatMessage = { id: uid('m'), role: 'user', text: trimmed, ts: Date.now() }
    dispatch({ type: 'chat-add', id: ws.id, msg })
    dispatch({ type: 'ws', id: ws.id, patch: { taskRunning: true } })
    setDraft('')
    setPendingFiles([])

    api
      .sendChat(ws.id, trimmed, files)
      .then((res) => {
        dispatch({ type: 'chat-add', id: ws.id, msg: res.message })
        dispatch({ type: 'ws', id: ws.id, patch: { taskRunning: false } })
      })
      .catch(() => {
        dispatch({
          type: 'chat-add',
          id: ws.id,
          msg: {
            id: uid('m'),
            role: 'system',
            text: 'Claude could not be reached — the local agent service is offline. Nothing was sent to Fusion.',
            ts: Date.now(),
            error: true,
            retryText: trimmed,
          },
        })
        dispatch({ type: 'ws', id: ws.id, patch: { taskRunning: false } })
      })
  }

  const retry = (msg: ChatMessage) => {
    if (!msg.retryText || ws.taskRunning) return
    dispatch({ type: 'chat-patch', id: ws.id, msgId: msg.id, patch: { retryText: undefined } })
    send(msg.retryText, [])
  }

  const cancelTask = () => {
    api
      .cancelChat(ws.id)
      .then(() => {
        dispatch({ type: 'ws', id: ws.id, patch: { taskRunning: false } })
        dispatch({
          type: 'chat-add',
          id: ws.id,
          msg: {
            id: uid('m'),
            role: 'system',
            text: 'Task cancelled.',
            ts: Date.now(),
          },
        })
      })
      .catch(() => {
        toast('error', 'Cancel failed — the local agent service is offline.')
      })
  }

  if (!open) {
    return (
      <div className="chat-dock">
        <div className="chat-collapsed-strip">
          <button
            type="button"
            className="icon-btn glass"
            aria-label="Open Claude chat"
            title="Claude CAD Agent"
            onClick={() => dispatch({ type: 'panel', key: 'chatOpen', value: true })}
          >
            <MessageSquare size={17} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-dock open" style={{ width }}>
      <aside className="chat-panel" aria-label="Claude CAD Agent">
        <div
          className="chat-resize-handle"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
        />

        <div className="chat-header">
          <div className="chat-header-icon">
            <Bot size={17} />
          </div>
          <div className="chat-header-text">
            <div className="chat-header-title">Claude CAD Agent</div>
            <div className="chat-header-sub">Working in {ws.name}</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={state.chatExpanded ? 'Restore chat width' : 'Expand chat panel'}
            title={state.chatExpanded ? 'Restore width' : 'Expand'}
            onClick={() =>
              dispatch({
                type: 'chat-size',
                width: state.chatWidth,
                expanded: !state.chatExpanded,
              })
            }
          >
            {state.chatExpanded ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close chat panel"
            onClick={() => dispatch({ type: 'panel', key: 'chatOpen', value: false })}
          >
            <X size={16} />
          </button>
        </div>

        <div className="chat-messages" ref={scrollRef}>
          {ws.chat.length === 0 ? (
            <div className="chat-empty">
              <Bot size={26} />
              <div>
                No conversation yet. Describe a modeling task — Claude will drive Fusion in
                this workspace once the local agent service is connected.
              </div>
            </div>
          ) : (
            ws.chat.map((m) => <Message key={m.id} msg={m} onRetry={retry} />)
          )}
        </div>

        <div className="chat-composer">
          {ws.taskRunning && (
            <div className="chat-taskbar">
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              Claude is working in Fusion…
              <button
                type="button"
                className="btn small danger"
                style={{ marginLeft: 'auto' }}
                onClick={cancelTask}
              >
                Cancel task
              </button>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="pending-files">
              {pendingFiles.map((f) => (
                <span key={f} className="attach-chip">
                  <Paperclip size={12} />
                  {f}
                  <button
                    type="button"
                    className="retry-link"
                    aria-label={`Remove ${f}`}
                    onClick={() => setPendingFiles((p) => p.filter((x) => x !== f))}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="composer-row">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                const names = Array.from(e.target.files ?? []).map((f) => f.name)
                setPendingFiles((p) => [...p, ...names])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label="Attach files"
              title="Attach"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} />
            </button>
            <textarea
              className="composer-input"
              rows={1}
              placeholder={`Describe a CAD task for ${ws.name}…`}
              aria-label="Message Claude"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft, pendingFiles)
                }
              }}
            />
            <button
              type="button"
              className="btn primary"
              aria-label="Send message"
              disabled={!draft.trim()}
              onClick={() => send(draft, pendingFiles)}
            >
              <SendHorizontal size={15} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function Message({ msg, onRetry }: { msg: ChatMessage; onRetry: (m: ChatMessage) => void }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg ${msg.role}${msg.error ? ' error' : ''}`}>
      {msg.role !== 'system' && (
        <div className="msg-avatar">
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </div>
      )}
      <div className="msg-body">
        <div className="msg-bubble">{msg.text}</div>

        {msg.steps && msg.steps.length > 0 && (
          <div className="steps" aria-label="Claude activity">
            {msg.steps.map((s) => {
              const Icon = STEP_ICON[s.state]
              return (
                <div key={s.id} className={`step ${s.status}`}>
                  <div className="step-icon">
                    <Icon size={10} />
                  </div>
                  <div className="step-text">
                    {ACTIVITY_LABELS[s.state]}
                    {s.note && <span className="step-note"> — {s.note}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="attach-row">
            {msg.attachments.map((a) => (
              <a key={a.id} className="attach-chip" href={a.url} target="_blank" rel="noreferrer">
                {a.kind === 'screenshot' ? <Camera size={12} /> : <FileText size={12} />}
                {a.name}
              </a>
            ))}
          </div>
        )}

        <div className="msg-meta">
          <span>{formatTime(msg.ts)}</span>
          {msg.retryText && (
            <button type="button" className="retry-link" onClick={() => onRetry(msg)}>
              <RotateCcw size={11} />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
