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

type AlarmPreset = {
  label: string;
  duration: number;
  steps: number;
  stepDuration: number;
  oscillators: { type: OscillatorType; base: number; alt: number }[];
};

/**
 * Administrator-configurable visitor-online alert tones (Settings →
 * Notifications). All procedurally synthesized via Web Audio oscillators —
 * no sound files to host, works identically on the web dashboard and the
 * installed PWA. "classic" reproduces the original hardcoded siren exactly.
 */
export const ALARM_PRESETS: Record<string, AlarmPreset> = {
  classic: {
    label: 'Classic siren',
    duration: 2.4,
    steps: 12,
    stepDuration: 0.2,
    oscillators: [
      { type: 'square', base: 920, alt: 520 },
      { type: 'sawtooth', base: 740, alt: 440 },
    ],
  },
  chime: {
    label: 'Soft chime',
    duration: 1.2,
    steps: 2,
    stepDuration: 0.5,
    oscillators: [{ type: 'sine', base: 880, alt: 660 }],
  },
  pulse: {
    label: 'Pulse beep',
    duration: 1.6,
    steps: 4,
    stepDuration: 0.4,
    oscillators: [{ type: 'square', base: 700, alt: 700 }],
  },
  bell: {
    label: 'Bell ring',
    duration: 1.8,
    steps: 3,
    stepDuration: 0.6,
    oscillators: [{ type: 'triangle', base: 950, alt: 950 }],
  },
};

export const DEFAULT_ALARM_PRESET_ID = 'classic';

/** Alternating tone (siren by default, or another admin-selected preset) for visitor-on-site alerts. */
export function playVisitorAlarm(presetId?: string) {
  if (typeof window === 'undefined') return;
  if (muted || isVisitorAlarmMuted()) return;

  const preset = (presetId && ALARM_PRESETS[presetId]) || ALARM_PRESETS[DEFAULT_ALARM_PRESET_ID]!;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = preset.duration;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.85, now + 0.05);
    gain.gain.setValueAtTime(0.85, now + duration - 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(ctx.destination);

    const oscillators = preset.oscillators.map((spec) => {
      const osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.base, now);
      for (let i = 0; i < preset.steps; i++) {
        const t = now + i * preset.stepDuration;
        osc.frequency.setValueAtTime(i % 2 === 0 ? spec.base : spec.alt, t);
      }
      osc.connect(gain);
      return osc;
    });

    for (const osc of oscillators) {
      osc.start(now);
      osc.stop(now + duration);
    }
  } catch {
    // Autoplay policies may block until user gesture — ignore
  }
}

// Hydrate mute preference
if (typeof window !== 'undefined') {
  muted = isVisitorAlarmMuted();
}
