// ---------------------------------------------------------------------------
// Fenwick CAD Control — media stream adapter
//
// The central viewport is a real media surface fed by a local Fusion capture
// service. This adapter owns the per-protocol connection logic so a real
// capture service can be plugged in by configuring a URL + protocol:
//
//   - mjpeg:      MJPEG over HTTP, rendered into an <img>. Frames are detected
//                 by watching naturalWidth, so "live" means real pixels.
//   - webrtc:     RTCPeerConnection with SDP offer/answer POSTed to the URL.
//   - websocket:  binary frames over a WebSocket, drawn onto a <canvas>.
//   - custom:     any direct video/image URL the capture service exposes.
//
// The adapter never fabricates a picture: it reports StreamState transitions
// and the viewport shows honest offline/waiting states when no frames arrive.
// ---------------------------------------------------------------------------

import type { StreamConfig, StreamState } from '../types'

export interface StreamElements {
  img: HTMLImageElement | null
  video: HTMLVideoElement | null
  canvas: HTMLCanvasElement | null
}

export interface StreamHandle {
  close: () => void
}

const CONNECT_TIMEOUT_MS = 9000

function withQuality(url: string, quality: string): string {
  if (quality === 'auto') return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}q=${encodeURIComponent(quality)}`
}

export function connectStream(
  cfg: StreamConfig,
  els: StreamElements,
  onState: (s: StreamState) => void,
): StreamHandle {
  if (!cfg.url) {
    onState('waiting')
    return { close: () => {} }
  }
  switch (cfg.kind) {
    case 'webrtc':
      return connectWebRtc(cfg, els, onState)
    case 'websocket':
      return connectWebSocket(cfg, els, onState)
    case 'mjpeg':
    case 'custom':
    default:
      return connectMjpeg(cfg, els, onState)
  }
}

// --- MJPEG / direct image URL ----------------------------------------------

function connectMjpeg(
  cfg: StreamConfig,
  els: StreamElements,
  onState: (s: StreamState) => void,
): StreamHandle {
  const img = els.img
  if (!img) return { close: () => {} }
  let closed = false
  let wentLive = false

  onState('connecting')

  const failTimer = window.setTimeout(() => {
    if (!wentLive && !closed) onState('unavailable')
  }, CONNECT_TIMEOUT_MS)

  const frameProbe = window.setInterval(() => {
    // naturalWidth > 0 means the decoder has actually received a frame.
    if (!wentLive && img.complete && img.naturalWidth > 0) {
      wentLive = true
      window.clearTimeout(failTimer)
      onState('live')
    }
  }, 400)

  const onError = () => {
    if (closed) return
    window.clearTimeout(failTimer)
    onState(wentLive ? 'reconnecting' : 'unavailable')
  }
  img.addEventListener('error', onError)
  img.src = withQuality(cfg.url, cfg.quality)

  return {
    close: () => {
      closed = true
      window.clearTimeout(failTimer)
      window.clearInterval(frameProbe)
      img.removeEventListener('error', onError)
      img.src = ''
    },
  }
}

// --- WebRTC ------------------------------------------------------------------

function connectWebRtc(
  cfg: StreamConfig,
  els: StreamElements,
  onState: (s: StreamState) => void,
): StreamHandle {
  const video = els.video
  if (!video) return { close: () => {} }
  let closed = false
  let wentLive = false
  const pc = new RTCPeerConnection()

  onState('connecting')

  const failTimer = window.setTimeout(() => {
    if (!wentLive && !closed) onState('unavailable')
  }, CONNECT_TIMEOUT_MS)

  pc.addTransceiver('video', { direction: 'recvonly' })
  pc.addEventListener('track', (e) => {
    if (closed) return
    video.srcObject = e.streams[0] ?? new MediaStream([e.track])
    void video.play().catch(() => {})
  })
  video.addEventListener('playing', () => {
    if (closed) return
    wentLive = true
    window.clearTimeout(failTimer)
    onState('live')
  })
  pc.addEventListener('connectionstatechange', () => {
    if (closed) return
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      onState(wentLive ? 'reconnecting' : 'unavailable')
    }
  })

  // SDP offer/answer handshake against the capture service's signaling URL.
  pc
    .createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .then(() =>
      fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pc.localDescription),
      }),
    )
    .then((res) => {
      if (!res.ok) throw new Error(`WebRTC signaling failed: HTTP ${res.status}`)
      return res.json()
    })
    .then((answer) => pc.setRemoteDescription(answer))
    .catch(() => {
      if (!closed) {
        window.clearTimeout(failTimer)
        onState('unavailable')
      }
    })

  return {
    close: () => {
      closed = true
      window.clearTimeout(failTimer)
      video.srcObject = null
      pc.close()
    },
  }
}

// --- WebSocket binary frames --------------------------------------------------

function connectWebSocket(
  cfg: StreamConfig,
  els: StreamElements,
  onState: (s: StreamState) => void,
): StreamHandle {
  const canvas = els.canvas
  if (!canvas) return { close: () => {} }
  const ctx = canvas.getContext('2d')
  let closed = false
  let wentLive = false
  let ws: WebSocket

  onState('connecting')

  const failTimer = window.setTimeout(() => {
    if (!wentLive && !closed) onState('unavailable')
  }, CONNECT_TIMEOUT_MS)

  try {
    ws = new WebSocket(cfg.url)
    ws.binaryType = 'blob'
  } catch {
    onState('unavailable')
    return { close: () => {} }
  }

  ws.addEventListener('message', (e) => {
    if (closed || !(e.data instanceof Blob) || !ctx) return
    void createImageBitmap(e.data)
      .then((bmp) => {
        if (closed) {
          bmp.close()
          return
        }
        if (canvas.width !== bmp.width) canvas.width = bmp.width
        if (canvas.height !== bmp.height) canvas.height = bmp.height
        ctx.drawImage(bmp, 0, 0)
        bmp.close()
        if (!wentLive) {
          wentLive = true
          window.clearTimeout(failTimer)
          onState('live')
        }
      })
      .catch(() => {})
  })
  ws.addEventListener('close', () => {
    if (!closed) onState(wentLive ? 'reconnecting' : 'unavailable')
  })
  ws.addEventListener('error', () => {
    if (!closed) onState(wentLive ? 'reconnecting' : 'unavailable')
  })

  return {
    close: () => {
      closed = true
      window.clearTimeout(failTimer)
      try {
        ws.close()
      } catch {
        /* already closed */
      }
    },
  }
}
