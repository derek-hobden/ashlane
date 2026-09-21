import { KIND_LABEL } from "./content.js";
import { currentNode } from "./sim.js";
import { SYS, esc, hasSave } from "./ui-util.js";
import { combatDock } from "./ui-dock.js";
import { modalHtml } from "./ui-modal.js";
import { paintLive, paintToasts } from "./ui-sheets.js";

export function syncUi(dom, state, audio) {
  const sig = signature(state, audio.muted) + (dom.titleHelp ? "|thel p" : "");
  if (dom.sig !== sig) {
    dom.sig = sig;
    dom.hud.innerHTML = hudHtml(state, audio.muted);
    dom.dock.innerHTML = dockHtml(state);
    dom.modal.innerHTML = modalHtml(dom, state, audio.muted);
    dom.modal.hidden = !dom.modal.innerHTML.trim();
    const centered = Boolean(state?.modal) || dom.titleHelp;
    dom.modal.classList.toggle("center", centered && Boolean(state || dom.titleHelp));
  }
  paintLive(dom, state);
  paintToasts(dom, state);
}

function signature(state, muted) {
  if (!state) return `title|${hasSave()}|${muted}`;
  const modal = state.modal ? `${state.modal.type}:${state.modal.eventId ?? ""}:${state.modal.title ?? ""}` : "";
  const weapons = state.player.weapons.map((w) => `${w.defId}:${w.autofire ? 1 : 0}:${w.target}`).join(",");
  const power = SYS.map(([key]) => state.player.systems[key].power).join("");
  const node = currentNode(state);
  return [
    state.screen,
    modal,
    state.selectedId,
    state.selectedCrew,
    state.selectedWeapon,
    state.replaceIndex,
    state.paused,
    weapons,
    power,
    state.scrap,
    state.fuel,
    state.player.missiles,
    state.player.hull,
    state.player.crew.length,
    node?.id,
    node?.cleared,
    state.sector.fleetCol,
    state.sector.quest,
    muted,
    state.combat?.outcome ?? "",
    state.combat?.hazardOnly ? 1 : 0,
    (node?.stock ?? []).length,
  ].join("|");
}

function hudHtml(state, muted) {
  if (!state || state.screen === "title") return "";
  const node = currentNode(state);
  const gap = node ? node.col - state.sector.fleetCol : 0;
  const fleet = state.sector.fleetCol < 0 ? "Armada off-chart" : gap > 0 ? `Armada ${gap} col back` : "Armada is here";
  const hull = state.player.hull;
  const ratio = Math.max(0, hull / state.player.hullMax);
  return `
    <div class="brand">WREN</div>
    <div class="hull" title="Hull">
      <span>HULL</span>
      <div class="bar"><i style="width:${ratio * 100}%"></i></div>
      <b>${Math.max(0, Math.ceil(hull))}</b>
    </div>
    <div class="stat">SCR <b>${state.scrap}</b></div>
    <div class="stat ${state.fuel <= 3 ? "warn" : ""}">FUEL <b>${state.fuel}</b></div>
    <div class="stat">MSL <b>${state.player.missiles}</b></div>
    <div class="stat o2">O₂ <b>${Math.round(state.player.o2)}</b></div>
    <div class="fleet ${gap <= 1 ? "warn" : ""}">${esc(fleet)}</div>
    <button type="button" class="icon" data-act="pause" aria-label="Pause">II</button>
    <button type="button" class="icon" data-act="mute" aria-label="Mute">${muted ? "×" : "♫"}</button>
  `;
}

function dockHtml(state) {
  if (!state || state.screen === "title" || state.screen === "gameover" || state.screen === "victory") return "";
  if (state.modal && ["event", "store", "loot", "tutorial", "gameover", "victory", "help", "pause"].includes(state.modal.type)) {
    return `<p class="dockhint">Use the panel. The lane is on hold.</p>`;
  }
  if (state.screen === "combat" && state.combat) return combatDock(state);
  return mapDock(state);
}

function mapDock(state) {
  const cur = currentNode(state);
  const selected = state.sector.nodes.find((n) => n.id === state.selectedId) ?? cur;
  const inRange = cur?.links.includes(selected.id);
  const here = selected.id === cur?.id;
  const covered = selected.col <= state.sector.fleetCol;
  let detail = `${KIND_LABEL[selected.kind] ?? selected.kind}${selected.cleared ? " · clear" : ""}`;
  if (here) detail = "You are here · " + detail;
  else if (inRange) detail = (covered ? "In the armada · " : "In range · ") + detail;
  else detail = "Out of jump range · " + detail;
  const canJump = inRange && !here && state.fuel > 0 && state.screen === "map";
  const storeHere = here && cur?.kind === "store";
  return `
    <div class="mapdock">
      <div class="info">
        <strong>${esc(selected.name)}</strong>
        <span>${esc(detail)}</span>
      </div>
      ${storeHere ? `<button type="button" class="go" data-act="store">Chandlery</button>` : ""}
      <button type="button" class="go" data-act="jump" ${canJump ? "" : "disabled"}>${canJump ? "Jump · 1 fuel" : here ? "Select a link" : state.fuel <= 0 ? "No fuel" : "Out of range"}</button>
      <button type="button" class="ghost" data-act="wait">Wait</button>
    </div>
  `;
}

