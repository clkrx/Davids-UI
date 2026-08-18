// ---------------------------------------------------------------------------
// Seed state for the two workspace slots.
//
// Workspace 1 mirrors the product scenario (VEX drivetrain, seeded example
// conversation, change log, artifacts). Its stream points at the default local
// capture service; since nothing serves that URL yet, the viewport will show
// its honest "stream unavailable / reconnecting" state. Workspace 2 is empty
// and waits for a Fusion session.
// ---------------------------------------------------------------------------

import type {
  Artifact,
  ChangeEntry,
  ChatMessage,
  StreamConfig,
  WorkspaceState,
} from '../types'

/** Fixed time-of-day for seed entries (evening CAD session). */
function at(h: number, m: number, s: number): number {
  const d = new Date()
  d.setHours(h, m, s, 0)
  return d.getTime()
}

function storedStream(slot: number, fallback: StreamConfig): StreamConfig {
  try {
    const raw = localStorage.getItem(`fenwick.stream.ws${slot}`)
    if (raw) return { ...fallback, ...(JSON.parse(raw) as Partial<StreamConfig>) }
  } catch {
    /* ignore malformed overrides */
  }
  return fallback
}

const ws1Chat: ChatMessage[] = [
  {
    id: 'seed-m1',
    role: 'user',
    text: 'Create a basic VEX drivetrain with four wheels.',
    ts: at(19, 38, 12),
  },
  {
    id: 'seed-m2',
    role: 'claude',
    text: 'I found the VEX 25x25 chassis rail, 4 inch wheel, 393 motor, shaft, bearing, and standoff assets. I’m placing the drivetrain on the active field.',
    ts: at(19, 38, 40),
    steps: [
      { id: 'seed-m2-s1', state: 'planning', status: 'done' },
      { id: 'seed-m2-s2', state: 'searching', status: 'done', note: '6 VEX assets matched' },
      { id: 'seed-m2-s3', state: 'adding-part', status: 'done', note: 'Chassis rails, wheels, motors' },
      { id: 'seed-m2-s4', state: 'validating', status: 'done' },
      { id: 'seed-m2-s5', state: 'completed', status: 'done' },
    ],
  },
  {
    id: 'seed-m3',
    role: 'user',
    text: 'Add the official 2026-27 V5RC field.',
    ts: at(19, 40, 3),
  },
  {
    id: 'seed-m4',
    role: 'claude',
    text: 'The official field asset is available. I’m importing it into the active workspace.',
    ts: at(19, 40, 31),
    steps: [
      { id: 'seed-m4-s1', state: 'searching', status: 'done', note: 'Official 2026-27 V5RC field' },
      { id: 'seed-m4-s2', state: 'adding-part', status: 'done' },
      { id: 'seed-m4-s3', state: 'completed', status: 'done' },
    ],
  },
  {
    id: 'seed-m5',
    role: 'user',
    text: 'Revert the motor placement.',
    ts: at(19, 44, 55),
  },
  {
    id: 'seed-m6',
    role: 'claude',
    text: 'I found the motor placement change from 19:42:08. Reverting that operation will restore the previous position.',
    ts: at(19, 45, 10),
    steps: [
      { id: 'seed-m6-s1', state: 'inspecting', status: 'done', note: 'Located change 19:42:08' },
      { id: 'seed-m6-s2', state: 'waiting', status: 'done' },
      { id: 'seed-m6-s3', state: 'completed', status: 'done' },
    ],
  },
]

