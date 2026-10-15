// Beep + vibrate so door staff know the result without staring at the screen.
let audio

export function prepareAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)()
    audio.resume?.()
  } catch {
    /* no audio: fine */
  }
}

function tone(freq, seconds) {
  if (!audio) return
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + seconds)
  } catch {
    /* ignore */
  }
}

function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

export function feedback(kind) {
  if (kind === 'ok') {
    tone(880, 0.12)
    vibrate(80)
  } else {
    tone(220, 0.35)
    vibrate([120, 60, 120])
  }
}
