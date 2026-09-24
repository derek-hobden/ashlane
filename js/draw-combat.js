import { evasion } from "./sim.js";
import { hitState, roomRect, shipLayout } from "./draw-geom.js";
import { drawFx, glow, spawnBeam, spawnExplosion, spawnMuzzle, spawnShieldHit, stepFx } from "./draw-fx.js";
import { drawShip, shieldGeometry } from "./draw-ship.js";
import { drawProjectile, shotPath } from "./draw-shot.js";

const seenShots = new Set();
const seenFloats = new WeakSet();
const seenBoarders = new WeakSet();

function beam(ship, roomId, box) {
  const room = ship.rooms.find((r) => r.id === roomId);
  if (!room) return;
  const r = roomRect(room, box, ship.side === "enemy");
  spawnBeam(r.x + r.w / 2, r.y + r.h / 2, "rgba(255,110,80,1)");
}

function noteEffects(state, boxes) {
  for (const shot of state.combat.projectiles) {
    if (seenShots.has(shot.id)) continue;
    seenShots.add(shot.id);
    const path = shotPath(shot, state, boxes);
    if (path && shot.dist < 0.2) {
      const color = shot.kind === "ion" ? "rgba(190,150,255,1)" : shot.from === "player" ? "rgba(255,200,130,1)" : "rgba(255,110,80,1)";
      spawnMuzzle(path.sx, path.sy, color);
    }
  }
  if (seenShots.size > 120) {
    const keep = new Set(state.combat.projectiles.map((s) => s.id));
    for (const id of seenShots) if (!keep.has(id)) seenShots.delete(id);
  }
  // A boarder beaming across: flash where they left and where they land.
  for (const boarder of state.player.boarders ?? []) {
    if (seenBoarders.has(boarder)) continue;
    seenBoarders.add(boarder);
    if (boarder.from && state.combat.enemy) beam(state.combat.enemy, boarder.from, boxes.enemy);
    beam(state.player, boarder.room, boxes.player);
  }
  for (const flo of state.combat.floats) {
    if (seenFloats.has(flo)) continue;
    seenFloats.add(flo);
    const box = flo.side === "player" ? boxes.player : boxes.enemy;
    const ship = flo.side === "player" ? state.player : state.combat.enemy;
    if (!ship) continue;
    const room = ship.rooms.find((r) => r.id === flo.room) ?? ship.rooms[0];
    const rect = roomRect(room, box, ship.side === "enemy");
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    if (flo.text === "block" || flo.text === "ion") {
      // Strike the shield on the side facing the attacker.
      const g = shieldGeometry(box);
      const face = flo.side === "player" ? 1 : -1;
      const ny = Math.max(-0.9, Math.min(0.9, (cy - g.cy) / g.ry));
      const px = g.cx + face * g.rx * Math.sqrt(1 - ny * ny);
      spawnShieldHit(px, g.cy + ny * g.ry, flo.text === "ion" ? "rgba(190,150,255,1)" : "rgba(110,220,255,1)");
    } else if (flo.text.startsWith("-")) {
      spawnExplosion(cx, cy, 0.8 + Math.min(0.6, Number(flo.text.slice(1)) * 0.2));
    }
  }
}

function label(ctx, text, x, y, color) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(5,6,10,0.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.lineWidth = 1;
}

function drawBattery(ctx, box, h, time) {
  const cx = box.x + box.w / 2;
  const cy = h / 2;
  glow(ctx, cx, cy, 90, "rgba(255,70,40,1)", 0.35 + 0.1 * Math.sin(time * 2));
  ctx.strokeStyle = "rgba(255,90,54,0.7)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 26 + i * 16, time * (0.6 + i * 0.3), time * (0.6 + i * 0.3) + Math.PI * 1.2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.fillStyle = "#ff7a5a";
  ctx.font = "600 15px Sora, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ARMADA BATTERY", cx, cy + 90);
}

export function drawCombat(ctx, state, w, h, time, dt) {
  const boxes = shipLayout(w, h);
  noteEffects(state, boxes);
  if (!state.paused) stepFx(dt);

  const rooms = drawShip(ctx, state.player, boxes.player, false, state, time, dt);
  if (state.combat.enemy) rooms.push(...drawShip(ctx, state.combat.enemy, boxes.enemy, true, state, time, dt));
  else drawBattery(ctx, boxes.enemy, h, time);

  for (const shot of state.combat.projectiles) drawProjectile(ctx, shot, state, boxes, time);
  drawFx(ctx);

  ctx.font = "600 13px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // Volleys land several numbers on one room; merge repeats ("-1 ×3") and stack different results.
  const groups = new Map();
  for (const flo of state.combat.floats) {
    const key = `${flo.side}:${flo.room}:${flo.text}`;
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      g.life = Math.max(g.life, flo.life);
    } else groups.set(key, { ...flo, count: 1 });
  }
  const newest = new Map();
  for (const g of groups.values()) {
    const k = `${g.side}:${g.room}`;
    newest.set(k, Math.max(newest.get(k) ?? 0, g.life));
  }
  const rows = new Map();
  for (const flo of groups.values()) {
    const box = flo.side === "player" ? boxes.player : boxes.enemy;
    const ship = flo.side === "player" ? state.player : state.combat.enemy;
    if (!ship) continue;
    const room = ship.rooms.find((r) => r.id === flo.room) ?? ship.rooms[0];
    const rect = roomRect(room, box, ship.side === "enemy");
    const rowKey = `${flo.side}:${room.id}`;
    const row = rows.get(rowKey) ?? 0;
    rows.set(rowKey, row + 1);
    const life = Math.max(0, flo.life);
    ctx.globalAlpha = Math.min(1, life * 2);
    const rise = (0.8 - Math.max(0, newest.get(`${flo.side}:${flo.room}`))) * 22;
    const color = flo.text === "block" || flo.text === "evade" ? "#9ad7ff" : flo.text === "ion" ? "#d2b6ff" : "#ffcf9a";
    const text = flo.text.toUpperCase() + (flo.count > 1 ? ` ×${flo.count}` : "");
    label(ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2 - 10 - rise - row * 16, color);
    ctx.globalAlpha = 1;
  }

  const evade = Math.round(evasion(state.player) * 100);
  ctx.font = "500 11px IBM Plex Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  label(ctx, `EVADE ${evade}%`, 12, h - 8, "#9ad7ff");
  if (state.combat.enemy) {
    const ee = Math.round(evasion(state.combat.enemy) * 100);
    ctx.textAlign = "right";
    label(ctx, `EVADE ${ee}%`, w - 12, h - 8, "#ffb09a");
  }

  if (state.paused && !state.modal) {
    ctx.fillStyle = "rgba(7,8,12,0.45)";
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w / 2, h / 2, 120, "rgba(232,160,74,1)", 0.18);
    ctx.fillStyle = "#ebe6dc";
    ctx.font = "600 22px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "6px";
    ctx.fillText("PAUSED", w / 2 + 3, h / 2);
    ctx.letterSpacing = "0px";
  }
  hitState.current = { kind: "combat", nodes: [], rooms };
}
