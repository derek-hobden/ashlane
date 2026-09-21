import { NODES, ROOMS, WEAPONS } from "./content.js";
import { storeItems } from "./sim-event.js";
import { flee } from "./sim-jump.js";
import { currentNode } from "./sim-run.js";
import { SAVE_VERSION } from "./sim-ship.js";

export function openStore(state, node = currentNode(state)) {
  if (!node || node.kind !== "store") return;
  storeItems(state);
  node.cleared = true;
  node.visited = true;
  state.modal = { type: "store" };
  state.screen = "map";
}

export function openPause(state) {
  state.paused = true;
  state.modal = { type: "pause" };
}

export function resume(state) {
  const type = state.modal?.type;
  if (type === "pause" || type === "help" || type === "flee" || type === "tutorial") state.modal = null;
  if (state.screen === "combat" && state.combat && !state.combat.outcome) state.paused = false;
}

export function abandon(state) {
  state.player.hull = 0;
  state.screen = "gameover";
  state.paused = true;
  state.modal = { type: "gameover" };
  if (state.combat) state.combat.outcome = "lose";
}

export function shortestJumps(nodes = NODES, from = "S", to = "N") {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dist = new Map([[from, 0]]);
  const q = [from];
  while (q.length) {
    const id = q.shift();
    const node = byId.get(id);
    if (!node) continue;
    for (const link of node.links) {
      if (!dist.has(link)) {
        dist.set(link, dist.get(id) + 1);
        q.push(link);
      }
    }
  }
  return dist.get(to) ?? null;
}

export function reachableFrom(fromId, nodes = NODES) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set();
  const q = [fromId];
  while (q.length) {
    const id = q.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) continue;
    for (const link of node.links) q.push(link);
  }
  return seen;
}

/** Every node can reach the exit, and the start can reach every node. */
export function sectorLinksOk(nodes = NODES) {
  const forward = reachableFrom("S", nodes);
  if (forward.size !== nodes.length) return false;
  const reversed = nodes.map((n) => ({ id: n.id, links: [] }));
  const byId = new Map(reversed.map((n) => [n.id, n]));
  for (const node of nodes) {
    for (const link of node.links) byId.get(link)?.links.push(node.id);
  }
  const toExit = reachableFrom("N", reversed);
  return toExit.size === nodes.length;
}

export function doorsAreSymmetric() {
  const byId = new Map(ROOMS.map((r) => [r.id, r]));
  for (const room of ROOMS) {
    for (const door of room.doors) {
      const other = byId.get(door);
      if (!other || !other.doors.includes(room.id)) return false;
    }
  }
  return true;
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function hydrate(raw) {
  const state = JSON.parse(raw);
  if (!state || state.version !== SAVE_VERSION) return null;
  return state;
}

export function weaponById(id) {
  return WEAPONS[id];
}
