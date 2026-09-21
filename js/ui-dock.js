import { WEAPONS } from "./content.js";
import { SYS, esc, pips } from "./ui-util.js";

export function combatDock(state) {
  const sys = SYS.map(([key, label]) => {
    const spec = state.player.systems[key];
    const room = state.player.rooms.find((r) => r.system === key);
    const dead = room && room.hp <= 0;
    return `<div class="sys ${dead ? "dead" : ""}">
      <button type="button" data-act="power" data-key="${key}" data-dir="-1" aria-label="Less ${label}">−</button>
      <span>${label} ${pips(spec.power, spec.max)}</span>
      <button type="button" data-act="power" data-key="${key}" data-dir="1" aria-label="More ${label}">+</button>
    </div>`;
  }).join("");
  const cards = state.player.weapons.map((weapon, index) => {
    const def = WEAPONS[weapon.defId];
    const ratio = def.charge <= 0 ? 0 : weapon.charge / def.charge;
    const ready = ratio >= 0.99;
    const selected = index === state.selectedWeapon;
    const ammo = def.ammo ? ` · ${state.player.missiles}` : "";
    return `<div class="weapon ${selected ? "sel" : ""} ${ready ? "ready" : ""}">
      <button type="button" data-act="weapon" data-index="${index}">
        <span class="wname">${esc(def.name)}${ammo}</span>
        <span class="wmeta">→ ${esc(weapon.target)}</span>
        <i data-charge="${index}" style="transform:scaleX(${ratio})"></i>
      </button>
      <button type="button" class="auto ${weapon.autofire ? "on" : ""}" data-act="auto" data-index="${index}">${weapon.autofire ? "AUTO" : "HOLD"}</button>
    </div>`;
  }).join("");
  const hazard = state.combat.hazardOnly ? `<p class="dockhint">No ship — only batteries. Flee.</p>` : "";
  return `
    ${hazard}
    <div class="sysrow">${sys}</div>
    <div class="wrow">
      ${cards}
      <button type="button" class="ghost flee" data-act="flee">Flee</button>
    </div>
  `;
}

