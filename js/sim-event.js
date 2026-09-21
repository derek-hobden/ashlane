import { visibleChoices } from "./sim-jump.js";
import { currentNode, toast } from "./sim-run.js";
import { rand, rangePick } from "./sim-ship.js";
import { startCombat } from "./sim-step.js";

export function choose(state, index) {
  const modal = state.modal;
  if (!modal || modal.type !== "event") return { ok: false };
  const choices = visibleChoices(state, modal.eventId);
  const choice = choices[index];
  if (!choice) return { ok: false };
  const node = currentNode(state);
  const effect = choice.effect;
  if (effect === "leave") {
    if (node) node.cleared = true;
    state.modal = null;
    toast(state, "You let it be.");
    return { ok: true };
  }
  if (effect === "scrap-hull") {
    state.scrap += choice.scrap;
    state.stats.scrapEarned += choice.scrap;
    state.player.hull = Math.max(1, state.player.hull + choice.hull);
    if (node) node.cleared = true;
    state.modal = null;
    toast(state, `+${choice.scrap} scrap, hull ${choice.hull}.`);
    return { ok: true };
  }
  if (effect === "search") {
    let scrap = 0;
    let fuel = 0;
    let missiles = 0;
    scrap = rangePick(state, choice.scrap);
    if (rand(state) < (choice.fuel ?? 0)) fuel = 1;
    if (rand(state) < (choice.missiles ?? 0)) missiles = 1;
    state.scrap += scrap;
    state.stats.scrapEarned += scrap;
    state.fuel += fuel;
    state.player.missiles += missiles;
    if (node) node.cleared = true;
    state.modal = null;
    toast(state, `Search: +${scrap} scrap${fuel ? ", +1 fuel" : ""}${missiles ? ", +1 missile" : ""}.`);
    return { ok: true };
  }
  if (effect === "quest-start") {
    state.sector.quest = 1;
    if (node) node.cleared = true;
    state.modal = null;
    toast(state, "Rendezvous set at Split lane.");
    return { ok: true };
  }
  if (effect === "quest-fight") {
    state.sector.quest = 2;
    state.modal = null;
    startCombat(state, "monitor", { reward: { weapon: "pike", scrap: 8, missiles: 1 } });
    return { ok: true };
  }
  if (effect === "fight") {
    state.modal = null;
    startCombat(state, choice.enemy, { reward: choice.reward });
    return { ok: true };
  }
  throw new Error("Unhandled choice effect: " + effect);
}

export function storeItems(state) {
  const node = currentNode(state);
  if (node?.stock) return node.stock;
  const items = [
    { id: "repair5", name: "Patch hull +5", cost: 10, kind: "repair", amount: 5 },
    { id: "repair-full", name: "Restore hull", cost: Math.max(8, (state.player.hullMax - state.player.hull) * 2), kind: "repair-full" },
    { id: "fuel3", name: "Fuel ×3", cost: 8, kind: "fuel", amount: 3 },
    { id: "missiles3", name: "Missiles ×3", cost: 11, kind: "missiles", amount: 3 },
    { id: "systems", name: "Restore systems", cost: 16, kind: "repair-sys" },
  ];
  if (!state.player.weapons.some((w) => w.defId === "pike")) {
    items.push({ id: "pike", name: "Pike", cost: 46, kind: "weapon", weapon: "pike" });
  }
  if (!state.player.weapons.some((w) => w.defId === "ion")) {
    items.push({ id: "ion", name: "Ion needle", cost: 40, kind: "weapon", weapon: "ion" });
  }
  if (state.player.systems.shields.max < 3) {
    items.push({ id: "shield", name: "Shield coil", cost: 58, kind: "upgrade", upgrade: "shields" });
  }
  if (state.player.crew.length < 4) {
    items.push({ id: "crew", name: "Hire Quill", cost: 42, kind: "crew" });
  }
  if (node) node.stock = items;
  return items;
}
