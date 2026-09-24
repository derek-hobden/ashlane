/** Backdrop: a cached nebula per theme and size, three drifting star layers, and a vignette. */

const THEMES = {
  title: { seed: 11, base: ["#0b0c14", "#050609"], clouds: ["232,160,74", "255,90,54", "120,90,200", "60,110,170"] },
  map: { seed: 23, base: ["#0a0c15", "#05060a"], clouds: ["70,110,180", "120,90,200", "60,140,160", "232,160,74"] },
  combat: { seed: 37, base: ["#090b12", "#05060a"], clouds: ["50,120,170", "70,90,160", "232,160,74", "40,150,150"] },
  nebula: { seed: 41, base: ["#0e0a16", "#07050b"], clouds: ["150,100,230", "185,110,200", "90,70,180", "232,120,90"] },
};

function seeded(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const layers = [0.25, 0.55, 1].map((z, li) => {
  const rnd = seeded(101 + li);
  return Array.from({ length: [110, 55, 22][li] }, () => ({
    x: rnd(),
    y: rnd(),
    z,
    r: (0.5 + rnd() * 0.7) * (0.7 + z * 0.9),
    tw: rnd() * Math.PI * 2,
    warm: rnd() < 0.18,
  }));
});

const cache = new Map();

function buildNebula(theme, w, h, dpr) {
  const spec = THEMES[theme];
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.floor(w * dpr));
  c.height = Math.max(1, Math.floor(h * dpr));
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const base = g.createLinearGradient(0, 0, w * 0.3, h);
  base.addColorStop(0, spec.base[0]);
  base.addColorStop(1, spec.base[1]);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  const rnd = seeded(spec.seed);
  const span = Math.max(w, h);
  g.globalCompositeOperation = "screen";
  for (let i = 0; i < 22; i++) {
    const col = spec.clouds[i % spec.clouds.length];
    const x = rnd() * w;
    const y = h * (0.15 + rnd() * 0.7) + Math.sin(x / w * Math.PI * 1.3) * h * 0.18;
    const r = span * (0.12 + rnd() * 0.32);
    const a = 0.035 + rnd() * 0.07;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${col},${a})`);
    grad.addColorStop(0.55, `rgba(${col},${a * 0.4})`);
    grad.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Dark dust lanes to break up the glow.
  g.globalCompositeOperation = "source-over";
  for (let i = 0; i < 7; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = span * (0.08 + rnd() * 0.16);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(4,5,8,0.45)");
    grad.addColorStop(1, "rgba(4,5,8,0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Far, static star dust.
  for (let i = 0; i < Math.round((w * h) / 900); i++) {
    g.globalAlpha = 0.15 + rnd() * 0.35;
    g.fillStyle = rnd() < 0.2 ? "#ffd9b0" : "#b8c4dc";
    const s = rnd() < 0.05 ? 1.2 : 0.6;
    g.fillRect(rnd() * w, rnd() * h, s, s);
  }
  g.globalAlpha = 1;
  return c;
}

export function drawBackdrop(ctx, w, h, time, theme = "map", dpr = 1) {
  const key = `${theme}:${Math.round(w)}x${Math.round(h)}@${dpr}`;
  let neb = cache.get(key);
  if (!neb) {
    if (cache.size > 8) cache.clear();
    neb = buildNebula(theme, w, h, dpr);
    cache.set(key, neb);
  }
  ctx.drawImage(neb, 0, 0, w, h);

  for (const layer of layers) {
    for (const star of layer) {
      const x = ((star.x + time * 0.006 * star.z) % 1) * w;
      const y = star.y * h;
      const tw = 0.65 + 0.35 * Math.sin(time * (0.8 + star.z * 1.6) + star.tw);
      ctx.globalAlpha = (0.25 + star.z * 0.6) * tw;
      ctx.fillStyle = star.warm ? "#ffe2c0" : star.z > 0.9 ? "#f4f1ea" : "#a9b4ca";
      ctx.beginPath();
      ctx.arc(x, y, star.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      if (star.z === 1 && star.r > 1.3) {
        ctx.globalAlpha *= 0.45;
        ctx.fillRect(x - star.r * 2.4, y - 0.3, star.r * 4.8, 0.6);
        ctx.fillRect(x - 0.3, y - star.r * 2.4, 0.6, star.r * 4.8);
      }
    }
  }
  ctx.globalAlpha = 1;
}

let vignette = { key: "", canvas: null };

export function drawVignette(ctx, w, h, dpr = 1) {
  const key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
  if (vignette.key !== key) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.floor(w * dpr));
    c.height = Math.max(1, Math.floor(h * dpr));
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    grad.addColorStop(0, "rgba(3,4,7,0)");
    grad.addColorStop(1, "rgba(3,4,7,0.6)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    vignette = { key, canvas: c };
  }
  ctx.drawImage(vignette.canvas, 0, 0, w, h);
}
