import { hitState } from "./draw-geom.js";
import { currentNode } from "./sim.js";
import { drawBackdrop, drawVignette } from "./draw-bg.js";
import { clearFx, glow } from "./draw-fx.js";
import { drawCombat } from "./draw-combat.js";
import { drawMap } from "./draw-map.js";

let lastTime = 0;
let lastScreen = "";

function drawPlanet(ctx, w, h, time) {
  const r = Math.max(w, h) * 0.55;
  const cx = w * 0.78;
  const cy = h + r * 0.62;
  const atmo = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.12);
  atmo.addColorStop(0, "rgba(255,120,60,0.35)");
  atmo.addColorStop(1, "rgba(255,120,60,0)");
  ctx.fillStyle = atmo;
  ctx.fillRect(0, 0, w, h);
  const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.9, r * 0.1, cx, cy, r);
  body.addColorStop(0, "#3a2016");
  body.addColorStop(0.5, "#1a0f0c");
  body.addColorStop(1, "#070506");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,150,90,0.06)";
  ctx.lineWidth = 10;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(cx + Math.sin(time * 0.05 + i) * 20, cy, r * (0.5 + i * 0.1), r * 0.92, 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 1;
}

function drawWrenSilhouette(ctx, x, y, s, time) {
  const flick = 0.85 + 0.15 * Math.sin(time * 30);
  glow(ctx, x - 30 * s, y, 26 * s * flick, "rgba(255,170,90,1)", 0.9);
  const plume = ctx.createLinearGradient(x - 26 * s, y, x - 70 * s, y);
  plume.addColorStop(0, "rgba(255,220,170,0.8)");
  plume.addColorStop(1, "rgba(255,120,60,0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = plume;
  ctx.beginPath();
  ctx.moveTo(x - 26 * s, y - 4 * s);
  ctx.quadraticCurveTo(x - 50 * s, y - 2 * s, x - 70 * s * flick, y);
  ctx.quadraticCurveTo(x - 50 * s, y + 2 * s, x - 26 * s, y + 4 * s);
  ctx.fill();
  ctx.restore();
  const grad = ctx.createLinearGradient(x, y - 12 * s, x, y + 12 * s);
  grad.addColorStop(0, "#3a4458");
  grad.addColorStop(1, "#0c1016");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#5a6882";
  ctx.beginPath();
  ctx.moveTo(x + 34 * s, y);
  ctx.lineTo(x + 14 * s, y - 8 * s);
  ctx.lineTo(x - 18 * s, y - 11 * s);
  ctx.lineTo(x - 28 * s, y - 5 * s);
  ctx.lineTo(x - 28 * s, y + 5 * s);
  ctx.lineTo(x - 18 * s, y + 11 * s);
  ctx.lineTo(x + 14 * s, y + 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(232,160,74,0.7)";
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, y - 7 * s);
  ctx.lineTo(x + 14 * s, y - 5 * s);
  ctx.stroke();
  glow(ctx, x + 32 * s, y, 6 * s, "rgba(140,230,120,1)", 0.5 + 0.5 * Math.sin(time * 3));
}

function drawTitle(ctx, state, w, h, time) {
  drawPlanet(ctx, w, h, time);
  // Game-over and victory sheets carry their own text; they get the planet only.
  if (state && state.screen !== "title") return;
  const cy = h * 0.4;
  const drift = Math.sin(time * 0.6) * 4;
  drawWrenSilhouette(ctx, w * 0.5 + Math.sin(time * 0.25) * 30, h * 0.17 + drift, Math.max(1, h / 420), time);
  glow(ctx, w / 2, cy, 170, "rgba(232,160,74,1)", 0.28);
  ctx.save();
  ctx.font = "600 38px Sora, sans-serif";
  ctx.letterSpacing = "12px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const grad = ctx.createLinearGradient(0, cy - 20, 0, cy + 20);
  grad.addColorStop(0, "#ffe2b0");
  grad.addColorStop(0.55, "#e8a04a");
  grad.addColorStop(1, "#c4532e");
  ctx.shadowColor = "rgba(255,140,60,0.6)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = grad;
  ctx.fillText("ASHLANE", w / 2 + 6, cy);
  ctx.restore();
  ctx.fillStyle = "#b4b0a8";
  ctx.font = "500 12px IBM Plex Mono, monospace";
  ctx.letterSpacing = "4px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SECTOR I  ·  THE CINDER REACH", w / 2 + 2, cy + 34);
  ctx.letterSpacing = "0px";
}

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
  const dt = Math.min(0.05, Math.max(0, time - lastTime));
  lastTime = time;
  const screen = state?.screen ?? "title";
  if (screen !== lastScreen) {
    clearFx();
    lastScreen = screen;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const title = !state || screen === "title" || screen === "gameover" || screen === "victory";
  const theme = title ? "title" : screen === "combat" && currentNode(state)?.nebula ? "nebula" : screen === "combat" ? "combat" : "map";
  drawBackdrop(ctx, w, h, time, theme, dpr);
  if (title) {
    hitState.current = { kind: "none", nodes: [], rooms: [] };
    drawTitle(ctx, state, w, h, time);
    drawVignette(ctx, w, h, dpr);
    return;
  }
  const shake = state.combat?.shake ?? 0;
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake * 14, (Math.random() - 0.5) * shake * 10);
  }
  if (screen === "combat" && state.combat) drawCombat(ctx, state, w, h, time, dt);
  else drawMap(ctx, state, w, h, time);
  ctx.restore();
  drawVignette(ctx, w, h, dpr);
  if (shake > 0.15) {
    ctx.fillStyle = `rgba(255,70,40,${Math.min(0.18, (shake - 0.15) * 0.8)})`;
    ctx.fillRect(0, 0, w, h);
  }
}
