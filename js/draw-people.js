import { glow } from "./draw-fx.js";

/** Small top-down/three-quarter human figures. Coordinates are local: feet at (0, 0), up is -y, `face` is ±1. */

const SKIN = ["#f2cba8", "#e2b08a", "#c98e64", "#a8714b", "#80543a", "#5e3d2a"];
const HAIR = ["#1d1613", "#3b271a", "#5e3a20", "#8e5a2c", "#c9a060", "#7a2e1e", "#9a9a9a"];
const INK = "#0b0c10";
const tones = new Map();

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Stable per-person look derived from id and uniform colour. */
function lookFor(id, color, enemy) {
  const key = `${id}|${color}|${enemy}`;
  let look = tones.get(key);
  if (look) return look;
  const h = hash(String(id));
  look = {
    skin: SKIN[h % SKIN.length],
    hair: HAIR[(h >>> 5) % HAIR.length],
    long: (h >>> 9) % 3 === 0,
    seed: (h % 1000) / 159,
    cloth: shade(color, -0.12),
    light: shade(color, 0.28),
    dark: shade(color, -0.45),
    sleeve: shade(color, -0.3),
    pants: enemy ? "#3a2724" : "#2a303c",
  };
  tones.set(key, look);
  return look;
}

function limb(ctx, x0, y0, x1, y1, w, color, outline) {
  ctx.lineWidth = outline ? w + 1.6 : w;
  ctx.strokeStyle = outline ? INK : color;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function blob(ctx, color, outline) {
  if (outline) {
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function torsoPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** Pose: limb endpoints for one frame. */
function pose(face, walk, work, time, seed) {
  const d = face;
  const p = { bob: 0, feet: [[-1.7, 0], [1.7, 0]], lift: [0, 0], hands: [[-4.3, -8.6], [4.3, -8.6]] };
  if (walk != null) {
    const s = Math.sin(walk);
    const c = Math.cos(walk);
    p.bob = -Math.abs(c) * 0.9;
    p.feet = [[-1.5 + d * s * 2.8, 0], [1.5 - d * s * 2.8, 0]];
    p.lift = [Math.max(0, -c) * 1.3, Math.max(0, c) * 1.3];
    p.hands = [[-4.4 - d * s * 2, -8.8 - Math.abs(s) * 0.6], [4.4 + d * s * 2, -8.8 - Math.abs(s) * 0.6]];
  } else {
    p.bob = Math.sin(time * 2.1 + seed) * 0.35;
    const sway = Math.sin(time * 0.7 + seed * 2) * 0.35;
    p.feet = [[-1.7 + sway * 0.3, 0], [1.7 + sway * 0.3, 0]];
    if (work) {
      const tap = Math.sin(time * 9 + seed) * 0.5;
      p.hands = [[d * 3.2 - 1, -11.6 + tap], [d * 5.4, -11.8 - tap]];
    }
  }
  return p;
}

function drawHuman(ctx, look, face, p, outline) {
  const d = face;
  const b = p.bob;
  const back = d > 0 ? 0 : 1;
  const front = 1 - back;
  const shoulderX = [-3.7, 3.7];
  const sy = -14.2 + b;

  // Far arm sits behind the torso.
  ctx.lineCap = "round";
  limb(ctx, shoulderX[back], sy, p.hands[back][0], p.hands[back][1] + b, 2.3, look.dark, outline);
  if (!outline) blobHand(ctx, p.hands[back][0], p.hands[back][1] + b, look.skin, 0.85);

  for (let i = 0; i < 2; i++) {
    const hx = i ? 1.5 : -1.5;
    const [fx, fy] = p.feet[i];
    limb(ctx, hx, -7 + b, fx, fy - 1.3 - p.lift[i], 2.8, look.pants, outline);
    ctx.beginPath();
    ctx.ellipse(fx + d * 0.5, fy - 0.9 - p.lift[i], 1.9, 1.2, 0, 0, Math.PI * 2);
    blob(ctx, "#15161b", outline);
  }

  torsoPath(ctx, -3.9, -16 + b, 7.8, 9.2, 2.6);
  blob(ctx, look.cloth, outline);
  if (!outline) {
    // Light from the top-left: lit shoulder, shadowed right flank, belt.
    ctx.fillStyle = look.light;
    ctx.fillRect(-3.1, -15.4 + b, 3.2, 1.6);
    ctx.fillStyle = look.dark;
    ctx.fillRect(1.6, -14 + b, 2.3, 7.2);
    ctx.fillStyle = "rgba(8,8,12,0.7)";
    ctx.fillRect(-3.9, -8.3 + b, 7.8, 1.3);
  }

  limb(ctx, shoulderX[front], sy, p.hands[front][0], p.hands[front][1] + b, 2.3, look.sleeve, outline);
  if (!outline) blobHand(ctx, p.hands[front][0], p.hands[front][1] + b, look.skin, 0.95);

  // Head, turned toward `face`.
  const hx = d * 0.7;
  const hy = -19.4 + b;
  circle(ctx, hx, hy, 3.5);
  blob(ctx, look.skin, outline);
  if (outline) return;
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  const a0 = look.long ? 0.5 : 0.7;
  if (d > 0) ctx.arc(hx, hy, 3.75, Math.PI * a0, Math.PI * 1.8);
  else ctx.arc(hx, hy, 3.75, Math.PI * (1 - a0), -Math.PI * 0.8, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(hx - 2.2, hy - 3, 1.6, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(hx + d * 1.9 - 0.45, hy - 0.3, 0.9, 1.1);
}

function blobHand(ctx, x, y, color, r) {
  ctx.fillStyle = color;
  circle(ctx, x, y, r);
  ctx.fill();
}

function groundShadow(ctx, rx) {
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, rx * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
}

function hpBar(ctx, y, frac, w, fill) {
  ctx.fillStyle = "rgba(6,6,10,0.85)";
  ctx.fillRect(-w / 2 - 0.75, y - 0.75, w + 1.5, 3.5);
  ctx.fillStyle = fill ?? (frac > 0.5 ? "#8fdb6a" : frac > 0.25 ? "#e8a04a" : "#ff5a36");
  ctx.fillRect(-w / 2, y, w * Math.max(0, frac), 2);
}

/**
 * One crew member standing at (x, y) = feet.
 * opts: { id, color, name, face, walk (phase or null), work, selected, hp, hpMax, enemy, time, scale }
 */
export function drawPerson(ctx, x, y, o) {
  const look = lookFor(o.id, o.color, o.enemy);
  const k = o.scale ?? 1;
  const p = pose(o.face, o.walk, o.work, o.time, look.seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  if (o.selected) {
    glow(ctx, 0, -9, 17, "rgba(255,230,190,1)", 0.4);
    ctx.save();
    ctx.strokeStyle = "#fff4e4";
    ctx.lineWidth = 1.3;
    ctx.setLineDash([2.5, 2]);
    ctx.lineDashOffset = -o.time * 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.5, 3.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  groundShadow(ctx, 5.6);
  drawHuman(ctx, look, o.face, p, true);
  drawHuman(ctx, look, o.face, p, false);
  if (o.name && !o.enemy) {
    ctx.fillStyle = "rgba(10,10,14,0.62)";
    ctx.font = "700 5.5px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(o.name.slice(0, 1), -0.3, -11.6 + p.bob);
  }
  if (o.hpMax && o.hp < o.hpMax) hpBar(ctx, -27.5, o.hp / o.hpMax, 12);
  ctx.restore();
}

/** A hostile boarder in red armour at (x, y) = feet. */
export function drawBoarder(ctx, x, y, o) {
  const d = o.face;
  const t = o.time;
  const seed = o.seed ?? 0;
  const b = Math.sin(t * 2.6 + seed) * 0.4;
  const step = Math.sin(t * 1.3 + seed) * 0.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(o.scale ?? 1, o.scale ?? 1);
  glow(ctx, 0, -11, 22, "rgba(255,70,40,1)", 0.35 + 0.2 * Math.sin(t * 8 + seed));
  groundShadow(ctx, 7);
  ctx.lineCap = "round";
  for (const outline of [true, false]) {
    const back = d > 0 ? 0 : 1;
    const armor = "#7a281f";
    // Legs in a wide combat stance.
    for (let i = 0; i < 2; i++) {
      const fx = (i ? 2.6 : -2.6) + (i === back ? -step : step) * d;
      limb(ctx, i ? 2 : -2, -7.5 + b, fx, -1.4, 3.4, "#2e1715", outline);
      ctx.beginPath();
      ctx.ellipse(fx + d * 0.6, -1, 2.3, 1.4, 0, 0, Math.PI * 2);
      blob(ctx, "#140a09", outline);
    }
    // Torso plate with broad pauldrons.
    torsoPath(ctx, -5, -16.5 + b, 10, 10, 3);
    blob(ctx, armor, outline);
    for (const sx of [-4.6, 4.6]) {
      ctx.beginPath();
      ctx.ellipse(sx, -15 + b, 2.6, 2, 0, 0, Math.PI * 2);
      blob(ctx, "#a3382a", outline);
    }
    if (!outline) {
      ctx.fillStyle = "#d8664a";
      ctx.fillRect(-6, -16.2 + b, 2.6, 1.2);
      ctx.fillRect(-3.2, -15.8 + b, 2.6, 1);
      ctx.fillStyle = "#5a1a14";
      ctx.fillRect(1.8, -13.5 + b, 3.2, 7);
      ctx.fillStyle = "#1c0b09";
      ctx.fillRect(-5, -8.4 + b, 10, 1.5);
    }
    // Rifle held across the body, muzzle toward `face`.
    const gy = -10.8 + b;
    limb(ctx, -d * 3.5, gy + 1.6, d * 8, gy - 0.6, 2, "#5a5e68", outline);
    if (!outline) {
      ctx.fillStyle = "#101114";
      ctx.fillRect(d > 0 ? -1 : -1.5, gy + 0.4, 2.5, 2.8);
    }
    limb(ctx, back ? 4.8 : -4.8, -14 + b, -d * 1.5, gy + 1.2, 2.8, "#7a261c", outline);
    limb(ctx, back ? -4.8 : 4.8, -14 + b, d * 4.5, gy + 0.1, 2.8, "#8a2b20", outline);
    // Helmet with a wraparound visor.
    const hx = d * 0.6;
    const hy = -20.2 + b;
    circle(ctx, hx, hy, 4);
    blob(ctx, "#4a1b16", outline);
    if (!outline) {
      ctx.fillStyle = "#7e2c22";
      ctx.beginPath();
      ctx.arc(hx, hy, 4.2, Math.PI * 1.1, Math.PI * 1.55);
      ctx.lineTo(hx, hy);
      ctx.fill();
    }
  }
  const vx = d * 1.8;
  const vy = -20 + b;
  const flick = 0.8 + 0.2 * Math.sin(t * 13 + seed);
  glow(ctx, vx + d * 0.6, vy, 6, "rgba(255,120,60,1)", 0.9 * flick);
  ctx.fillStyle = "#ffdcae";
  ctx.fillRect(Math.min(vx - d * 2.2, vx + d * 2.4), vy - 0.8, 4.6, 1.6);
  glow(ctx, d * 8.4, -11.4 + b, 3, "rgba(255,90,50,1)", 0.7 * flick);
  hpBar(ctx, -28.5, o.hp / o.hpMax, 14, "#ff8a70");
  ctx.restore();
}
