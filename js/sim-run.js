import { NODES } from "./content.js";
import { SAVE_VERSION, createPlayer, rand } from "./sim-ship.js";

export function newRun(seed = Date.now() % 100000) {
  const nodes = NODES.map((n) => ({
    ...n,
    links: n.links.slice(),
    visited: n.id === "S",
    cleared: n.id === "S",
    stock: null,
  }));
  // Light variation so the bend fight isn't identical every run.
  const probe = { rngState: seed >>> 0 };
  const bend = nodes.find((n) => n.id === "J");
  bend.enemy = rand(probe) < 0.5 ? "cutter" : "sloop";
  return {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    rngState: probe.rngState,
    screen: "map",
    paused: false,
    player: createPlayer(),
    sector: { nodes, currentId: "S", fleetCol: -1, quest: 0 },
    selectedId: "S",
    combat: null,
    modal: null,
    selectedCrew: null,
    selectedWeapon: 0,
    replaceIndex: 0,
    log: "Rim gate. The Cinder Reach opens east. Stay ahead of the armada.",
    toasts: [],
    stats: { scrapEarned: 0, jumps: 0, waits: 0, crewLost: 0, scrap: 12 },
    scrap: 12,
    fuel: 12,
    introSeen: false,
    clock: 0,
  };
}

export function nodeById(state, id) {
  return state.sector.nodes.find((n) => n.id === id) ?? null;
}

export function currentNode(state) {
  return nodeById(state, state.sector.currentId);
}

export function neighbors(state, id = state.sector.currentId) {
  const node = nodeById(state, id);
  if (!node) return [];
  return node.links.map((link) => nodeById(state, link)).filter(Boolean);
}

export function toast(state, text) {
  state.toasts.push({ text, t: 2.6 });
  state.log = text;
}

export function decayToasts(state, dt) {
  for (const item of state.toasts) item.t -= dt;
  state.toasts = state.toasts.filter((item) => item.t > 0).slice(-4);
}

export function powerUsed(ship) {
  return Object.values(ship.systems).reduce((sum, sys) => sum + sys.power, 0);
}

export function setPower(state, key, next) {
  const ship = state.player;
  const sys = ship.systems[key];
  if (!sys) return;
  const room = ship.rooms.find((r) => r.system === key);
  const cap = room && room.hp <= 0 ? 0 : sys.max;
  next = Math.max(0, Math.min(cap, next | 0));
  const others = powerUsed(ship) - sys.power;
  if (others + next > ship.reactor) next = Math.max(0, ship.reactor - others);
  sys.power = next;
  if (key === "shields") {
    const bubbles = shieldCap(ship);
    if (ship.shieldBubbles > bubbles) ship.shieldBubbles = bubbles;
  }
}

export function cyclePower(state, key, dir) {
  const cur = state.player.systems[key].power;
  setPower(state, key, cur + dir);
}

export function roomById(ship, id) {
  return ship.rooms.find((r) => r.id === id) ?? null;
}

export function systemRoom(ship, system) {
  return ship.rooms.find((r) => r.system === system) ?? null;
}

export function manned(ship, system) {
  const room = systemRoom(ship, system);
  if (!room) return false;
  return ship.crew.some((c) => c.hp > 0 && c.room === room.id && c.path.length === 0);
}

export function shieldCap(ship) {
  const room = systemRoom(ship, "shields");
  if (!room || room.hp <= 0) return 0;
  const ion = ship.ionT > 0 ? ship.ionStacks : 0;
  return Math.max(0, ship.systems.shields.power - ion);
}
