import { evasion } from "./sim.js";
import { hitState, roomRect, shipLayout } from "./draw-geom.js";
import { drawShip } from "./draw-ship.js";
import { drawProjectile } from "./draw-shot.js";

export function drawCombat(ctx, state, w, h) {
  const boxes = shipLayout(w, h);
  const rooms = drawShip(ctx, state.player, boxes.player, false, state);
  if (state.combat.enemy) rooms.push(...drawShip(ctx, state.combat.enemy, boxes.enemy, true, state));
  else {
    ctx.fillStyle = "#ff5a36";
    ctx.font = "16px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ARMADA BATTERY", boxes.enemy.x + boxes.enemy.w / 2, h / 2);
  }
  for (const shot of state.combat.projectiles) drawProjectile(ctx, shot, state, boxes);
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  for (const flo of state.combat.floats) {
    const box = flo.side === "player" ? boxes.player : boxes.enemy;
    const ship = flo.side === "player" ? state.player : state.combat.enemy;
    if (!ship) continue;
    const room = ship.rooms.find((r) => r.id === flo.room) ?? ship.rooms[0];
    const rect = roomRect(room, box, ship.side === "enemy");
    ctx.globalAlpha = Math.max(0, flo.life);
    ctx.fillStyle = flo.text === "block" || flo.text === "evade" ? "#9ad7ff" : "#ffe1c4";
    ctx.fillText(flo.text, rect.x + rect.w / 2, rect.y - 2);
    ctx.globalAlpha = 1;
  }
  if (state.paused && !state.modal) {
    ctx.fillStyle = "rgba(7,8,12,0.35)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ebe6dc";
    ctx.font = "20px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", w / 2, h / 2);
  }
  const evade = Math.round(evasion(state.player) * 100);
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillStyle = "#9aa0ab";
  ctx.textAlign = "left";
  ctx.fillText(`EVADE ${evade}%`, 12, h - 8);
  if (state.combat.enemy) {
    const ee = Math.round(evasion(state.combat.enemy) * 100);
    ctx.textAlign = "right";
    ctx.fillText(`EVADE ${ee}%`, w - 12, h - 8);
  }
  hitState.current = { kind: "combat", nodes: [], rooms };
}
