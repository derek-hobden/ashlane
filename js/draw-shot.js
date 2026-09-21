import { roomRect } from "./draw-geom.js";

export function drawProjectile(ctx, shot, state, boxes) {
  const fromShip = shot.from === "player" ? state.player : state.combat.enemy;
  const toShip = shot.from === "player" ? state.combat.enemy : state.player;
  if (!fromShip || !toShip) return;
  const fromBox = shot.from === "player" ? boxes.player : boxes.enemy;
  const toBox = shot.from === "player" ? boxes.enemy : boxes.player;
  const muzzleRoom = fromShip.rooms.find((r) => r.id === "weapons");
  const targetRoom = toShip.rooms.find((r) => r.id === shot.target) ?? toShip.rooms.find((r) => r.id === "weapons");
  const muzzle = roomRect(muzzleRoom, fromBox, fromShip.side === "enemy");
  const target = roomRect(targetRoom, toBox, toShip.side === "enemy");
  const sx = shot.from === "player" ? muzzle.x + muzzle.w : muzzle.x;
  const sy = muzzle.y + muzzle.h / 2;
  const ex = target.x + target.w / 2;
  const ey = target.y + target.h / 2;
  const x = sx + (ex - sx) * shot.dist;
  const y = sy + (ey - sy) * shot.dist;
  if (shot.kind === "missile") {
    ctx.fillStyle = "#e8a04a";
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(232,160,74,0.4)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (ex - sx) * 0.08, y - (ey - sy) * 0.08);
    ctx.stroke();
  } else if (shot.kind === "ion") {
    ctx.strokeStyle = "#d2b6ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else {
    ctx.strokeStyle = shot.from === "player" ? "#ffd7a1" : "#ff7a62";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - (ex - sx) * 0.04, y - (ey - sy) * 0.04);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}
