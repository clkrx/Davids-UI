import {
  Download,
  History,
  MessageSquare,
  MonitorPlay,
  Plus,
  Settings2,
  Users,
} from 'lucide-react'
import { useApp } from '../state/store'
import type { WorkspaceStatus } from '../types'

const STATUS_LABEL: Record<WorkspaceStatus, string> = {
  connected: 'Connected',
  ready: 'Ready to start',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
}

const STATUS_DOT: Record<WorkspaceStatus, string> = {
  connected: 'green',
  ready: 'cyan',
  connecting: 'amber',
  reconnecting: 'amber',
  offline: 'red',
}

export function WorkspaceRail() {
  const { state, dispatch, toast } = useApp()

  const occupied = state.workspaces.every(
    (w) => w.status === 'connected' || w.status === 'connecting' || w.taskRunning,
  )

  const onNewWorkspace = () => {
    if (occupied) {
      toast('info', 'Both Fusion workspaces are occupied.')
      return
    }
    const free = state.workspaces.find((w) => w.status === 'ready' || w.status === 'offline')
    if (free && free.id !== state.activeWorkspaceId) {
      dispatch({ type: 'activate', id: free.id })
    } else {
      toast('info', 'Both Fusion workspaces are occupied.')
    }
  }

  const goLiveCad = () => {
    dispatch({ type: 'panel', key: 'changeLogOpen', value: false })
    dispatch({ type: 'panel', key: 'artifactsOpen', value: false })
    dispatch({ type: 'panel', key: 'settingsOpen', value: false })
    document.getElementById('fusion-stream-surface')?.focus()
  }

  const navActive = (key: 'chat' | 'log' | 'artifacts' | 'settings') =>
    (key === 'chat' && state.chatOpen) ||
    (key === 'log' && state.changeLogOpen) ||
    (key === 'artifacts' && state.artifactsOpen) ||
    (key === 'settings' && state.settingsOpen)

  return (
    <aside className="rail" aria-label="Workspaces">
      <div className="rail-label">Workspaces</div>

      {state.workspaces.map((ws) => (
        <button
          key={ws.id}
          type="button"
          className={`ws-card${ws.id === state.activeWorkspaceId ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'activate', id: ws.id })}
          aria-pressed={ws.id === state.activeWorkspaceId}
        >
          <div className="ws-card-top">
            <span className={`dot ${STATUS_DOT[ws.status]}`} />
            <span className="ws-card-name">{ws.name}</span>
          </div>
          <div className="ws-card-status">{STATUS_LABEL[ws.status]}</div>
          <div className="ws-card-activity">
            {ws.taskRunning ? 'Claude is working…' : ws.activity}
          </div>
          <div className="ws-card-viewers">
            <Users size={12} />
            {ws.viewers} viewer{ws.viewers === 1 ? '' : 's'}
          </div>
        </button>
      ))}

      <div className="rail-label" style={{ marginTop: 4 }}>
        Navigate
      </div>

      <nav className="rail-nav">
        <button type="button" className="rail-nav-btn" onClick={goLiveCad}>
          <MonitorPlay size={16} />
          <span>Live CAD</span>
        </button>
        <button
          type="button"
          className={`rail-nav-btn${navActive('chat') ? ' active' : ''}`}
          onClick={() =>
            dispatch({ type: 'panel', key: 'chatOpen', value: !state.chatOpen })
          }
        >
          <MessageSquare size={16} />
          <span>Claude chat</span>
        </button>
        <button
          type="button"
          className={`rail-nav-btn${navActive('log') ? ' active' : ''}`}
          onClick={() =>
            dispatch({ type: 'panel', key: 'changeLogOpen', value: !state.changeLogOpen })
          }
        >
          <History size={16} />
          <span>Change log</span>
        </button>
        <button
          type="button"
          className={`rail-nav-btn${navActive('artifacts') ? ' active' : ''}`}
          onClick={() =>
            dispatch({ type: 'panel', key: 'artifactsOpen', value: !state.artifactsOpen })
          }
        >
          <Download size={16} />
          <span>Artifacts</span>
        </button>
        <button
          type="button"
          className={`rail-nav-btn${navActive('settings') ? ' active' : ''}`}
          onClick={() =>
            dispatch({ type: 'panel', key: 'settingsOpen', value: !state.settingsOpen })
          }
        >
          <Settings2 size={16} />
          <span>Session settings</span>
        </button>
      </nav>

      <div className="rail-footer">
        <button
          type="button"
          className="btn small new-ws-btn"
          onClick={onNewWorkspace}
          aria-label="Start a new workspace"
        >
          <Plus size={14} />
          <span>New workspace</span>
        </button>
        <div className="local-badge">
          <span className="dot cyan" />
          <span>Local workstation · no account</span>
        </div>
      </div>
    </aside>
  )
}
