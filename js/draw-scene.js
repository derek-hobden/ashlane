import { drawStars, hitState } from "./draw-geom.js";
import { drawCombat } from "./draw-combat.js";
import { drawMap } from "./draw-map.js";

export function draw(canvas, state, time) {
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const bw = Math.max(1, Math.floor(w * dpr));
  const bh = Math.max(1, Math.floor(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawStars(ctx, w, h, time);
  if (!state || state.screen === "title" || state.screen === "gameover" || state.screen === "victory") {
    hitState.current = { kind: "none", nodes: [], rooms: [] };
    ctx.fillStyle = "#e8a04a";
    ctx.font = "28px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!state || state.screen === "title") {
      ctx.fillText("ASHLANE", w / 2, h * 0.42);
      ctx.fillStyle = "#9aa0ab";
      ctx.font = "14px Sora, sans-serif";
      ctx.fillText("Sector I  ·  The Cinder Reach", w / 2, h * 0.42 + 28);
    }
    return;
  }
  const shake = state.combat?.shake ?? 0;
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake * 14, (Math.random() - 0.5) * shake * 10);
  }
  if (state.screen === "combat" && state.combat) drawCombat(ctx, state, w, h);
  else drawMap(ctx, state, w, h, time);
}
