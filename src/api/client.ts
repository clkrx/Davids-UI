// ---------------------------------------------------------------------------
// Fenwick CAD Control — backend API adapter
//
// Every call targets the local Fenwick agent service that will run on this
// workstation (proxied through /api in dev). When the service is unreachable
// these functions reject, and the UI falls back to honest offline states.
// Authentication can be layered on later by extending `request`.
// ---------------------------------------------------------------------------

import type { ChatMessage, InputEvent, ViewpointId } from '../types'

/**
 * Optional override for the API origin, e.g. "http://192.168.1.20:9400".
 * Empty string = same origin (uses the Vite proxy in dev).
 */
export function apiBase(): string {
  return localStorage.getItem('fenwick.apiBase') ?? ''
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 5000,
): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
    if (!res.ok) throw new Error(`Request failed: HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export interface HealthResponse {
  ok: boolean
  fusionRunning?: boolean
  version?: string
}

export interface ChatResponse {
  message: ChatMessage
}

export const api = {
  health: () => request<HealthResponse>('/api/health', undefined, 3500),

  sessions: () => request<unknown[]>('/api/sessions'),
  session: (sessionId: string) => request<unknown>(`/api/sessions/${sessionId}`),
  startSession: (workspaceSlot: number) =>
    request<unknown>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ workspaceSlot }),
    }),

  streamInfo: (sessionId: string) =>
    request<{ kind: string; url: string }>(`/api/stream/${sessionId}`),

  sendInput: (sessionId: string, event: InputEvent) =>
    request<{ ok: boolean }>(
      `/api/input/${sessionId}`,
      { method: 'POST', body: JSON.stringify(event) },
      1500,
    ),

  sendChat: (sessionId: string, text: string, attachments: string[]) =>
    request<ChatResponse>(
      `/api/chat/${sessionId}`,
      { method: 'POST', body: JSON.stringify({ text, attachments }) },
      30000,
    ),
  cancelChat: (sessionId: string) =>
    request<{ ok: boolean }>(`/api/chat/${sessionId}`, {
      method: 'DELETE',
    }),

  changes: (sessionId: string) =>
    request<unknown[]>(`/api/changes/${sessionId}`),
  revertChange: (sessionId: string, changeId: string) =>
    request<{ ok: boolean; restoredState?: string }>(
      `/api/changes/${sessionId}/revert`,
      { method: 'POST', body: JSON.stringify({ changeId }) },
      15000,
    ),

  artifacts: (sessionId: string) =>
    request<unknown[]>(`/api/artifacts/${sessionId}`),
  artifactDownloadUrl: (artifactId: string) =>
    `${apiBase()}/api/artifacts/${artifactId}/download`,

  setViewpoint: (sessionId: string, viewpoint: ViewpointId) =>
    request<{ ok: boolean; applied: ViewpointId }>(
      `/api/sessions/${sessionId}/viewpoint`,
      { method: 'POST', body: JSON.stringify({ viewpoint }) },
      8000,
    ),
}
