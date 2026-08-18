// ---------------------------------------------------------------------------
// Fenwick CAD Control — typed state models
// ---------------------------------------------------------------------------

export type BackendStatus = 'checking' | 'online' | 'offline'

export type StreamKind = 'mjpeg' | 'webrtc' | 'websocket' | 'custom'

export type StreamState =
  | 'waiting' // no stream configured / no session started
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'unavailable'
  | 'offline'

export type WorkspaceStatus =
  | 'connected'
  | 'ready'
  | 'connecting'
  | 'reconnecting'
  | 'offline'

export type ViewpointId =
  | 'isometric'
  | 'front'
  | 'back'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'fit'
  | 'current'

export interface Viewpoint {
  id: ViewpointId
  label: string
}

export const VIEWPOINTS: Viewpoint[] = [
  { id: 'isometric', label: 'Isometric view' },
  { id: 'front', label: 'Front view' },
  { id: 'back', label: 'Back view' },
  { id: 'top', label: 'Top view' },
  { id: 'bottom', label: 'Bottom view' },
  { id: 'left', label: 'Left view' },
  { id: 'right', label: 'Right view' },
  { id: 'fit', label: 'Fit model' },
  { id: 'current', label: 'Current view' },
]

export const viewpointLabel = (id: ViewpointId): string =>
  VIEWPOINTS.find((v) => v.id === id)?.label ?? 'Current view'

// --- Change log ------------------------------------------------------------

export type Actor = 'claude' | 'operator'

export type ChangeOp =
  | 'add'
  | 'move'
  | 'import'
  | 'camera'
  | 'validate'
  | 'revert'
  | 'export'

export const CHANGE_OP_LABELS: Record<ChangeOp, string> = {
  add: 'Add component',
  move: 'Move component',
  import: 'Import asset',
  camera: 'Camera change',
  validate: 'Validation',
  revert: 'Revert',
  export: 'Export',
}

export type ChangeStatus = 'applied' | 'reverted' | 'failed'

export interface ChangeEntry {
  id: string
  ts: number
  workspaceId: string
  workspaceName: string
  actor: Actor
  op: ChangeOp
  component: string
  sku?: string
  summary: string
  status: ChangeStatus
  beforeShot: string | null
  afterShot: string | null
  details: string
}

// --- Artifacts --------------------------------------------------------------

export type ArtifactType =
  | 'f3d'
  | 'step'
  | 'stl'
  | 'screenshot'
  | 'render'
  | 'report'
  | 'summary'

export type ArtifactStatus = 'ready' | 'exporting' | 'failed'

export interface Artifact {
  id: string
  name: string
  type: ArtifactType
  workspaceId: string
  workspaceName: string
  createdAt: number
  sizeBytes: number
  description: string
  status: ArtifactStatus
}

// --- Chat -------------------------------------------------------------------

export type ActivityState =
  | 'planning'
  | 'inspecting'
  | 'searching'
  | 'adding-part'
  | 'modifying'
  | 'validating'
  | 'capturing'
  | 'preparing-download'
  | 'waiting'
  | 'completed'
  | 'failed'

export const ACTIVITY_LABELS: Record<ActivityState, string> = {
  planning: 'Planning',
  inspecting: 'Inspecting Fusion',
  searching: 'Searching VEX catalog',
  'adding-part': 'Adding VEX part',
  modifying: 'Modifying geometry',
  validating: 'Validating design',
  capturing: 'Capturing screenshot',
  'preparing-download': 'Preparing download',
  waiting: 'Waiting for Fusion',
  completed: 'Completed',
  failed: 'Failed',
}

export type ActivityStepStatus = 'done' | 'active' | 'failed' | 'pending'

export interface ActivityStep {
  id: string
  state: ActivityState
  status: ActivityStepStatus
  note?: string
}

export interface ChatAttachment {
  id: string
  name: string
  kind: 'screenshot' | 'file'
  url: string
}

export type ChatRole = 'user' | 'claude' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  ts: number
  steps?: ActivityStep[]
  attachments?: ChatAttachment[]
  error?: boolean
  /** For failed user messages: the text to retry. */
  retryText?: string
}

// --- Workspace ---------------------------------------------------------------

export type StreamQuality = 'auto' | 'high' | 'medium' | 'low'

export interface StreamConfig {
  kind: StreamKind
  url: string
  quality: StreamQuality
}

export interface WorkspaceState {
  id: string
  slot: 1 | 2
  name: string
  status: WorkspaceStatus
  activity: string
  viewers: number
  viewpoint: ViewpointId
  stream: StreamConfig
  streamState: StreamState
  /** False once the input endpoint has rejected events; reset on reconnect. */
  inputAvailable: boolean
  fitMode: 'contain' | 'cover'
  taskRunning: boolean
  chat: ChatMessage[]
  changes: ChangeEntry[]
  artifacts: Artifact[]
}

// --- Input events forwarded to the local input service -----------------------

export type InputEventType =
  | 'pointermove'
  | 'pointerdown'
  | 'pointerup'
  | 'wheel'
  | 'keydown'
  | 'keyup'

export interface InputEvent {
  type: InputEventType
  /** Normalized 0..1 coordinates within the stream surface. */
  x?: number
  y?: number
  button?: number
  deltaY?: number
  key?: string
  modifiers?: string[]
}
