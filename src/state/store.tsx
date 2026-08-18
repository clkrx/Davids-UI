import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import type {
  Artifact,
  BackendStatus,
  ChangeEntry,
  ChatMessage,
  StreamState,
  WorkspaceState,
  WorkspaceStatus,
} from '../types'
import { seedWorkspaces } from './seed'

export interface Toast {
  id: number
  kind: 'info' | 'error' | 'success'
  text: string
}

export interface RevertTarget {
  workspaceId: string
  changeId: string
}

interface State {
  backend: BackendStatus
  activeWorkspaceId: string
  workspaces: WorkspaceState[]
  chatOpen: boolean
  chatWidth: number
  chatExpanded: boolean
  changeLogOpen: boolean
  artifactsOpen: boolean
  settingsOpen: boolean
  revertTarget: RevertTarget | null
  previewArtifact: { workspaceId: string; artifactId: string } | null
  toasts: Toast[]
}

const initialState = (): State => ({
  backend: 'checking',
  activeWorkspaceId: 'ws-1',
  workspaces: seedWorkspaces(),
  chatOpen: true,
  chatWidth: 392,
  chatExpanded: false,
  changeLogOpen: false,
  artifactsOpen: false,
  settingsOpen: false,
  revertTarget: null,
  previewArtifact: null,
  toasts: [],
})

export type PanelKey =
  | 'chatOpen'
  | 'changeLogOpen'
  | 'artifactsOpen'
  | 'settingsOpen'

export type Action =
  | { type: 'backend'; status: BackendStatus }
  | { type: 'activate'; id: string }
  | { type: 'ws'; id: string; patch: Partial<WorkspaceState> }
  | { type: 'chat-add'; id: string; msg: ChatMessage }
  | { type: 'chat-patch'; id: string; msgId: string; patch: Partial<ChatMessage> }
  | { type: 'change-patch'; wsId: string; changeId: string; patch: Partial<ChangeEntry> }
  | { type: 'artifact-patch'; wsId: string; artifactId: string; patch: Partial<Artifact> }
  | { type: 'panel'; key: PanelKey; value: boolean }
  | { type: 'chat-size'; width: number; expanded?: boolean }
  | { type: 'revert-target'; target: RevertTarget | null }
  | { type: 'preview'; target: State['previewArtifact'] }
  | { type: 'toast'; toast: Toast }
  | { type: 'toast-drop'; id: number }

function patchWs(
  workspaces: WorkspaceState[],
  id: string,
  patch: Partial<WorkspaceState>,
): WorkspaceState[] {
  return workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w))
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'backend':
      return { ...state, backend: action.status }
    case 'activate':
      return { ...state, activeWorkspaceId: action.id }
    case 'ws':
      return { ...state, workspaces: patchWs(state.workspaces, action.id, action.patch) }
    case 'chat-add':
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.id ? { ...w, chat: [...w.chat, action.msg] } : w,
        ),
      }
    case 'chat-patch':
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.id
            ? {
                ...w,
                chat: w.chat.map((m) =>
                  m.id === action.msgId ? { ...m, ...action.patch } : m,
                ),
              }
            : w,
        ),
      }
    case 'change-patch':
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.wsId
            ? {
                ...w,
                changes: w.changes.map((c) =>
                  c.id === action.changeId ? { ...c, ...action.patch } : c,
                ),
              }
            : w,
        ),
      }
    case 'artifact-patch':
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.wsId
            ? {
                ...w,
                artifacts: w.artifacts.map((a) =>
                  a.id === action.artifactId ? { ...a, ...action.patch } : a,
                ),
              }
            : w,
        ),
      }
    case 'panel':
      return { ...state, [action.key]: action.value }
    case 'chat-size':
      return {
        ...state,
        chatWidth: action.width,
        chatExpanded: action.expanded ?? state.chatExpanded,
      }
    case 'revert-target':
      return { ...state, revertTarget: action.target }
    case 'preview':
      return { ...state, previewArtifact: action.target }
    case 'toast':
      return { ...state, toasts: [...state.toasts.slice(-3), action.toast] }
    case 'toast-drop':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    default:
      return state
  }
}

/** Map a media stream state onto the workspace status shown in the rail. */
export function statusForStream(s: StreamState, hasUrl: boolean): WorkspaceStatus {
  switch (s) {
    case 'live':
      return 'connected'
    case 'connecting':
      return 'connecting'
    case 'reconnecting':
      return 'reconnecting'
    case 'waiting':
      return hasUrl ? 'connecting' : 'ready'
    case 'unavailable':
    case 'offline':
      return 'offline'
  }
}

interface AppContextValue {
  state: State
  dispatch: Dispatch<Action>
  active: WorkspaceState
  toast: (kind: Toast['kind'], text: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastSeq = 0

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const value = useMemo<AppContextValue>(() => {
    const active =
      state.workspaces.find((w) => w.id === state.activeWorkspaceId) ??
      state.workspaces[0]
    const toast: AppContextValue['toast'] = (kind, text) => {
      toastSeq += 1
      const id = toastSeq
      dispatch({ type: 'toast', toast: { id, kind, text } })
      window.setTimeout(() => dispatch({ type: 'toast-drop', id }), 5600)
    }
    return { state, dispatch, active, toast }
  }, [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
