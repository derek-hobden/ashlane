export function createAudio() {
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem("ashlane-mute") === "1";
  } catch {
    muted = false;
  }

  function ac() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain) {
    if (muted) return;
    const context = ac();
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    amp.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + dur);
    osc.connect(amp);
    amp.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + dur);
  }

  return {
    unlock() {
      if (!muted) ac();
    },
    get muted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      try {
        localStorage.setItem("ashlane-mute", muted ? "1" : "0");
      } catch {
        /* private mode */
      }
      return muted;
    },
    shot(kind) {
      if (kind === "missile") tone(180, 0.16, "sawtooth", 0.04);
      else if (kind === "ion") tone(520, 0.08, "triangle", 0.03);
      else tone(740, 0.06, "square", 0.025);
    },
    hit() {
      tone(90, 0.14, "sawtooth", 0.05);
    },
    shield() {
      tone(360, 0.05, "sine", 0.03);
    },
    ui() {
      tone(620, 0.03, "square", 0.02);
    },
  };
}
