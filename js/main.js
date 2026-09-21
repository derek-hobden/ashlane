import { draw, hitTest } from "./draw.js";
import { createAudio } from "./audio.js";
import {
  abandon,
  buy,
  choose,
  closeModal,
  cyclePower,
  flee,
  hydrate,
  jump,
  manualFire,
  newRun,
  openPause,
  openStore,
  resume,
  selectWeapon,
  serialize,
  step,
  tapCrew,
  tapRoom,
  toggleAutofire,
  waitAtBeacon,
} from "./sim.js";
import { setMuteFlag, syncUi } from "./ui.js";

const canvas = document.getElementById("c");
const dom = {
  hud: document.getElementById("hud"),
  dock: document.getElementById("dock"),
  modal: document.getElementById("modal"),
  toasts: document.getElementById("toasts"),
  sig: "",
  toastSig: "",
  titleHelp: false,
  audioMuted: false,
};

const audio = createAudio();
dom.audioMuted = audio.muted;

let state = null;
let last = performance.now();
let saveAt = 0;
let shook = false;
const seenShots = new Set();

function persist() {
  if (!state || state.screen === "gameover" || state.screen === "victory") {
    try {
      localStorage.removeItem("ashlane-save");
    } catch {
      /* ignore */
    }
    rememberStats();
    return;
  }
  try {
    localStorage.setItem("ashlane-save", serialize(state));
  } catch {
    /* ignore */
  }
}

function rememberStats() {
  if (!state) return;
  try {
    const prev = JSON.parse(localStorage.getItem("ashlane-stats") || "{}");
    const clears = (prev.clears ?? 0) + (state.screen === "victory" ? 1 : 0);
    const bestScrap = Math.max(prev.bestScrap ?? 0, state.stats?.scrapEarned ?? 0);
    localStorage.setItem("ashlane-stats", JSON.stringify({ clears, bestScrap }));
  } catch {
    /* ignore */
  }
}

function setState(next) {
  state = next;
  dom.sig = "";
  persist();
}

function noteSounds() {
  if (!state?.combat) return;
  for (const shot of state.combat.projectiles) {
    if (shot.dist < 0.08 && !seenShots.has(shot.id)) {
      seenShots.add(shot.id);
      audio.shot(shot.kind);
    }
  }
  if (seenShots.size > 80) {
    const keep = new Set(state.combat.projectiles.map((s) => s.id));
    for (const id of seenShots) if (!keep.has(id)) seenShots.delete(id);
  }
}

function onAct(act, el) {
  audio.unlock();
  audio.ui();
  if (act === "new") {
    dom.titleHelp = false;
    setState(newRun((Date.now() ^ (Math.random() * 1e9)) >>> 0));
    return;
  }
  if (act === "continue") {
    try {
      const loaded = hydrate(localStorage.getItem("ashlane-save"));
      if (loaded) setState(loaded);
    } catch {
      /* ignore */
    }
    return;
  }
  if (act === "help") {
    if (!state) {
      dom.titleHelp = true;
      dom.sig = "";
      return;
    }
    state.paused = true;
    state.modal = { type: "help" };
    dom.sig = "";
    return;
  }
  if (act === "close-help") {
    dom.titleHelp = false;
    if (state?.modal?.type === "help") state.modal = state.screen === "combat" ? { type: "pause" } : null;
    dom.sig = "";
    return;
  }
  if (!state) return;
  if (act === "jump") {
    const result = jump(state, state.selectedId);
    if (!result.ok) state.log = result.reason;
    persist();
    dom.sig = "";
    return;
  }
  if (act === "wait") {
    waitAtBeacon(state);
    persist();
    dom.sig = "";
    return;
  }
  if (act === "store") {
    openStore(state);
    dom.sig = "";
    return;
  }
  if (act === "choice") {
    choose(state, Number(el.dataset.index));
    persist();
    dom.sig = "";
    return;
  }
  if (act === "buy") {
    const result = buy(state, el.dataset.id);
    if (!result.ok && result.reason) state.log = result.reason;
    persist();
    dom.sig = "";
    return;
  }
  if (act === "replace") {
    state.replaceIndex = (state.replaceIndex + 1) % state.player.weapons.length;
    dom.sig = "";
    return;
  }
  if (act === "close") {
    closeModal(state);
    persist();
    dom.sig = "";
    return;
  }
  if (act === "pause") {
    openPause(state);
    dom.sig = "";
    return;
  }
  if (act === "resume" || act === "engage") {
    resume(state);
    if (act === "engage") state.paused = false;
    dom.sig = "";
    return;
  }
  if (act === "abandon") {
    abandon(state);
    persist();
    dom.sig = "";
    return;
  }
  if (act === "mute") {
    dom.audioMuted = audio.toggle();
    setMuteFlag(dom, dom.audioMuted);
    dom.sig = "";
    return;
  }
  if (act === "power") {
    cyclePower(state, el.dataset.key, Number(el.dataset.dir));
    dom.sig = "";
    return;
  }
  if (act === "weapon") {
    const index = Number(el.dataset.index);
    if (state.selectedWeapon === index) manualFire(state, index);
    else selectWeapon(state, index);
    dom.sig = "";
    return;
  }
  if (act === "auto") {
    toggleAutofire(state, Number(el.dataset.index));
    dom.sig = "";
    return;
  }
  if (act === "flee") {
    state.modal = { type: "flee" };
    dom.sig = "";
    return;
  }
  if (act === "flee-to") {
    const result = flee(state, el.dataset.id);
    if (!result.ok && result.reason) state.log = result.reason;
    persist();
    dom.sig = "";
  }
}

document.body.addEventListener("click", (event) => {
  const el = event.target.closest("[data-act]");
  if (!el || el.hasAttribute("disabled")) return;
  event.preventDefault();
  onAct(el.dataset.act, el);
});

canvas.addEventListener("pointerdown", (event) => {
  if (!state) return;
  audio.unlock();
  const rect = canvas.getBoundingClientRect();
  const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
  if (!hit) return;
  if (hit.type === "node" && state.screen === "map") {
    if (state.selectedId === hit.id) {
      const cur = state.sector.currentId;
      if (hit.id !== cur) onAct("jump", canvas);
    } else {
      state.selectedId = hit.id;
      dom.sig = "";
    }
    return;
  }
  if (hit.type === "room" && state.screen === "combat") {
    const crew = state.player.crew.find((c) => {
      if (hit.side !== "player" || c.room !== hit.id) return false;
      return true;
    });
    if (hit.side === "player" && crew && !state.selectedCrew) tapCrew(state, crew.id);
    else tapRoom(state, hit.side, hit.id);
    dom.sig = "";
  }
});

window.addEventListener("keydown", (event) => {
  if (!state) return;
  if (event.key === " " || event.key === "Escape") {
    event.preventDefault();
    if (state.paused || state.modal) onAct("resume", document.body);
    else onAct("pause", document.body);
  } else if (event.key === "1" || event.key === "2" || event.key === "3") {
    const index = Number(event.key) - 1;
    selectWeapon(state, index);
    manualFire(state, index);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state?.screen === "combat") {
    state.paused = true;
    persist();
  }
});

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state) {
    step(state, dt);
    noteSounds();
    if (state.combat?.shake > 0.22) {
      if (!shook && navigator.vibrate) navigator.vibrate(8);
      shook = true;
    } else shook = false;
    saveAt += dt;
    if (saveAt > 2) {
      saveAt = 0;
      persist();
    }
  }
  draw(canvas, state, now / 1000);
  syncUi(dom, state, audio);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
