import { DESIGN_W } from "./content.js";
import { center, roomRect, roundRect } from "./draw-geom.js";
import { glow, spawnSparks } from "./draw-fx.js";
import { drawBoarder, drawPerson } from "./draw-people.js";

// Hull outline in design units (rooms span x 16–244, y 16–182). The nose points +x; enemies mirror it.
const HULL = [
  [0, 50], [16, 30], [58, 6], [150, 2], [214, 6], [248, 38], [270, 100],
  [248, 162], [214, 194], [150, 198], [58, 194], [16, 170], [0, 150],
];
const NACELLES = [
  { x: -14, y: 54, w: 26, h: 30 },
  { x: -14, y: 116, w: 26, h: 30 },
];

const PALETTE = {
  player: { hullTop: "#2b3446", hullBot: "#10151e", edge: "#56647e", trim: "#e8a04a", plume: "rgba(255,170,90,1)", core: "rgba(255,236,200,1)" },
  enemy: { hullTop: "#3a2226", hullBot: "#150c0e", edge: "#7a4440", trim: "#ff5a36", plume: "rgba(255,90,60,1)", core: "rgba(255,210,190,1)" },
};

function mapper(box, mirror) {
  const sx = box.w / DESIGN_W;
  const sy = box.h / 200;
  return (dx, dy) => ({ x: box.x + (mirror ? box.w - dx * sx : dx * sx), y: box.y + dy * sy });
}

function hullPath(ctx, P, inset = 0) {
  ctx.beginPath();
  HULL.forEach(([dx, dy], i) => {
    const cx = 135;
    const cy = 100;
    const p = P(dx + (cx - dx) * inset, dy + (cy - dy) * inset);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

function drawHullLive(ctx, ship, box, mirror, time) {
  const P = mapper(box, mirror);
  const pal = PALETTE[ship.side] ?? PALETTE.player;
  const sx = box.w / DESIGN_W;
  const engRoom = ship.rooms.find((r) => r.id === "engines");
  const enginePower = ship.systems?.engines?.power ?? 1;
  const thrust = engRoom && engRoom.hp > 0 ? Math.min(1, 0.35 + enginePower * 0.22) : 0.08;

  // Engine plumes behind the nacelles.
  for (const n of NACELLES) {
    const tail = P(n.x, n.y + n.h / 2);
    const dir = mirror ? 1 : -1;
    const flick = 0.85 + 0.15 * Math.sin(time * 38 + n.y) + 0.08 * Math.sin(time * 17);
    const len = (26 + 18 * thrust) * sx * flick;
    const half = n.h * 0.32 * (box.h / 200);
    const grad = ctx.createLinearGradient(tail.x, tail.y, tail.x + dir * len, tail.y);
    grad.addColorStop(0, pal.core.replace(/[\d.]+\)$/, `${0.9 * thrust})`));
    grad.addColorStop(0.3, pal.plume.replace(/[\d.]+\)$/, `${0.55 * thrust})`));
    grad.addColorStop(1, pal.plume.replace(/[\d.]+\)$/, "0)"));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y - half);
    ctx.quadraticCurveTo(tail.x + dir * len * 0.45, tail.y - half * 0.7, tail.x + dir * len, tail.y);
    ctx.quadraticCurveTo(tail.x + dir * len * 0.45, tail.y + half * 0.7, tail.x, tail.y + half);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    glow(ctx, tail.x, tail.y, 22 * sx * (0.6 + thrust), pal.plume.replace(/[\d.]+\)$/, "0.9)"), 0.8 * thrust);
    ctx.fillStyle = pal.trim;
    ctx.globalAlpha = 0.35 + thrust * 0.5;
    ctx.fillRect(tail.x - 1.5, tail.y - (n.h * 0.25 * box.h) / 200, 3, (n.h * 0.5 * box.h) / 200);
    ctx.globalAlpha = 1;
  }
}

function drawNavLights(ctx, ship, box, mirror, time) {
  const P = mapper(box, mirror);
  const blink = (Math.sin(time * 3 + (ship.side === "enemy" ? 1.7 : 0)) + 1) / 2;
  const nose = P(262, 100);
  glow(ctx, nose.x, nose.y, 10, ship.side === "enemy" ? "rgba(255,80,60,1)" : "rgba(140,230,120,1)", 0.4 + blink * 0.6);
  const tip = P(214, 8);
  glow(ctx, tip.x, tip.y, 8, "rgba(255,240,220,1)", blink > 0.92 ? 1 : 0.15);
}

