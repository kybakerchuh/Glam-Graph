let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(kind: 'correct' | 'wrong' | 'apply' | 'unlock', muted: boolean) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const playNote = (freq: number, start: number, dur: number, type: OscillatorType, gainVal: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  };

  if (kind === 'correct') {
    playNote(523.25, now, 0.14, 'sine', 0.08);
    playNote(659.25, now + 0.08, 0.16, 'sine', 0.08);
    playNote(783.99, now + 0.16, 0.24, 'triangle', 0.09);
  } else if (kind === 'wrong') {
    playNote(260, now, 0.14, 'sine', 0.06);
    playNote(220, now + 0.11, 0.2, 'sine', 0.05);
  } else if (kind === 'apply') {
    playNote(587.33, now, 0.09, 'sine', 0.04);
    playNote(880, now + 0.05, 0.12, 'sine', 0.04);
  } else if (kind === 'unlock') {
    playNote(587.33, now, 0.1, 'triangle', 0.07);
    playNote(739.99, now + 0.07, 0.1, 'triangle', 0.07);
    playNote(880, now + 0.14, 0.12, 'triangle', 0.08);
    playNote(1174.66, now + 0.21, 0.25, 'sine', 0.08);
  }
}
