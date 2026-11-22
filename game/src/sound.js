// Sound, all oscillators — no audio files. A tiny synth: footsteps, the
// camera servo's whir, the alarm heartbeat, the sapphire chime, the getaway
// sting. Created lazily on the first user gesture, so a silent page stays silent.

export function createSound() {
  let ctx = null;
  let master = null;
  let heartbeatTimer = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = 0) {
    if (!ensure() || ctx.state === 'suspended') return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    step(sneaking) {
      if (!sneaking) tone(150 + Math.random() * 40, 0.05, 'triangle', 0.12);
      else tone(220, 0.03, 'sine', 0.04);
    },
    coin() { tone(1900, 0.07, 'sine', 0.18); tone(2400, 0.09, 'sine', 0.14, 0.06); },
    jam() { tone(880, 0.12, 'sawtooth', 0.1, 0, 220); tone(440, 0.16, 'square', 0.06, 0.1, 110); },
    chime() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sine', 0.2, i * 0.07));
    },
    sting() {
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'triangle', 0.18, i * 0.09));
    },
    caught() {
      [330, 262, 196, 131].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.12, i * 0.12));
    },
    /** A low thump whose rate rises with the alarm; call once a frame. */
    heartbeat(alarm) {
      if (!ensure() || alarm < 35) return;
      const interval = 1.15 - (alarm / 100) * 0.65;
      if (heartbeatTimer !== null) return;
      const thump = () => {
        tone(58, 0.16, 'sine', 0.5);
        tone(48, 0.14, 'sine', 0.35, 0.14);
        heartbeatTimer = window.setTimeout(thump, interval * 1000);
      };
      thump();
    },
    stopHeartbeat() {
      if (heartbeatTimer !== null) { window.clearTimeout(heartbeatTimer); heartbeatTimer = null; }
    },
  };
}
