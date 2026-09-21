import { center, roomRect, roundRect } from "./draw-geom.js";

export function drawShip(ctx, ship, box, mirror, state) {
  ctx.save();
  roundRect(ctx, box.x - 6, box.y - 6, box.w + 12, box.h + 12, 18);
  ctx.fillStyle = "#0c1016";
  ctx.fill();
  ctx.strokeStyle = "#2a3344";
  ctx.stroke();

  const rooms = [];
  for (const room of ship.rooms) {
    const rect = roomRect(room, box, mirror);
    rooms.push({ ...rect, id: room.id, side: ship.side });
    const hurt = room.hp / room.hpMax;
    ctx.fillStyle = room.flash > 0 ? "#5a2a28" : hurt < 0.35 ? "#24181a" : "#161b24";
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
    ctx.fill();
    ctx.strokeStyle = room.system ? "#3a4458" : "#2a3140";
    ctx.stroke();
    if (room.system) {
      const barW = rect.w - 8;
      ctx.fillStyle = "#0b0d12";
      ctx.fillRect(rect.x + 4, rect.y + rect.h - 6, barW, 3);
      ctx.fillStyle = hurt > 0.6 ? "#8fdb6a" : hurt > 0.3 ? "#e8a04a" : "#ff5a36";
      ctx.fillRect(rect.x + 4, rect.y + rect.h - 6, barW * hurt, 3);
      ctx.fillStyle = "#c5c0b6";
      ctx.font = `${Math.max(10, Math.min(13, rect.h * 0.28))}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(room.system.slice(0, 3).toUpperCase(), rect.x + 5, rect.y + 4);
    }
    if (state.combat?.asb?.roomId === room.id && ship.side === "player" && state.combat.asb.warn > 0) {
      ctx.strokeStyle = `rgba(255, 90, 54, ${0.4 + 0.4 * Math.sin(state.clock * 14)})`;
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 4);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  for (const crew of ship.crew) {
    if (crew.hp <= 0) continue;
    const roomObj = ship.rooms.find((r) => r.id === crew.room);
    if (!roomObj) continue;
    const a = roomRect(roomObj, box, mirror);
    let pos = center(a);
    if (crew.path?.length) {
      const b = roomRect(ship.rooms.find((r) => r.id === crew.path[0]), box, mirror);
      const t = Math.min(1, crew.hop / 0.42);
      const pb = center(b);
      pos = { x: pos.x + (pb.x - pos.x) * t, y: pos.y + (pb.y - pos.y) * t };
    }
    const idx = ship.crew.filter((c) => c.room === crew.room).indexOf(crew);
    pos.x += (idx - 0.5) * 10;
    ctx.beginPath();
    ctx.fillStyle = crew.color;
    ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
    ctx.fill();
    if (state.selectedCrew === crew.id) {
      ctx.strokeStyle = "#fff6e8";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "#14120e";
    ctx.font = "9px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(crew.name.slice(0, 1), pos.x, pos.y + 0.5);
  }

  for (const boarder of ship.boarders ?? []) {
    const rect = roomRect(ship.rooms.find((r) => r.id === boarder.room), box, mirror);
    const p = center(rect);
    ctx.fillStyle = "#ff5a36";
    ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
    ctx.fillStyle = "#2a0d0a";
    ctx.fillRect(p.x - 6, p.y + 4, 12 * (boarder.hp / boarder.hpMax), 2);
  }

  const bubbles = ship.shieldBubbles ?? 0;
  if (bubbles > 0) {
    ctx.strokeStyle = ship.ionT > 0 ? "rgba(190, 150, 255, 0.85)" : "rgba(90, 210, 255, 0.8)";
    ctx.lineWidth = 2;
    for (let i = 0; i < bubbles; i++) {
      ctx.beginPath();
      ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w * 0.46 + i * 5, box.h * 0.48 + i * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  ctx.fillStyle = "#ebe6dc";
  ctx.font = "12px Sora, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(ship.name, box.x, box.y - 8);
  const hullRatio = Math.max(0, ship.hull / ship.hullMax);
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(box.x + 70, box.y - 16, box.w - 74, 5);
  ctx.fillStyle = hullRatio > 0.4 ? "#8fdb6a" : "#ff5a36";
  ctx.fillRect(box.x + 70, box.y - 16, (box.w - 74) * hullRatio, 5);

  ctx.restore();
  return rooms;
}