function paintHull(ctx, ship, box, mirror) {
  const P = mapper(box, mirror);
  const pal = PALETTE[ship.side] ?? PALETTE.player;
  const sx = box.w / DESIGN_W;

  for (const n of NACELLES) {
    const a = P(n.x, n.y);
    const b = P(n.x + n.w, n.y + n.h);
    const x = Math.min(a.x, b.x);
    const w = Math.abs(b.x - a.x);
    const grad = ctx.createLinearGradient(0, a.y, 0, b.y);
    grad.addColorStop(0, pal.hullTop);
    grad.addColorStop(1, pal.hullBot);
    roundRect(ctx, x, a.y, w, b.y - a.y, 5 * sx);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = pal.edge;
    ctx.stroke();
  }

  // Drop shadow from offset copies, then the top-lit metal body.
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (const off of [10, 6, 3]) {
    ctx.translate(0, off);
    hullPath(ctx, P, -0.02);
    ctx.fill();
    ctx.translate(0, -off);
  }
  ctx.restore();
  hullPath(ctx, P);
  const top = P(135, 0);
  const bot = P(135, 200);
  const grad = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
  grad.addColorStop(0, pal.hullTop);
  grad.addColorStop(0.55, pal.hullBot);
  grad.addColorStop(1, "#07090d");
  ctx.fillStyle = grad;
  ctx.fill();

  // Plating seams and rim light.
  ctx.save();
  hullPath(ctx, P);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let dx = 20; dx < 270; dx += 22) {
    const a = P(dx, 0);
    const b = P(dx + 6, 200);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const sheen = ctx.createLinearGradient(top.x, top.y, top.x, top.y + box.h * 0.35);
  sheen.addColorStop(0, "rgba(255,255,255,0.08)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(box.x - 40, box.y - 10, box.w + 80, box.h * 0.4);
  ctx.restore();

  hullPath(ctx, P);
  ctx.strokeStyle = pal.edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  hullPath(ctx, P, 0.04);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Accent stripe down the spine.
  const s1 = P(40, 12);
  const s2 = P(206, 12);
  ctx.strokeStyle = pal.trim;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function drawIcon(ctx, system, cx, cy, s) {
  ctx.beginPath();
  if (system === "shields") {
    ctx.moveTo(cx, cy - s);
    ctx.quadraticCurveTo(cx + s, cy - s * 0.7, cx + s * 0.85, cy);
    ctx.quadraticCurveTo(cx + s * 0.6, cy + s * 0.8, cx, cy + s);
    ctx.quadraticCurveTo(cx - s * 0.6, cy + s * 0.8, cx - s * 0.85, cy);
    ctx.quadraticCurveTo(cx - s, cy - s * 0.7, cx, cy - s);
  } else if (system === "engines") {
    for (const o of [-0.45, 0.25]) {
      ctx.moveTo(cx - s * 0.5, cy + (o - 0.35) * s);
      ctx.lineTo(cx + s * 0.5, cy + (o + 0.1) * s);
      ctx.lineTo(cx - s * 0.5, cy + (o + 0.55) * s);
    }
  } else if (system === "weapons") {
    ctx.arc(cx, cy, s * 0.62, 0, Math.PI * 2);
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx, cy + s);
  } else if (system === "medbay") {
    const t = s * 0.3;
    ctx.rect(cx - t, cy - s * 0.85, t * 2, s * 1.7);
    ctx.rect(cx - s * 0.85, cy - t, s * 1.7, t * 2);
  } else if (system === "oxygen") {
    ctx.arc(cx - s * 0.3, cy + s * 0.15, s * 0.55, 0, Math.PI * 2);
    ctx.moveTo(cx + s * 0.85, cy - s * 0.45);
    ctx.arc(cx + s * 0.55, cy - s * 0.45, s * 0.3, 0, Math.PI * 2);
  } else if (system === "helm") {
    ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2);
    ctx.moveTo(cx + s * 0.2, cy);
    ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(a) * s * 0.2, cy + Math.sin(a) * s * 0.2);
      ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
    }
  } else {
    ctx.rect(cx - s * 0.7, cy - s * 0.5, s * 1.4, s);
    ctx.moveTo(cx - s * 0.7, cy);
    ctx.lineTo(cx + s * 0.7, cy);
  }
  ctx.stroke();
}

function roomFloor(ctx, rect, top, bottom) {
  const floor = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  floor.addColorStop(0, top);
  floor.addColorStop(1, bottom);
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
  ctx.fillStyle = floor;
  ctx.fill();
}

function roomIcon(ctx, room, rect, stroke) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  drawIcon(ctx, room.system, rect.x + rect.w / 2, rect.y + rect.h / 2 + 2, Math.min(rect.w, rect.h) * 0.26);
  ctx.lineWidth = 1;
}

