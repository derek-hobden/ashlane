import { DESIGN_H, DESIGN_W } from "./content.js";

export const hitState = { current: { kind: "none", nodes: [], rooms: [] } };

const stars = Array.from({ length: 90 }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: 0.3 + Math.random() * 0.7,
  r: Math.random() < 0.08 ? 1.6 : 0.8,
}));


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
  const gap = Math.min(110, Math.max(48, w * 0.08));
  let shipH = Math.min(240, h - 18);
  let shipW = shipH * (DESIGN_W / DESIGN_H);
  const maxW = (w - gap - 20) / 2;
  if (shipW > maxW) {
    shipW = maxW;
    shipH = shipW * (DESIGN_H / DESIGN_W);
  }
  const y = Math.max(8, (h - shipH) / 2);
  return {
    player: { x: 10, y, w: shipW, h: shipH },
    enemy: { x: w - 10 - shipW, y, w: shipW, h: shipH },
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

export function drawStars(ctx, w, h, time) {
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, w, h);
  for (const star of stars) {
    const drift = (star.x + time * 0.004 * star.z) % 1;
    const x = drift * w;
    const y = star.y * h;
    ctx.globalAlpha = 0.25 + star.z * 0.6;
    ctx.fillStyle = star.z > 0.85 ? "#f2efe6" : "#9aa4b8";
    ctx.fillRect(x, y, star.r, star.r);
  }
  ctx.globalAlpha = 1;
}
