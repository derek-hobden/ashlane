import { KIND_LABEL } from "./content.js";
import { currentNode } from "./sim.js";
import { hitState } from "./draw-geom.js";

export function nodeColor(node) {
  if (node.kind === "store") return "#8fdb6a";
  if (node.kind === "elite" || node.kind === "exit") return "#ff5a36";
  if (node.kind === "hostile") return "#e08a62";
  if (node.kind === "nebula") return "#b9a0e8";
  if (node.kind === "distress" || node.kind === "quest") return "#7ec8e3";
  if (node.kind === "start") return "#e8a04a";
  return "#9aa0ab";
}


export function drawMap(ctx, state, w, h, time) {
  const nodes = state.sector.nodes;
  const padX = 32;
  const padY = 28;
  const pos = new Map();
  for (const node of nodes) {
    pos.set(node.id, {
      id: node.id,
      x: padX + (node.col / 7) * (w - padX * 2),
      y: padY + (node.row / 2) * (h - padY * 2),
    });
  }
  const fleetX = padX + ((state.sector.fleetCol + 0.45) / 7) * (w - padX * 2);
  if (state.sector.fleetCol >= 0) {
    const grad = ctx.createLinearGradient(0, 0, Math.max(fleetX, 1), 0);
    grad.addColorStop(0, "rgba(255, 70, 40, 0.18)");
    grad.addColorStop(1, "rgba(255, 70, 40, 0.02)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Math.max(0, fleetX), h);
    ctx.strokeStyle = "rgba(255, 90, 54, 0.85)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(fleetX, 10);
    ctx.lineTo(fleetX, h - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ff5a36";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText("ARMADA", 10, 16);
  }

  const current = currentNode(state);
  const linked = new Set(current?.links ?? []);
  for (const node of nodes) {
    const a = pos.get(node.id);
    for (const link of node.links) {
      const b = pos.get(link);
      if (!b) continue;
      ctx.strokeStyle = node.id === state.selectedId || link === state.selectedId ? "rgba(232,160,74,0.85)" : "rgba(120,130,150,0.45)";
      ctx.lineWidth = node.id === current?.id && linked.has(link) ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 1;

  for (const node of nodes) {
    const p = pos.get(node.id);
    const covered = node.col <= state.sector.fleetCol;
    ctx.beginPath();
    ctx.fillStyle = covered ? "#3a2422" : "#121722";
    ctx.arc(p.x, p.y, node.id === state.selectedId ? 16 : 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = node.id === current?.id ? 3 : 2;
    ctx.strokeStyle = nodeColor(node);
    if (node.id === state.selectedId) ctx.strokeStyle = "#fff4e4";
    ctx.stroke();
    ctx.lineWidth = 1;
    if (node.cleared && node.kind !== "start") {
      ctx.fillStyle = "#8fdb6a";
      ctx.fillRect(p.x - 3, p.y - 1, 6, 2);
    }
    ctx.fillStyle = "#c8c3ba";
    ctx.font = "10px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const label = node.id === current?.id ? "YOU" : KIND_LABEL[node.kind] ?? "";
    ctx.fillText(label, p.x, p.y + 16);
  }

  ctx.font = "12px Sora, sans-serif";
  ctx.fillStyle = "#9aa0ab";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("Cinder Reach  ·  Sector I", w - 12, 8);
  hitState.current = { kind: "map", nodes: [...pos.values()], rooms: [] };
}
