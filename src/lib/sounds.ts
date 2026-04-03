/**
 * sounds.ts — Programmatic Web Audio UI sound effects
 *
 * Design targets:
 *   - JARVIS / Iron Man suit aesthetic: clean, tonal, digital, never harsh
 *   - All sounds < 350 ms (most < 200 ms) so they never feel laggy
 *   - Peak gain ≤ 0.10 — subtle background feedback, not intrusive
 *   - Zero audio files: every sound is synthesised from oscillators,
 *     gain nodes, BiquadFilters, and WaveShaper nodes
 *
 * Each exported function is fire-and-forget.  It creates its own
 * AudioContext, plays the sound, then lets the context GC.
 * (Creating a context per sound is fine for short one-shot FX.)
 */

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ctx(): AudioContext {
  return new (window.AudioContext ?? (window as any).webkitAudioContext)()
}

function playFile(path: string, volume = 1.0, durationMs?: number, playbackRate = 1.0) {
  try {
    if (durationMs !== undefined || playbackRate !== 1.0) {
      // Use Web Audio API for trim or speed control
      fetch(path)
        .then((r) => r.arrayBuffer())
        .then((ab) => {
          const ac = ctx()
          return ac.decodeAudioData(ab).then((buffer) => {
            const source = ac.createBufferSource()
            const gain   = ac.createGain()
            source.buffer       = buffer
            source.playbackRate.value = playbackRate
            gain.gain.value     = volume
            source.connect(gain)
            gain.connect(ac.destination)
            source.start(0)
            if (durationMs !== undefined) {
              source.stop(ac.currentTime + durationMs / 1000 / playbackRate)
            }
          })
        })
        .catch((e) => console.warn('[sound] blocked', path, e))
    } else {
      const audio = new Audio(path)
      audio.volume = volume
      audio.play().catch((e) => console.warn('[sound] blocked', path, e))
    }
  } catch (e) {
    console.error('[sound] error', path, e)
  }
}

// ─── 0. Panel / Button click (file-based) ─────────────────────────────────────

export function soundPanelOpen() {
  playFile('/assets/sounds/open.wav', 0.4, undefined, 1.5)
}

export function soundSwipe() {
  playFile('/assets/sounds/swipe.wav', 0.4)
}

export function soundAlert() {
  playFile('/assets/sounds/alert.wav', 0.5)
}

export function soundClick() {
  playFile('/assets/sounds/click.wav', 0.4)
}

export function soundWidgetRemoved() {
  playFile('/assets/sounds/drop.wav', 0.2, 80)
}

export function soundWidgetDrop() {
  playFile('/assets/sounds/soft_bump.wav', 0.3)
}

export function soundWidgetPickup() {
  playFile('/assets/sounds/whoosh.wav', 0.5, 150)
}

// ─── 1. Widget Added ──────────────────────────────────────────────────────────
//
// Two-tone rising chime: a short low sweep followed immediately by a
// slightly higher, brighter tone — like a soft HUD "element materialised"
// confirmation.  Both tones use a sine wave so they stay warm not buzzy.
//
export function soundWidgetAdded(): void {
  playFile('/assets/sounds/land.wav', 0.5)
}

// ─── 2. Widget Removed ────────────────────────────────────────────────────────
//
// Falling two-tone sweep — mirror image of "added": high → low, slightly
// drier/shorter.  Adds a brief high-freq "dissolve" noise burst to sell
// the disappearance.
//

// ─── 3. Wake Word Activated ───────────────────────────────────────────────────
//
// Kept identical to the existing playWakeCue() in useVoice.ts so the two
// stay in sync if you consolidate.  Exported here so callers can import
// from a single sounds module.
//
export function soundWakeWord(): void {
  try {
    const ac   = ctx()
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.frequency.value = 740
    gain.gain.setValueAtTime(0.08, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18)
    osc.start()
    osc.stop(ac.currentTime + 0.18)
  } catch { /* ignore */ }
}

