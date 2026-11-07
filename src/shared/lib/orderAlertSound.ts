/** Short kitchen chime via Web Audio (no asset file). Browsers need a user gesture first. */

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Call once after any click/keydown so later alerts can play without a gesture. */
export function unlockOrderAlertSound() {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') {
    void audio.resume().then(() => {
      unlocked = true;
    });
  } else {
    unlocked = true;
  }
}

export function ensureOrderAlertSoundUnlocked() {
  if (unlocked) return;
  const unlock = () => {
    unlockOrderAlertSound();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function tone(
  audio: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  gainPeak: number,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Two-note chime suitable for a new order alert. */
export function playOrderAlertSound() {
  const audio = getCtx();
  if (!audio) return;
  const run = () => {
    const t = audio.currentTime;
    tone(audio, 880, t, 0.16, 0.22);
    tone(audio, 1174.66, t + 0.14, 0.28, 0.18);
  };
  if (audio.state === 'suspended') {
    void audio.resume().then(run).catch(() => undefined);
  } else {
    run();
  }
}
