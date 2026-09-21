import { EVENTS, WEAPONS } from "./content.js";
import { currentNode, neighbors, storeItems, visibleChoices } from "./sim.js";
import { endSheet, helpSheet } from "./ui-sheets.js";
import { bestLine, esc, hasSave } from "./ui-util.js";

export function modalHtml(dom, state, muted) {
  if (!state) {
    if (dom.titleHelp) return helpSheet(true);
    return `
      <section class="sheet title-sheet">
        <p class="lede">Courier ship Wren. One sector of the Cinder Reach — jump the beacons, keep the armada behind you, leave through the exit.</p>
        <div class="choices row">
          <button type="button" class="go" data-act="new">New run</button>
          ${hasSave() ? `<button type="button" class="ghost" data-act="continue">Continue</button>` : ""}
          <button type="button" class="ghost" data-act="help">How to play</button>
        </div>
        <p class="fine">${esc(bestLine())}</p>
      </section>`;
  }
  const modal = state.modal;
  if (!modal && state.screen !== "title") return "";
  if (!modal) return "";
  if (modal.type === "help") return helpSheet(false);
  if (modal.type === "tutorial") {
    return `
      <section class="sheet">
        <p class="kicker">First contact</p>
        <h2>Hold the lane</h2>
        <ul>
          <li>Shields eat shots. Lance-III fires four pulses, so two bubbles still let two through.</li>
          <li>Missiles ignore shields and spend ammo. Save them for thick targets.</li>
          <li>Tap an enemy room to aim the selected weapon. Tap your crew, then a room, to move them.</li>
          <li>Power is tight. Oxygen keeps the crew breathing. Medbay heals.</li>
        </ul>
        <button type="button" class="go" data-act="engage">Engage</button>
      </section>`;
  }
  if (modal.type === "event") {
    const event = EVENTS[modal.eventId];
    const choices = visibleChoices(state, modal.eventId);
    return `
      <section class="sheet">
        <p class="kicker">${esc(currentNode(state)?.name ?? "Beacon")}</p>
        <h2>${esc(event.title)}</h2>
        <p>${esc(event.body)}</p>
        <div class="choices">
          ${choices.map((choice, i) => `<button type="button" class="${i === 0 ? "go" : "ghost"}" data-act="choice" data-index="${i}">${esc(choice.label)}</button>`).join("")}
        </div>
      </section>`;
  }
  if (modal.type === "store") {
    const items = storeItems(state);
    const full = state.player.weapons.length >= 3;
    const slot = state.player.weapons[state.replaceIndex];
    const slotName = slot ? WEAPONS[slot.defId].name : "";
    return `
      <section class="sheet store">
        <p class="kicker">Chandlery · ${state.scrap} scrap</p>
        <h2>Buy what the lane won’t give you</h2>
        ${full ? `<button type="button" class="ghost" data-act="replace">Replace slot: ${esc(slotName)}</button>` : ""}
        <div class="choices">
          ${items.map((item) => `<button type="button" class="ghost buy" data-act="buy" data-id="${esc(item.id)}"><span>${esc(item.name)}</span><b>${item.cost}</b></button>`).join("")}
        </div>
        <button type="button" class="go" data-act="close">Back to chart</button>
      </section>`;
  }
  if (modal.type === "loot") {
    return `
      <section class="sheet">
        <p class="kicker">Beacon clear</p>
        <h2>${esc(modal.title)}</h2>
        <p>${esc(modal.body)}</p>
        <button type="button" class="go" data-act="close">Back to chart</button>
      </section>`;
  }
  if (modal.type === "flee") {
    const cur = currentNode(state);
    const links = neighbors(state);
    const engines = state.player.rooms.find((r) => r.id === "engines");
    const down = !engines || engines.hp <= 0;
    return `
      <section class="sheet">
        <p class="kicker">Spool jump</p>
        <h2>${down ? "Engines are down" : state.fuel < 1 ? "No fuel to flee" : "Leave this fight"}</h2>
        <p>Fleeing spends a fuel and does not clear the beacon. The armada still advances.</p>
        <div class="choices">
          ${links.map((node) => `<button type="button" class="ghost" data-act="flee-to" data-id="${node.id}" ${down || state.fuel < 1 ? "disabled" : ""}>${esc(node.name)} · 1 fuel</button>`).join("")}
        </div>
        <button type="button" class="go" data-act="resume">Stay</button>
      </section>`;
  }
  if (modal.type === "pause") {
    return `
      <section class="sheet">
        <p class="kicker">Hold</p>
        <h2>Paused</h2>
        <button type="button" class="go" data-act="resume">Resume</button>
        <button type="button" class="ghost" data-act="help">How to play</button>
        <button type="button" class="ghost" data-act="mute">${muted ? "Sound off" : "Sound on"}</button>
        <button type="button" class="danger" data-act="abandon">Abandon run</button>
      </section>`;
  }
  if (modal.type === "gameover") return endSheet(state, false);
  if (modal.type === "victory") return endSheet(state, true);
  return "";
}

