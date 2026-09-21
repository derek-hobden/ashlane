import { WEAPONS } from "./content.js";
import { esc } from "./ui-util.js";

export function helpSheet(fromTitle) {
  return `
    <section class="sheet">
      <p class="kicker">Flight card</p>
      <h2>How a sector plays</h2>
      <ul>
        <li>Tap a linked beacon, then Jump. Each jump burns 1 fuel. Wait lets the armada gain.</li>
        <li>Leave a dust beacon and the armada loses the fix — they do not advance that jump.</li>
        <li>+/− shifts reactor power. Weapons charge only while powered. AUTO fires when ready; HOLD waits for another tap.</li>
        <li>Tap a weapon, then an enemy room, to aim. Tap your crew, then a room, to walk them. A crewed helm dodges more. Medbay heals. Missiles ignore shields.</li>
      </ul>
      <button type="button" class="go" data-act="${fromTitle ? "close-help" : "resume"}">${fromTitle ? "Back" : "Resume"}</button>
    </section>`;
}

export function endSheet(state, won) {
  const scrap = state.stats.scrapEarned;
  return `
    <section class="sheet">
      <p class="kicker">${won ? "Sector clear" : "Hull failure"}</p>
      <h2>${won ? "The Reach is behind you" : "The Wren breaks up"}</h2>
      <p>${won ? "Exit beacon folded. This build ends at the edge of sector one — the lane continues, the ship does not, yet." : "The Cinder Armada keeps the chart. Another Wren can try the same sector."}</p>
      <ul>
        <li>Scrap earned ${scrap}</li>
        <li>Jumps ${state.stats.jumps} · waits ${state.stats.waits}</li>
        <li>Hull ${Math.max(0, Math.ceil(state.player.hull))} · crew lost ${state.stats.crewLost}</li>
      </ul>
      <button type="button" class="go" data-act="new">New run</button>
    </section>`;
}

export function paintToasts(dom, state) {
  const text = state?.toasts?.map((t) => t.text).join("\n") ?? "";
  if (dom.toastSig === text) return;
  dom.toastSig = text;
  dom.toasts.innerHTML = (state?.toasts ?? []).map((t) => `<p>${esc(t.text)}</p>`).join("");
}

export function paintLive(dom, state) {
  if (!state?.player) return;
  const mute = dom.hud.querySelector('[data-act="mute"]');
  if (mute) mute.textContent = dom.audioMuted ? "×" : "♫";
  for (const bar of dom.dock.querySelectorAll("[data-charge]")) {
    const weapon = state.player.weapons[Number(bar.dataset.charge)];
    if (!weapon) continue;
    const def = WEAPONS[weapon.defId];
    const ratio = def.charge <= 0 ? 0 : Math.max(0, Math.min(1, weapon.charge / def.charge));
    bar.style.transform = `scaleX(${ratio})`;
    bar.parentElement?.classList.toggle("ready", ratio >= 0.99);
  }
  const hull = dom.hud.querySelector(".hull b");
  const bar = dom.hud.querySelector(".hull i");
  if (hull && bar) {
    hull.textContent = String(Math.max(0, Math.ceil(state.player.hull)));
    bar.style.width = `${Math.max(0, state.player.hull / state.player.hullMax) * 100}%`;
  }
  const o2 = dom.hud.querySelector(".o2 b");
  if (o2) o2.textContent = String(Math.round(state.player.o2));
}

export function setMuteFlag(dom, muted) {
  dom.audioMuted = muted;
  const mute = dom.hud.querySelector('[data-act="mute"]');
  if (mute) mute.textContent = muted ? "×" : "♫";
}
