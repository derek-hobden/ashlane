import { KIND_LABEL } from "./content.js";
import { currentNode } from "./sim.js";
import { hitState } from "./draw-geom.js";
import { glow } from "./draw-fx.js";

export function nodeColor(node) {
  if (node.kind === "store") return "#8fdb6a";
  if (node.kind === "elite" || node.kind === "exit") return "#ff5a36";
  if (node.kind === "hostile") return "#e08a62";
  if (node.kind === "nebula") return "#b9a0e8";
  if (node.kind === "distress" || node.kind === "quest") return "#7ec8e3";
  if (node.kind === "start") return "#e8a04a";
  return "#9aa0ab";
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function nodeIcon(ctx, kind, x, y, s) {
  ctx.beginPath();
  if (kind === "hostile") {
    ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
    ctx.moveTo(x - s, y);
    ctx.lineTo(x - s * 0.3, y);
    ctx.moveTo(x + s * 0.3, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y - s * 0.3);
    ctx.moveTo(x, y + s * 0.3);
    ctx.lineTo(x, y + s);
  } else if (kind === "elite") {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      const px = x + Math.cos(a) * s * 0.85;
      const py = y + Math.sin(a) * s * 0.85;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (kind === "exit") {
    ctx.moveTo(x - s * 0.7, y);
    ctx.lineTo(x + s * 0.6, y);
    ctx.moveTo(x + s * 0.1, y - s * 0.5);
    ctx.lineTo(x + s * 0.6, y);
    ctx.lineTo(x + s * 0.1, y + s * 0.5);
  } else if (kind === "store") {
    ctx.rect(x - s * 0.6, y - s * 0.2, s * 1.2, s * 0.8);
    ctx.moveTo(x - s * 0.3, y - s * 0.2);
    ctx.arc(x, y - s * 0.2, s * 0.3, Math.PI, 0);
  } else if (kind === "nebula") {
    ctx.arc(x - s * 0.35, y + s * 0.1, s * 0.35, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + s * 0.05, y - s * 0.2, s * 0.4, Math.PI, Math.PI * 1.9);
    ctx.arc(x + s * 0.45, y + s * 0.1, s * 0.3, Math.PI * 1.4, Math.PI * 0.5);
    ctx.closePath();
  } else if (kind === "distress") {
    ctx.moveTo(x, y - s * 0.7);
    ctx.lineTo(x, y + s * 0.15);
    ctx.moveTo(x, y + s * 0.5);
    ctx.lineTo(x, y + s * 0.6);
  } else if (kind === "quest") {
    ctx.moveTo(x, y - s * 0.7);
    ctx.lineTo(x + s * 0.55, y);
    ctx.lineTo(x, y + s * 0.7);
    ctx.lineTo(x - s * 0.55, y);
    ctx.closePath();
  } else if (kind === "start") {
    ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
  } else {
    ctx.arc(x, y, s * 0.18, 0, Math.PI * 2);
  }
  ctx.stroke();
}

function drawArmada(ctx, fleetX, h, time) {
  const grad = ctx.createLinearGradient(0, 0, Math.max(fleetX, 1), 0);
  grad.addColorStop(0, "rgba(255, 60, 30, 0.22)");
  grad.addColorStop(0.8, "rgba(255, 70, 40, 0.1)");
  grad.addColorStop(1, "rgba(255, 70, 40, 0.02)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, Math.max(0, fleetX), h);

  // Rising embers inside the armada's reach.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 46; i++) {
    const seed = i * 97.13;
    const x = ((seed * 7.31) % 1) * fleetX + Math.sin(time * 0.7 + seed) * 6;
    const y = h - (((time * (10 + (i % 7) * 4) + seed * 13) % (h + 20)) - 10);
    const a = 0.25 + 0.35 * Math.sin(time * 3 + seed);
    if (x < 0 || x > fleetX) continue;
    ctx.fillStyle = `rgba(255,${120 + (i % 5) * 20},60,${Math.max(0, a)})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();

  // The front: a wavering glowing edge.
  ctx.save();
  ctx.beginPath();
  for (let y = 0; y <= h; y += 6) {
    const x = fleetX + Math.sin(y * 0.05 + time * 2) * 3 + Math.sin(y * 0.13 - time * 3.1) * 1.5;
    if (y === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(255,90,54,0.22)";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,120,80,0.9)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -time * 12;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#ff6a48";
  ctx.font = "500 11px IBM Plex Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("▲ ARMADA", 10, 18);
}

export function drawMap(ctx, state, w, h, time) {
  const nodes = state.sector.nodes;
  const padX = 36;
  const padY = 30;
  const pos = new Map();
  for (const node of nodes) {
    pos.set(node.id, {
      id: node.id,
      x: padX + (node.col / 7) * (w - padX * 2),
      y: padY + (node.row / 2) * (h - padY * 2 - 10),
    });
  }

  // Nebula beacons sit in a violet haze.
  for (const node of nodes) {
    if (node.kind !== "nebula") continue;
    const p = pos.get(node.id);
    glow(ctx, p.x, p.y, 70, "rgba(150,110,230,1)", 0.28 + 0.05 * Math.sin(time + p.x));
  }

  const fleetX = padX + ((state.sector.fleetCol + 0.45) / 7) * (w - padX * 2);
  if (state.sector.fleetCol >= 0) drawArmada(ctx, fleetX, h, time);

  const current = currentNode(state);
  const linked = new Set(current?.links ?? []);
  for (const node of nodes) {
    const a = pos.get(node.id);
    for (const link of node.links) {
      const b = pos.get(link);
      if (!b) continue;
      const selected = node.id === state.selectedId || link === state.selectedId;
      const live = node.id === current?.id && linked.has(link);
      ctx.save();
      if (live || selected) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = selected ? "rgba(255,190,110,0.25)" : "rgba(232,160,74,0.14)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.strokeStyle = selected ? "rgba(255,200,130,0.95)" : "rgba(232,160,74,0.75)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 6]);
        ctx.lineDashOffset = -time * 18;
      } else {
        ctx.strokeStyle = "rgba(130,145,175,0.22)";
        ctx.lineWidth = 1;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  for (const node of nodes) {
    const p = pos.get(node.id);
    const covered = node.col <= state.sector.fleetCol;
    const color = covered ? "#ff5a36" : nodeColor(node);
    const isCur = node.id === current?.id;
    const isSel = node.id === state.selectedId;
    const reachable = linked.has(node.id);
    const r = isSel ? 15 : 12.5;

    glow(ctx, p.x, p.y, isCur || isSel ? 44 : reachable ? 34 : 26, rgba(color, 1), isCur || isSel ? 0.5 : reachable ? 0.32 : 0.16);

    if (isCur) {
      // Radar ping from where the Wren sits.
      for (let k = 0; k < 2; k++) {
        const t = (time * 0.6 + k * 0.5) % 1;
        ctx.strokeStyle = `rgba(255,240,220,${0.5 * (1 - t)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4 + t * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const disk = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.4, 1, p.x, p.y, r);
    disk.addColorStop(0, covered ? "#4a2622" : "#222a3a");
    disk.addColorStop(1, covered ? "#1e0f0e" : "#0b0f17");
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = isCur ? 2.6 : 2;
    ctx.strokeStyle = isSel ? "#fff4e4" : isCur ? "#ffe9c8" : color;
    ctx.stroke();

    if (isSel && !isCur) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,244,228,0.75)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -time * 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isCur ? "#ffe9c8" : color;
    if (isCur) {
      // The Wren, nose to the right.
      ctx.fillStyle = "#ffe9c8";
      ctx.beginPath();
      ctx.moveTo(p.x + 6, p.y);
      ctx.lineTo(p.x - 4, p.y - 4.5);
      ctx.lineTo(p.x - 2, p.y);
      ctx.lineTo(p.x - 4, p.y + 4.5);
      ctx.closePath();
      ctx.fill();
    } else nodeIcon(ctx, node.kind, p.x, p.y, 6.5);
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.lineWidth = 1;

    if (node.cleared && node.kind !== "start") {
      ctx.fillStyle = "#0b0f17";
      ctx.beginPath();
      ctx.arc(p.x + r * 0.75, p.y - r * 0.75, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8fdb6a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x + r * 0.75 - 2.5, p.y - r * 0.75);
      ctx.lineTo(p.x + r * 0.75 - 0.5, p.y - r * 0.75 + 2);
      ctx.lineTo(p.x + r * 0.75 + 2.8, p.y - r * 0.75 - 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    const label = isCur ? "YOU" : KIND_LABEL[node.kind] ?? "";
    const labelY = p.y + r + (isSel && !isCur ? 10 : 5);
    ctx.font = `${isCur || isSel ? 600 : 500} 10px IBM Plex Mono, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(5,6,10,0.85)";
    ctx.strokeText(label, p.x, labelY);
    ctx.fillStyle = isCur ? "#ffe9c8" : reachable || isSel ? "#e6e0d4" : "#9aa0ab";
    ctx.fillText(label, p.x, labelY);
    ctx.lineWidth = 1;
  }

  ctx.font = "600 12px Sora, sans-serif";
  ctx.fillStyle = "#c8c3ba";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("Cinder Reach", w - 12, 8);
  ctx.font = "500 10px IBM Plex Mono, monospace";
  ctx.fillStyle = "#e8a04a";
  ctx.fillText("SECTOR I", w - 12, 24);
  hitState.current = { kind: "map", nodes: [...pos.values()], rooms: [] };
}
