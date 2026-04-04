// ── Sound configuration ───────────────────────────────────────────────────────
// Map each sound event to a file in /assets/sounds/ plus playback options.
// Set `file` to null to disable a sound entirely.

export interface SoundConfig {
  file: string | null
  volume?: number
  /** Trim playback to this many milliseconds */
  durationMs?: number
  playbackRate?: number
  /** Start playback this many milliseconds into the file */
  offsetMs?: number
}

const sounds = {
  panelOpen:     { file: '/assets/sounds/whoof.wav',      volume: 0.4, playbackRate: 1.5, offsetMs: 600 },
  swipe:         { file: '/assets/sounds/swipe.wav',      volume: 0.15 },
  alert:         { file: '/assets/sounds/alert.wav',      volume: 0.5 },
  click:         { file: '/assets/sounds/click.wav',      volume: 0.4 },
  widgetRemoved: { file: '/assets/sounds/drop.wav', volume: 0.2, durationMs: 80 },
  widgetDrop:    { file: '/assets/sounds/drop-element.wav', volume: 0.35 },
  widgetPickup:  { file: '/assets/sounds/minimal-lift.wav', volume: 0, playbackRate: 2.0 },
  widgetAdded:   { file: '/assets/sounds/land.wav',       volume: 0.5 },
} satisfies Record<string, SoundConfig>

export default sounds
