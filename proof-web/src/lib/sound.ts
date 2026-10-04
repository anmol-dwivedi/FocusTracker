/**
 * Completion chime, synthesised in the browser.
 *
 * No audio file to host, nothing to download, works offline.
 *
 * Browsers block audio that does not trace back to a user gesture, so the
 * context is created and resumed when a session STARTS. That click is what
 * buys the right to make a sound when the timer finishes an hour later.
 */

type AudioContextCtor = typeof AudioContext

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

/** Call from inside a click handler. Safe to call repeatedly. */
export function unlockAudio(): void {
  const audio = getContext()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()
}

/** One soft bell: a sine tone with a quick attack and a long decay. */
function ring(audio: AudioContext, frequency: number, at: number, volume: number): void {
  const osc = audio.createOscillator()
  const gain = audio.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, at)

  // Exponential ramps avoid the click a hard gain change produces.
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(at)
  osc.stop(at + 1.2)
}

/**
 * Rising three note figure, played twice. Audible from across a room
 * without being the sort of noise that makes you flinch.
 */
export function playCompletionChime(): void {
  const audio = getContext()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()

  try {
    const start = audio.currentTime + 0.05
    const notes = [880, 1108.73, 1318.51] // A5, C#6, E6
    for (const pass of [0, 1.5]) {
      notes.forEach((frequency, i) => {
        ring(audio, frequency, start + pass + i * 0.17, 0.22)
      })
    }
  } catch {
    // Sound is a nicety. It must never take the timer down with it.
  }
}