const ws1Changes: ChangeEntry[] = [
  {
    id: 'chg-1',
    ts: at(19, 31, 44),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'claude',
    op: 'add',
    component: '4 inch VEX wheel',
    sku: '276-1496',
    summary: 'Added 4 inch VEX wheel',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Placed a 4 inch high-traction wheel on the front-left shaft hub. Concentric mate to shaft, offset 12.7 mm from the rail face.',
  },
  {
    id: 'chg-2',
    ts: at(19, 33, 2),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'claude',
    op: 'add',
    component: 'VEX 393 motor',
    sku: '276-2177',
    summary: 'Added VEX 393 motor',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Mounted a 2-wire 393 motor on the left gearbox plate, pinion meshing with the 60T drive gear. Fastened with two 6-32 x 1/2 in screws.',
  },
  {
    id: 'chg-3',
    ts: at(19, 36, 57),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'operator',
    op: 'move',
    component: 'Left chassis rail',
    sku: '276-1346',
    summary: 'Moved left chassis rail',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Shifted the left 25x25 chassis rail +25 mm along Y to widen the wheel track. All downstream mates remain satisfied.',
  },
  {
    id: 'chg-4',
    ts: at(19, 39, 21),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'claude',
    op: 'import',
    component: 'Official 2026-27 V5RC field',
    summary: 'Imported official 2026-27 V5RC field',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Inserted the official 2026-27 V5RC field assembly as a grounded reference component at the origin.',
  },
  {
    id: 'chg-5',
    ts: at(19, 41, 5),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'operator',
    op: 'camera',
    component: 'Viewport camera',
    summary: 'Changed camera to top view',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details: 'Set the active camera to an orthographic top view of the drivetrain.',
  },
  {
    id: 'chg-6',
    ts: at(19, 42, 8),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'claude',
    op: 'move',
    component: 'VEX 393 motor',
    sku: '276-2177',
    summary: 'Moved VEX 393 motor to rear gearbox position',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Relocated the 393 motor from the front gearbox plate to the rear position to clear the intake subassembly envelope.',
  },
  {
    id: 'chg-7',
    ts: at(19, 43, 30),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'claude',
    op: 'validate',
    component: 'Drivetrain assembly',
    summary: 'Validated drivetrain alignment',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Checked wheel parallelism, shaft runout clearance, and gear mesh. All four wheels are co-planar within 0.2 mm.',
  },
  {
    id: 'chg-8',
    ts: at(19, 45, 22),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'claude',
    op: 'revert',
    component: 'VEX 393 motor',
    sku: '276-2177',
    summary: 'Reverted shaft placement',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Reverted the motor placement change from 19:42:08. The 393 motor is restored to its previous gearbox position.',
  },
  {
    id: 'chg-9',
    ts: at(19, 47, 58),
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    actor: 'claude',
    op: 'export',
    component: 'VEX Basic Drivetrain.f3d',
    summary: 'Created downloadable Fusion file',
    status: 'applied',
    beforeShot: null,
    afterShot: null,
    details:
      'Exported the active design as a Fusion archive and queued it in the artifacts list.',
  },
]

const ws1Artifacts: Artifact[] = [
  {
    id: 'art-1',
    name: 'VEX Basic Drivetrain.f3d',
    type: 'f3d',
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    createdAt: at(19, 47, 58),
    sizeBytes: 19_300_000,
    description: 'Four-wheel VEX drivetrain with field context.',
    status: 'ready',
  },
  {
    id: 'art-2',
    name: 'VEX Basic Drivetrain.step',
    type: 'step',
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    createdAt: at(19, 48, 12),
    sizeBytes: 23_200_000,
    description: 'Neutral STEP export for fabrication review.',
    status: 'exporting',
  },
  {
    id: 'art-3',
    name: 'drivetrain-isometric.png',
    type: 'screenshot',
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    createdAt: at(19, 46, 10),
    sizeBytes: 1_840_000,
    description: 'Isometric viewport capture of the assembled drivetrain.',
    status: 'exporting',
  },
  {
    id: 'art-4',
    name: 'drivetrain-validation-report.pdf',
    type: 'report',
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    createdAt: at(19, 43, 41),
    sizeBytes: 412_000,
    description: 'Alignment and clearance validation results.',
    status: 'ready',
  },
  {
    id: 'art-5',
    name: 'session-change-summary.md',
    type: 'summary',
    workspaceId: 'ws-1',
    workspaceName: 'VEX Basic Drivetrain',
    createdAt: at(19, 49, 5),
    sizeBytes: 8_200,
    description: 'Chronological summary of this session’s CAD changes.',
    status: 'ready',
  },
]

export function seedWorkspaces(): WorkspaceState[] {
  return [
    {
      id: 'ws-1',
      slot: 1,
      name: 'VEX Basic Drivetrain',
      status: 'connected',
      activity: 'Claude is idle',
      viewers: 6,
      viewpoint: 'isometric',
      stream: storedStream(1, {
        kind: 'mjpeg',
        url: 'http://127.0.0.1:9400/stream/ws-1.mjpeg',
        quality: 'auto',
      }),
      streamState: 'connecting',
      inputAvailable: true,
      fitMode: 'contain',
      taskRunning: false,
      chat: ws1Chat,
      changes: ws1Changes,
      artifacts: ws1Artifacts,
    },
    {
      id: 'ws-2',
      slot: 2,
      name: 'Available workspace',
      status: 'ready',
      activity: 'No active Fusion session',
      viewers: 0,
      viewpoint: 'current',
      stream: storedStream(2, { kind: 'mjpeg', url: '', quality: 'auto' }),
      streamState: 'waiting',
      inputAvailable: true,
      fitMode: 'contain',
      taskRunning: false,
      chat: [],
      changes: [],
      artifacts: [],
    },
  ]
}
