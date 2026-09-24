import { DESIGN_H, DESIGN_W } from "./content.js";

export const hitState = { current: { kind: "none", nodes: [], rooms: [] } };

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function shipLayout(w, h) {
  // Leave room above each ship for its name plate and around it for hull, engines, and shields.
  const gap = Math.min(120, Math.max(56, w * 0.09));
  let shipH = Math.min(230, h - 52);
  let shipW = shipH * (DESIGN_W / DESIGN_H);
  const maxW = (w - gap - 64) / 2;
  if (shipW > maxW) {
    shipW = maxW;
    shipH = shipW * (DESIGN_H / DESIGN_W);
  }
  const y = Math.max(32, (h - shipH) / 2 + 10);
  return {
    player: { x: 32, y, w: shipW, h: shipH },
    enemy: { x: w - 32 - shipW, y, w: shipW, h: shipH },
  };
}

export function roomRect(room, box, mirror) {
  const sx = box.w / DESIGN_W;
  const sy = box.h / DESIGN_H;
  let x = room.x * sx;
  const y = room.y * sy;
  const rw = room.w * sx;
  const rh = room.h * sy;
  if (mirror) x = box.w - x - rw;
  return { x: box.x + x, y: box.y + y, w: rw, h: rh };
}

export function center(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function hitTest(x, y) {
  if (hitState.current.kind === "map") {
    let best = null;
    let bestD = 30;
    for (const node of hitState.current.nodes) {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < bestD) {
        best = node;
        bestD = d;
      }
    }
    return best ? { type: "node", id: best.id } : null;
  }
  if (hitState.current.kind === "combat") {
    for (const room of hitState.current.rooms) {
      if (x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h) {
        return { type: "room", side: room.side, id: room.id };
      }
    }
  }
  return null;
}
