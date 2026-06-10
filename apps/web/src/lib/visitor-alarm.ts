'use client';

let audioCtx: AudioContext | null = null;
let muted = false;

const MUTE_KEY = 'flowchat_visitor_alarm_muted';

export function isVisitorAlarmMuted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setVisitorAlarmMuted(mutedValue: boolean) {
  muted = mutedValue;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTE_KEY, mutedValue ? '1' : '0');
  }
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** Heavy alternating siren for visitor-on-site alerts. */
export function playVisitorAlarm() {
  if (typeof window === 'undefined') return;
  if (muted || isVisitorAlarmMuted()) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 2.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.85, now + 0.05);
    gain.gain.setValueAtTime(0.85, now + duration - 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(ctx.destination);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'square';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(880, now);
    oscB.frequency.setValueAtTime(660, now);

    // Rapid alternation for alarm feel
    for (let i = 0; i < 12; i++) {
      const t = now + i * 0.2;
      const high = i % 2 === 0;
      oscA.frequency.setValueAtTime(high ? 920 : 520, t);
      oscB.frequency.setValueAtTime(high ? 740 : 440, t);
    }

    oscA.connect(gain);
    oscB.connect(gain);
    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + duration);
    oscB.stop(now + duration);
  } catch {
    // Autoplay policies may block until user gesture — ignore
  }
}

// Hydrate mute preference
if (typeof window !== 'undefined') {
  muted = isVisitorAlarmMuted();
}
