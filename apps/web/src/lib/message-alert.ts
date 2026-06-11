'use client';

const MUTE_KEY = 'flowchat_message_alert_muted';

export function isMessageAlertMuted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setMessageAlertMuted(muted: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  }
}

/** Short notification chime for new visitor messages. */
export function playMessageAlert() {
  if (typeof window === 'undefined' || isMessageAlertMuted()) return;
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch { /* autoplay policy */ }
}

export function updateTabBadge(count: number) {
  if (typeof document === 'undefined') return;
  const base = 'FlowChat';
  document.title = count > 0 ? `(${count}) ${base}` : base;
}
