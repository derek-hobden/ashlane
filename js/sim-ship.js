import { CREW_PRESETS, ROOMS } from "./content.js";

export const SAVE_VERSION = 1;

export function rand(state) {
  let a = state.rngState | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.rngState = a >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rint(state, n) {
  return Math.floor(rand(state) * n);
}

export function rangePick(state, pair) {
  const [lo, hi] = pair;
  return lo + rint(state, hi - lo + 1);
}

function cloneRooms(hpOverride) {
  return ROOMS.map((room) => {
    const maxHp = hpOverride?.[room.id] ?? room.maxHp;
    return {
      id: room.id,
      system: room.system,
      x: room.x,
      y: room.y,
      w: room.w,
      h: room.h,
      doors: room.doors.slice(),
      hp: maxHp,
      hpMax: maxHp,
      flash: 0,
      repairLock: 0,
    };
  });
}

export function makeWeapon(defId, target = "weapons") {
  return { uid: `${defId}-${Math.random().toString(36).slice(2, 7)}`, defId, charge: 0, autofire: true, target };
}

function baseSystems(partial) {
  const keys = ["shields", "engines", "weapons", "oxygen", "medbay"];
  const systems = {};
  for (const key of keys) {
    const pair = partial[key] ?? [0, 0];
    systems[key] = { power: pair[0], max: pair[1] };
  }
  return systems;
}

export function createPlayer() {
  const crew = CREW_PRESETS.slice(0, 3).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    hp: 100,
    hpMax: 100,
    room: c.room,
    path: [],
    hop: 0,
  }));
  return {
    name: "Wren",
    side: "player",
    hull: 32,
    hullMax: 32,
    missiles: 8,
    reactor: 7,
    o2: 100,
    systems: baseSystems({
      shields: [2, 2],
      engines: [2, 3],
      weapons: [2, 4],
      oxygen: [1, 1],
      medbay: [0, 1],
    }),
    rooms: cloneRooms(),
    crew,
    weapons: [makeWeapon("lance", "weapons"), makeWeapon("barb", "shields")],
    shieldBubbles: 2,
    shieldRegen: 0,
    ionStacks: 0,
    ionT: 0,
    queue: [],
    boarders: [],
    teleportT: 0,
  };
}

export function createEnemy(def) {
  const rooms = cloneRooms();
  for (const room of rooms) {
    if (def.roomHp?.[room.id]) {
      room.hp = def.roomHp[room.id];
      room.hpMax = def.roomHp[room.id];
    }
  }
  const crew = [];
  for (let i = 0; i < def.crew; i++) {
    const home = i === 0 ? "helm" : i === 1 ? "weapons" : "engines";
    crew.push({
      id: `e${i}`,
      name: `Crew ${i + 1}`,
      color: "#d07a68",
      hp: 80,
      hpMax: 80,
      room: home,
      path: [],
      hop: 0,
      boards: i >= def.crew - (def.boarders ?? 0),
    });
  }
  return {
    name: def.name,
    side: "enemy",
    defId: def.id,
    hull: def.hull,
    hullMax: def.hull,
    missiles: def.missiles,
    reactor: def.reactor,
    o2: 100,
    systems: baseSystems(def.systems),
    rooms: rooms,
    crew,
    weapons: def.weapons.map((id) => makeWeapon(id, "weapons")),
    shieldBubbles: def.systems.shields[0],
    shieldRegen: 0,
    ionStacks: 0,
    ionT: 0,
    queue: [],
    boarders: [],
    teleportT: def.boarders > 0 ? 14 : 0,
    boardersLeft: def.boarders,
  };
}
