import { CREW_PRESETS } from "./content.js";
import { storeItems } from "./sim-event.js";
import { flee } from "./sim-jump.js";
import { currentNode, toast } from "./sim-run.js";
import { makeWeapon } from "./sim-ship.js";

export function buy(state, itemId) {
  const items = storeItems(state);
  const item = items.find((it) => it.id === itemId);
  if (!item) return { ok: false, reason: "Gone." };
  if (item.kind === "repair-full") item.cost = Math.max(8, (state.player.hullMax - state.player.hull) * 2);
  if (state.scrap < item.cost) return { ok: false, reason: "Not enough scrap." };
  const player = state.player;
  if (item.kind === "repair") {
    if (player.hull >= player.hullMax) return { ok: false, reason: "Hull is sound." };
    player.hull = Math.min(player.hullMax, player.hull + item.amount);
  } else if (item.kind === "repair-full") {
    if (player.hull >= player.hullMax) return { ok: false, reason: "Hull is sound." };
    player.hull = player.hullMax;
  } else if (item.kind === "repair-sys") {
    for (const room of player.rooms) room.hp = room.hpMax;
    player.o2 = 100;
  } else if (item.kind === "fuel") {
    state.fuel += item.amount;
  } else if (item.kind === "missiles") {
    player.missiles += item.amount;
  } else if (item.kind === "weapon") {
    if (player.weapons.some((w) => w.defId === item.weapon)) return { ok: false, reason: "Already mounted." };
    if (player.weapons.length >= 3) {
      const idx = Math.max(0, Math.min(player.weapons.length - 1, state.replaceIndex));
      player.weapons[idx] = makeWeapon(item.weapon, "weapons");
    } else player.weapons.push(makeWeapon(item.weapon, "weapons"));
    const node = currentNode(state);
    if (node?.stock) node.stock = node.stock.filter((it) => it.id !== item.id);
  } else if (item.kind === "upgrade" && item.upgrade === "shields") {
    player.systems.shields.max += 1;
    player.reactor += 1;
    const node = currentNode(state);
    if (node?.stock) node.stock = node.stock.filter((it) => it.id !== item.id);
  } else if (item.kind === "crew") {
    const preset = CREW_PRESETS[3];
    player.crew.push({
      id: preset.id,
      name: preset.name,
      color: preset.color,
      hp: 100,
      hpMax: 100,
      room: "medbay",
      path: [],
      hop: 0,
    });
    const node = currentNode(state);
    if (node?.stock) node.stock = node.stock.filter((it) => it.id !== item.id);
  } else {
    throw new Error("Unhandled store kind: " + item.kind);
  }
  state.scrap -= item.cost;
  toast(state, `Bought ${item.name}.`);
  return { ok: true };
}

export function closeModal(state) {
  if (!state.modal) return;
  const type = state.modal.type;
  if (type === "event") return;
  if (type === "loot") {
    state.modal = null;
    state.paused = false;
    state.combat = null;
    state.screen = "map";
    state.player.queue = [];
    state.player.boarders = [];
    return;
  }
  if (type === "tutorial") {
    state.modal = null;
    state.paused = false;
    return;
  }
  if (type === "pause" || type === "help" || type === "flee" || type === "store") {
    state.modal = null;
    return;
  }
  state.modal = null;
}
