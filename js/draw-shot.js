import { roomRect } from "./draw-geom.js";
import { glow, spawnSmoke } from "./draw-fx.js";

export function shotPath(shot, state, boxes) {
  const fromShip = shot.from === "player" ? state.player : state.combat.enemy;
  const toShip = shot.from === "player" ? state.combat.enemy : state.player;
  if (!fromShip || !toShip) return null;
  const fromBox = shot.from === "player" ? boxes.player : boxes.enemy;
  const toBox = shot.from === "player" ? boxes.enemy : boxes.player;
  const muzzleRoom = fromShip.rooms.find((r) => r.id === "weapons");
  const targetRoom = toShip.rooms.find((r) => r.id === shot.target) ?? toShip.rooms.find((r) => r.id === "weapons");
  const muzzle = roomRect(muzzleRoom, fromBox, fromShip.side === "enemy");
  const target = roomRect(targetRoom, toBox, toShip.side === "enemy");
  const sx = shot.from === "player" ? muzzle.x + muzzle.w : muzzle.x;
  const sy = muzzle.y + muzzle.h / 2;
  return { sx, sy, ex: target.x + target.w / 2, ey: target.y + target.h / 2 };
}

export function drawProjectile(ctx, shot, state, boxes, time) {
  const path = shotPath(shot, state, boxes);
  if (!path) return;
  const { sx, sy, ex, ey } = path;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const x = sx + dx * shot.dist;
  const y = sy + dy * shot.dist;
  const prevOp = ctx.globalCompositeOperation;

  if (shot.kind === "missile") {
    if (Math.random() < 0.7) spawnSmoke(x - ux * 8, y - uy * 8);
    glow(ctx, x - ux * 7, y - uy * 7, 14, "rgba(255,150,70,1)", 0.8 + 0.2 * Math.sin(time * 40));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.fillStyle = "#d9d2c4";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(1, -2.4);
    ctx.lineTo(-5, -2.4);
    ctx.lineTo(-7, -4);
    ctx.lineTo(-7, 4);
    ctx.lineTo(-5, 2.4);
    ctx.lineTo(1, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8a04a";
    ctx.fillRect(-3, -2.4, 1.6, 4.8);
    ctx.restore();
  } else if (shot.kind === "ion") {
    const r = 5 + Math.sin(time * 30) * 1.2;
    glow(ctx, x, y, 22, "rgba(190,150,255,1)", 0.9);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(220,200,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, time * 12, time * 12 + Math.PI * 1.3);
    ctx.stroke();
    ctx.fillStyle = "#f4eeff";
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = prevOp;
    ctx.lineWidth = 1;
  } else {
    const player = shot.from === "player";
    const rgb = player ? "255,196,120" : "255,96,70";
    const tail = Math.min(34, len * shot.dist);
    const tx = x - ux * tail;
    const ty = y - uy * tail;
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createLinearGradient(tx, ty, x, y);
    grad.addColorStop(0, `rgba(${rgb},0)`);
    grad.addColorStop(1, `rgba(${rgb},0.9)`);
    ctx.strokeStyle = grad;
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,248,236,0.95)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - ux * tail * 0.45, y - uy * tail * 0.45);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = prevOp;
    glow(ctx, x, y, 14, `rgba(${rgb},1)`, 0.9);
  }
}