// ─── 4. Processing / Thinking ─────────────────────────────────────────────────
//
// A slow, repeating "pulse" that plays while the AI is responding.
// Call soundProcessingStart() — it returns a stop function; call that
// when the response arrives.
//
// The pulse is a 320 Hz tone, amplitude-modulated at ~3 Hz (slow throb),
// with a soft low-pass so it sits well below voice frequencies.
//
export function soundProcessingStart(): () => void {
  let stopped = false
  let ac: AudioContext

  try {
    ac = ctx()
    const now = ac.currentTime

    // LFO — 3 Hz AM modulator
    const lfo      = ac.createOscillator()
    const lfoGain  = ac.createGain()
    lfo.type             = 'sine'
    lfo.frequency.value  = 3
    lfoGain.gain.value   = 0.03    // modulation depth

    // Carrier
    const carrier     = ac.createOscillator()
    const carrierGain = ac.createGain()
    const lpf         = ac.createBiquadFilter()

    carrier.type              = 'sine'
    carrier.frequency.value   = 320
    carrierGain.gain.value    = 0.0  // will be set by LFO offset below
    lpf.type                  = 'lowpass'
    lpf.frequency.value       = 900

    // Offset the LFO so gain is always positive (0.03 ± 0.03 → 0..0.06)
    const dcOffset     = ac.createConstantSource()
    dcOffset.offset.value = 0.035

    lfo.connect(lfoGain)
    lfoGain.connect(carrierGain.gain)
    dcOffset.connect(carrierGain.gain)

    carrier.connect(carrierGain)
    carrierGain.connect(lpf)
    lpf.connect(ac.destination)

    // Fade in over 200 ms
    carrierGain.gain.setValueAtTime(0, now)

    lfo.start(now)
    dcOffset.start(now)
    carrier.start(now)

    // Fade-in ramp via a master gain
    const masterGain = ac.createGain()
    lpf.disconnect()
    lpf.connect(masterGain)
    masterGain.connect(ac.destination)
    masterGain.gain.setValueAtTime(0, now)
    masterGain.gain.linearRampToValueAtTime(1, now + 0.25)

    return () => {
      if (stopped) return
      stopped = true
      try {
        const t = ac.currentTime
        masterGain.gain.setValueAtTime(masterGain.gain.value, t)
        masterGain.gain.linearRampToValueAtTime(0, t + 0.15)
        carrier.stop(t + 0.18)
        lfo.stop(t + 0.18)
        dcOffset.stop(t + 0.18)
      } catch { /* already stopped */ }
    }
  } catch {
    return () => { /* no-op */ }
  }
}

// ─── 5. Success / Confirmed ───────────────────────────────────────────────────
//
// Three-note ascending arpeggio in a pentatonic-friendly pattern:
//   C5 (523 Hz) → E5 (659 Hz) → G5 (784 Hz)
// Each note is a brief sine burst with a tight envelope.  The whole thing
// lands in under 280 ms.  A bright high-pass shimmer is added on the
// final note so it reads as "positive" not neutral.
//
export function soundSuccess(): void {
  try {
    const ac  = ctx()
    const now = ac.currentTime

    const notes = [
      { freq: 523, t: 0,    dur: 0.09 },
      { freq: 659, t: 0.09, dur: 0.09 },
      { freq: 784, t: 0.18, dur: 0.12 },
    ] as const

    notes.forEach(({ freq, t, dur }) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type          = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + t)
      gain.gain.linearRampToValueAtTime(0.08, now + t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur)
      osc.start(now + t)
      osc.stop(now + t + dur + 0.01)
    })

    // Shimmer on final note: band-passed noise
    const bufLen = Math.floor(ac.sampleRate * 0.10)
    const buf    = ac.createBuffer(1, bufLen, ac.sampleRate)
    const data   = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1
    const shimmer  = ac.createBufferSource()
    shimmer.buffer = buf
    const bpf      = ac.createBiquadFilter()
    bpf.type             = 'bandpass'
    bpf.frequency.value  = 6000
    bpf.Q.value          = 2
    const sgain    = ac.createGain()
    shimmer.connect(bpf)
    bpf.connect(sgain)
    sgain.connect(ac.destination)
    sgain.gain.setValueAtTime(0, now + 0.18)
    sgain.gain.linearRampToValueAtTime(0.04, now + 0.20)
    sgain.gain.exponentialRampToValueAtTime(0.001, now + 0.30)
    shimmer.start(now + 0.18)
    shimmer.stop(now + 0.32)
  } catch { /* ignore */ }
}

// ─── 6. Error ─────────────────────────────────────────────────────────────────
//
// A low, slightly dissonant two-tone "thud" — not an obnoxious buzzer,
// just a firm, authoritative "no".  Two sawtooth oscillators slightly
// detuned from each other (100 Hz + 94 Hz) create mild beating.
// A low-pass at 400 Hz keeps it dull/bassy.  Brief, under 220 ms.
//
export function soundError(): void {
  try {
    const ac  = ctx()
    const now = ac.currentTime

    function makeTone(freq: number, delay: number) {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      const lpf  = ac.createBiquadFilter()
      lpf.type            = 'lowpass'
      lpf.frequency.value = 420
      osc.connect(lpf)
      lpf.connect(gain)
      gain.connect(ac.destination)
      osc.type          = 'sawtooth'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(0.06, now + delay + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18)
      osc.start(now + delay)
      osc.stop(now + delay + 0.20)
    }

    makeTone(100, 0)
    makeTone(94,  0)      // slight beat frequency

    // Second "thud" — reinforces the failure
    makeTone(88,  0.10)
    makeTone(83,  0.10)
  } catch { /* ignore */ }
}
