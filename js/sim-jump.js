import { EVENTS } from "./content.js";
import { openStore } from "./sim-meta.js";
import { currentNode, nodeById, systemRoom, toast } from "./sim-run.js";
import { rand } from "./sim-ship.js";
import { startCombat } from "./sim-step.js";

function fleetAdvance(state, fromNode) {
  if (fromNode?.nebula) {
    toast(state, "Dust scatters the armada’s fix. They do not gain.");
    return;
  }
  state.sector.fleetCol += 1;
}

export function jump(state, targetId) {
  if (state.screen === "combat") return { ok: false, reason: "In a fight." };
  if (state.modal?.type === "event") return { ok: false, reason: "Resolve this beacon first." };
  const cur = currentNode(state);
  const target = nodeById(state, targetId);
  if (!cur || !target) return { ok: false, reason: "No beacon." };
  if (!cur.links.includes(targetId)) return { ok: false, reason: "Out of range." };
  if (state.fuel < 1) return { ok: false, reason: "No fuel." };
  state.fuel -= 1;
  state.stats.jumps += 1;
  fleetAdvance(state, cur);
  state.sector.currentId = target.id;
  state.selectedId = target.id;
  target.visited = true;
  arrive(state, target);
  return { ok: true };
}

export function flee(state, targetId) {
  const combat = state.combat;
  if (!combat || combat.outcome) return { ok: false, reason: "Not in a fight." };
  const engines = systemRoom(state.player, "engines");
  if (!engines || engines.hp <= 0) return { ok: false, reason: "Engines are down." };
  const cur = currentNode(state);
  if (!cur?.links.includes(targetId)) return { ok: false, reason: "Out of range." };
  if (state.fuel < 1) return { ok: false, reason: "No fuel." };
  state.fuel -= 1;
  state.stats.jumps += 1;
  fleetAdvance(state, cur);
  state.player.queue = [];
  state.player.boarders = [];
  const target = nodeById(state, targetId);
  state.sector.currentId = target.id;
  state.selectedId = target.id;
  target.visited = true;
  state.combat = null;
  state.paused = false;
  toast(state, "You spool out. The fight is left behind.");
  arrive(state, target);
  return { ok: true };
}

function arrive(state, node) {
  state.screen = "map";
  state.modal = null;
  state.combat = null;
  if (node.col <= state.sector.fleetCol && node.kind !== "exit") {
    toast(state, "The armada covers " + node.name + ".");
  }
  if (node.cleared && node.kind !== "store" && node.kind !== "exit") {
    if (node.col <= state.sector.fleetCol) startHazard(state);
    return;
  }
  if (node.kind === "start") return;
  if (node.kind === "store") {
    openStore(state, node);
    return;
  }
  if (node.kind === "hostile" || node.kind === "elite" || node.kind === "exit") {
    startCombat(state, node.enemy);
    return;
  }
  const ev = node.event ? EVENTS[node.event] : null;
  if (ev) state.modal = { type: "event", eventId: ev.id };
  else node.cleared = true;
}

function startHazard(state) {
  state.combat = {
    enemy: null,
    enemyId: null,
    projectiles: [],
    floats: [],
    asb: { t: 6, warn: 0, roomId: null },
    rocks: null,
    time: 0,
    outcome: null,
    reward: null,
    shake: 0,
    tutorial: false,
    hazardOnly: true,
  };
  state.screen = "combat";
  state.paused = false;
  state.modal = null;
  toast(state, "Armada batteries. Jump out.");
}

export function waitAtBeacon(state) {
  if (state.screen !== "map") return { ok: false, reason: "Not on the chart." };
  state.stats.waits += 1;
  state.sector.fleetCol += 1;
  const roll = rand(state);
  if (roll < 0.34) {
    state.fuel += 1;
    toast(state, "A derelict still had a fuel cell. The armada gains.");
  } else if (roll < 0.55) {
    state.scrap += 6;
    state.stats.scrapEarned += 6;
    toast(state, "You cut scrap off the buoy. The armada gains.");
  } else toast(state, "Nothing answers. The armada gains.");
  const node = currentNode(state);
  if (node && node.col <= state.sector.fleetCol) startHazard(state);
  return { ok: true };
}

function choiceVisible(state, choice) {
  if (choice.requiresQuest) return state.sector.quest >= 1 && currentNode(state)?.id === "G";
  return true;
}

export function visibleChoices(state, eventId) {
  const event = EVENTS[eventId];
  if (!event) return [];
  return event.choices.filter((choice) => choiceVisible(state, choice));
}
