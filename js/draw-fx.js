/** Renderer-only effects: cached glow sprites and a small particle pool. Nothing here touches sim state. */

const sprites = new Map();

function glowSprite(color) {
  let sprite = sprites.get(color);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = 64;
  sprite.height = 64;
  const g = sprite.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color.replace(/[\d.]+\)$/, "0.45)"));
  grad.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sprites.set(color, sprite);
  return sprite;
}

/** Additive soft glow. `color` must be an rgba() string. */
export function glow(ctx, x, y, r, color, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const prevOp = ctx.globalCompositeOperation;
  const prevA = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = prevA * Math.min(1, alpha);
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prevA;
  ctx.globalCompositeOperation = prevOp;
}

const particles = [];
const MAX_PARTICLES = 420;

function push(p) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(p);
}

export function spawnSparks(x, y, count, opts = {}) {
  const speed = opts.speed ?? 120;
  const color = opts.color ?? "rgba(255,190,110,1)";
  for (let i = 0; i < count; i++) {
    const a = (opts.angle ?? Math.random() * Math.PI * 2) + (opts.spread ?? Math.PI) * (Math.random() - 0.5) * 2;
    const v = speed * (0.35 + Math.random() * 0.8);
    push({
      kind: "spark",
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.35 + Math.random() * 0.45,
      max: 0.8,
      size: 1 + Math.random() * 1.4,
      color,
    });
  }
}

export function spawnExplosion(x, y, scale = 1) {
  push({ kind: "flash", x, y, life: 0.22, max: 0.22, size: 34 * scale, color: "rgba(255,210,150,1)" });
  push({ kind: "ring", x, y, life: 0.4, max: 0.4, size: 26 * scale, color: "rgba(255,140,80,1)" });
  for (let i = 0; i < 5; i++) {
    push({
      kind: "smoke",
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 16,
      vy: -6 - Math.random() * 10,
      life: 0.7 + Math.random() * 0.5,
      max: 1.2,
      size: 6 + Math.random() * 8 * scale,
    });
  }
  spawnSparks(x, y, Math.round(16 * scale), { speed: 150 * scale });
}

export function spawnShieldHit(x, y, color = "rgba(110,220,255,1)") {
  push({ kind: "flash", x, y, life: 0.25, max: 0.25, size: 30, color });
  push({ kind: "ring", x, y, life: 0.35, max: 0.35, size: 22, color });
  spawnSparks(x, y, 8, { speed: 90, color });
}

export function spawnMuzzle(x, y, color) {
  push({ kind: "flash", x, y, life: 0.12, max: 0.12, size: 18, color });
}

export function spawnSmoke(x, y) {
  push({ kind: "smoke", x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0.45, max: 0.45, size: 3 + Math.random() * 2 });
}

export function stepFx(dt) {
  for (const p of particles) {
    p.life -= dt;
    if (p.vx !== undefined) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(1, dt * 2.6);
      p.vy *= 1 - Math.min(1, dt * 2.6);
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
}

export function clearFx() {
  particles.length = 0;
}

export function drawFx(ctx) {
  for (const p of particles) {
    if (p.kind !== "smoke") continue;
    const t = p.life / p.max;
    ctx.globalAlpha = 0.28 * t;
    ctx.fillStyle = "#3b3a40";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const prevOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    const t = Math.max(0, p.life / p.max);
    if (p.kind === "spark") {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = t;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.stroke();
    } else if (p.kind === "flash") {
      ctx.globalAlpha = 1;
      glow(ctx, p.x, p.y, p.size * (0.6 + 0.4 * t), p.color, t);
    } else if (p.kind === "ring") {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = t * 0.8;
      ctx.lineWidth = 2 * t + 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.2 - t), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.globalCompositeOperation = prevOp;
}