/** The undamaged look of a room: floor, deck tiles, system icon, top light, border. Cached with the hull. */
function paintRoom(ctx, ship, room, rect) {
  const enemy = ship.side === "enemy";
  roomFloor(ctx, rect, enemy ? "#221a1f" : "#1b2331", enemy ? "#140f13" : "#11161f");
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
  ctx.clip();
  ctx.strokeStyle = "rgba(160,180,210,0.05)";
  ctx.beginPath();
  const tile = Math.max(8, rect.h / 5);
  for (let x = rect.x + tile; x < rect.x + rect.w; x += tile) {
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.h);
  }
  for (let y = rect.y + tile; y < rect.y + rect.h; y += tile) {
    ctx.moveTo(rect.x, y);
    ctx.lineTo(rect.x + rect.w, y);
  }
  ctx.stroke();
  if (room.system) roomIcon(ctx, room, rect, enemy ? "rgba(255,160,140,0.12)" : "rgba(170,210,255,0.13)");
  const lip = ctx.createLinearGradient(0, rect.y, 0, rect.y + 10);
  lip.addColorStop(0, "rgba(255,255,255,0.07)");
  lip.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = lip;
  ctx.fillRect(rect.x, rect.y, rect.w, 10);
  ctx.restore();
  roundRect(ctx, rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1, 4);
  ctx.strokeStyle = room.system ? (enemy ? "#5a3a3e" : "#41506a") : enemy ? "#3a2a2e" : "#2c3546";
  ctx.stroke();
}

/** Everything about a room that changes in a fight, drawn over the cached base each frame. */
function drawRoomLive(ctx, ship, room, rect, state, time, dt) {
  const hurt = room.hp / room.hpMax;
  const dead = room.system && room.hp <= 0;

  if (dead) {
    roomFloor(ctx, rect, "#1d1112", "#120a0b");
    ctx.save();
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
    ctx.clip();
    roomIcon(ctx, room, rect, "rgba(255,90,54,0.2)");
    // Hazard stripes over a destroyed system.
    ctx.strokeStyle = "rgba(255,90,54,0.12)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = rect.x - rect.h; x < rect.x + rect.w; x += 14) {
      ctx.moveTo(x, rect.y + rect.h);
      ctx.lineTo(x + rect.h, rect.y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.restore();
    roundRect(ctx, rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1, 4);
    ctx.strokeStyle = "#6a2f2a";
    ctx.stroke();
  }
  if (room.system && hurt < 0.35) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 6 + rect.x);
    glow(ctx, rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.6, "rgba(255,70,40,1)", 0.25 + pulse * 0.35);
    if (Math.random() < dt * 2.5) {
      spawnSparks(rect.x + Math.random() * rect.w, rect.y + Math.random() * rect.h, 4, { speed: 60, angle: -Math.PI / 2, spread: 0.8 });
    }
  }
  if (room.flash > 0) {
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
    ctx.fillStyle = `rgba(255,190,140,${Math.min(0.55, room.flash * 2.4)})`;
    ctx.fill();
  }

  if (room.system) {
    const barW = rect.w - 10;
    const bx = rect.x + 5;
    const by = rect.y + rect.h - 7;
    roundRect(ctx, bx, by, barW, 3.5, 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    const col = hurt > 0.6 ? "#8fdb6a" : hurt > 0.3 ? "#e8a04a" : "#ff5a36";
    if (hurt > 0) {
      roundRect(ctx, bx, by, Math.max(3.5, barW * hurt), 3.5, 2);
      ctx.fillStyle = col;
      ctx.fill();
    }
    ctx.fillStyle = dead ? "#ff8a70" : "#d6d0c4";
    ctx.font = `500 ${Math.max(10, Math.min(12, rect.h * 0.24))}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(room.system.slice(0, 3).toUpperCase(), rect.x + 6, rect.y + 5);
  }
  if (state.combat?.asb?.roomId === room.id && ship.side === "player" && state.combat.asb.warn > 0) {
    const a = 0.45 + 0.4 * Math.sin(state.clock * 14);
    ctx.strokeStyle = `rgba(255, 90, 54, ${a})`;
    ctx.lineWidth = 3;
    roundRect(ctx, rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3, 4);
    ctx.stroke();
    ctx.lineWidth = 1;
    glow(ctx, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.6, "rgba(255,80,50,1)", a * 0.35);
  }
}

function drawDoors(ctx, ship, box, mirror) {
  const seen = new Set();
  ctx.fillStyle = "#c79a5c";
  for (const room of ship.rooms) {
    for (const id of room.doors ?? []) {
      const key = [room.id, id].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const other = ship.rooms.find((r) => r.id === id);
      if (!other) continue;
      const a = roomRect(room, box, mirror);
      const b = roomRect(other, box, mirror);
      const ox0 = Math.max(a.x, b.x);
      const ox1 = Math.min(a.x + a.w, b.x + b.w);
      const oy0 = Math.max(a.y, b.y);
      const oy1 = Math.min(a.y + a.h, b.y + b.h);
      ctx.globalAlpha = 0.75;
      if (ox1 - ox0 > oy1 - oy0) {
        // Stacked rooms: a horizontal door in the gap between them.
        const gy = a.y < b.y ? (a.y + a.h + b.y) / 2 : (b.y + b.h + a.y) / 2;
        const cx = (ox0 + ox1) / 2;
        ctx.fillRect(cx - 7, gy - 1.5, 14, 3);
      } else {
        const gx = a.x < b.x ? (a.x + a.w + b.x) / 2 : (b.x + b.w + a.x) / 2;
        const cy = (oy0 + oy1) / 2;
        ctx.fillRect(gx - 1.5, cy - 7, 3, 14);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function crewSlot(idx, n) {
  return n < 2 ? -9 : (idx - (n - 1) / 2) * 18;
}

function drawCrew(ctx, ship, box, mirror, state, time) {
  const ahead = ship.side === "enemy" ? -1 : 1;
  const people = [];
  ship.crew.forEach((crew, i) => {
    if (crew.hp <= 0) return;
    const roomObj = ship.rooms.find((r) => r.id === crew.room);
    if (!roomObj) return;
    const a = roomRect(roomObj, box, mirror);
    let pos = center(a);
    let face = ahead;
    const walking = crew.path?.length > 0;
    if (walking) {
      const b = roomRect(ship.rooms.find((r) => r.id === crew.path[0]), box, mirror);
      const t = Math.min(1, crew.hop / 0.42);
      const pb = center(b);
      if (Math.abs(pb.x - pos.x) > 2) face = Math.sign(pb.x - pos.x);
      pos = { x: pos.x + (pb.x - pos.x) * t, y: pos.y + (pb.y - pos.y) * t };
    }
    const mates = ship.crew.filter((c) => c.room === crew.room && c.hp > 0);
    const slot = crewSlot(mates.indexOf(crew), mates.length);
    pos.x += slot;
    // Standing at a station: turn toward the console in the middle of the room.
    const work = !walking && !!roomObj.system && roomObj.hp > 0;
    if (work && Math.abs(slot) > 1) face = -Math.sign(slot);
    people.push({
      y: pos.y + 10,
      draw: () => drawPerson(ctx, pos.x, pos.y + 10, {
        id: crew.id,
        color: crew.color,
        name: crew.name,
        face,
        walk: walking ? time * 17 + i : null,
        work,
        selected: state.selectedCrew === crew.id,
        hp: crew.hp,
        hpMax: crew.hpMax,
        enemy: ship.side === "enemy",
        time,
      }),
    });
  });

  const boarders = ship.boarders ?? [];
  boarders.forEach((boarder, i) => {
    const room = ship.rooms.find((r) => r.id === boarder.room);
    if (!room) return;
    const p = center(roomRect(room, box, mirror));
    const k = boarders.filter((o) => o.room === boarder.room).indexOf(boarder);
    const x = p.x + 16 + k * 16;
    people.push({
      y: p.y + 11,
      draw: () => drawBoarder(ctx, x, p.y + 11, { face: -ahead, hp: boarder.hp, hpMax: boarder.hpMax, time, seed: i * 1.7 }),
    });
  });

  // Paint back to front so figures lower on screen overlap those behind.
  people.sort((m, n) => m.y - n.y);
  for (const person of people) person.draw();
}

export function shieldGeometry(box) {
  return { cx: box.x + box.w / 2 + box.w * 0.02, cy: box.y + box.h / 2 + 2, rx: box.w * 0.58, ry: box.h * 0.56 };
}

function drawShields(ctx, ship, box, time) {
  const bubbles = ship.shieldBubbles ?? 0;
  if (bubbles <= 0) return;
  const ion = ship.ionT > 0;
  const rgb = ion ? "190,150,255" : "90,210,255";
  const g = shieldGeometry(box);
  ctx.save();
  for (let i = 0; i < bubbles; i++) {
    const rx = g.rx + i * 6;
    const ry = g.ry + i * 5;
    ctx.save();
    ctx.translate(g.cx, g.cy);
    ctx.scale(1, ry / rx);
    const fill = ctx.createRadialGradient(0, 0, rx * 0.72, 0, 0, rx);
    fill.addColorStop(0, `rgba(${rgb},0)`);
    fill.addColorStop(0.85, `rgba(${rgb},${0.05 + 0.02 * i})`);
    fill.addColorStop(1, `rgba(${rgb},0.16)`);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const pulse = 0.55 + 0.25 * Math.sin(time * 2.2 + i * 1.3);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${rgb},${0.18 * pulse})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(g.cx, g.cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},${0.75 * pulse})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // A travelling shimmer arc.
    const start = time * (0.9 + i * 0.3) + i * 2;
    ctx.strokeStyle = `rgba(230,250,255,${0.55 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(g.cx, g.cy, rx, ry, 0, start, start + 0.7);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
  ctx.lineWidth = 1;
}

function drawPlate(ctx, ship, box, mirror) {
  const hullRatio = Math.max(0, ship.hull / ship.hullMax);
  const enemy = ship.side === "enemy";
  ctx.font = "600 12px Sora, sans-serif";
  const nameW = ctx.measureText(ship.name).width;
  const barW = Math.min(150, box.w - nameW - 24);
  const plateW = nameW + barW + 26;
  const px = mirror ? box.x + box.w - plateW : box.x;
  const py = box.y - 30;
  roundRect(ctx, px, py, plateW, 20, 10);
  ctx.fillStyle = "rgba(8,10,15,0.72)";
  ctx.fill();
  ctx.strokeStyle = enemy ? "rgba(255,90,54,0.35)" : "rgba(232,160,74,0.35)";
  ctx.stroke();
  ctx.fillStyle = "#ebe6dc";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(ship.name, px + 10, py + 10.5);
  const bx = px + nameW + 18;
  const segs = Math.max(1, ship.hullMax);
  const segW = barW / segs;
  const lit = Math.ceil(hullRatio * segs - 1e-6);
  const col = hullRatio > 0.5 ? "#8fdb6a" : hullRatio > 0.25 ? "#e8a04a" : "#ff5a36";
  for (let i = 0; i < segs; i++) {
    ctx.fillStyle = i < lit ? col : "rgba(255,255,255,0.08)";
    ctx.fillRect(bx + i * segW, py + 6, Math.max(1, segW - (segW > 3 ? 1 : 0.4)), 8);
  }
  if (lit > 0) glow(ctx, bx + (lit * segW) / 2, py + 10, Math.min(60, lit * segW * 0.6), col === "#8fdb6a" ? "rgba(140,220,110,1)" : "rgba(255,110,60,1)", 0.18);
}

const baseCache = new Map();

/** Hull, nacelles, room floors, and doors only change with layout size, so they are painted once to an offscreen canvas. */
function shipBase(ship, box, mirror, dpr) {
  const key = `${ship.side}:${mirror}:${box.w.toFixed(1)}x${box.h.toFixed(1)}@${dpr}`;
  let entry = baseCache.get(key);
  if (entry) return entry;
  const m = Math.ceil(Math.max(28, box.w * 0.12));
  const c = document.createElement("canvas");
  c.width = Math.ceil((box.w + m * 2) * dpr);
  c.height = Math.ceil((box.h + m * 2) * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const local = { x: m, y: m, w: box.w, h: box.h };
  paintHull(g, ship, local, mirror);
  for (const room of ship.rooms) paintRoom(g, ship, room, roomRect(room, local, mirror));
  drawDoors(g, ship, local, mirror);
  if (baseCache.size > 8) baseCache.clear();
  entry = { canvas: c, m };
  baseCache.set(key, entry);
  return entry;
}

export function drawShip(ctx, ship, box, mirror, state, time = 0, dt = 0) {
  ctx.save();
  const dpr = ctx.getTransform().a || 1;
  drawHullLive(ctx, ship, box, mirror, time);
  const base = shipBase(ship, box, mirror, dpr);
  ctx.drawImage(base.canvas, box.x - base.m, box.y - base.m, base.canvas.width / dpr, base.canvas.height / dpr);
  drawNavLights(ctx, ship, box, mirror, time);

  const rooms = [];
  for (const room of ship.rooms) {
    const rect = roomRect(room, box, mirror);
    rooms.push({ ...rect, id: room.id, side: ship.side });
    drawRoomLive(ctx, ship, room, rect, state, time, dt);
  }
  drawCrew(ctx, ship, box, mirror, state, time);
  drawShields(ctx, ship, box, time);
  drawPlate(ctx, ship, box, mirror);
  ctx.restore();
  return rooms;
}
