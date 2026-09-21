import { WEAPONS } from "./content.js";
import { manned, roomById, systemRoom, toast } from "./sim-run.js";

export function evasion(ship) {
  const engines = systemRoom(ship, "engines");
  const helm = systemRoom(ship, "helm");
  if (!engines || engines.hp <= 0) return 0;
  const pilot = helm && helm.hp > 0 && manned(ship, "helm");
  let score = ship.systems.engines.power * 5;
  if (!pilot) score *= 0.45;
  else score += 5;
  if (manned(ship, "engines")) score += 5;
  return Math.max(0, Math.min(0.45, score / 100));
}

export function weaponOnline(ship) {
  const room = systemRoom(ship, "weapons");
  let pool = room && room.hp > 0 ? ship.systems.weapons.power : 0;
  return ship.weapons.map((weapon) => {
    const need = WEAPONS[weapon.defId].power;
    if (pool >= need) {
      pool -= need;
      return true;
    }
    return false;
  });
}

function bfs(ship, from, to) {
  if (from === to) return [];
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const tip = path[path.length - 1];
    const room = roomById(ship, tip);
    if (!room) continue;
    for (const next of room.doors) {
      if (seen.has(next)) continue;
      const nextPath = path.concat(next);
      if (next === to) return nextPath.slice(1);
      seen.add(next);
      queue.push(nextPath);
    }
  }
  return null;
}

export function orderMove(state, crewId, dest) {
  const crew = state.player.crew.find((c) => c.id === crewId);
  if (!crew || crew.hp <= 0) return;
  const path = bfs(state.player, crew.room, dest);
  if (!path) return;
  const already = crew.path.length > 0 && crew.path[crew.path.length - 1] === dest;
  if (already) return;
  crew.path = path;
  crew.hop = 0;
  state.selectedCrew = null;
  toast(state, `${crew.name} → ${dest}.`);
}

export function tapCrew(state, crewId) {
  const crew = state.player.crew.find((c) => c.id === crewId);
  if (!crew || crew.hp <= 0) return;
  state.selectedCrew = state.selectedCrew === crewId ? null : crewId;
}

export function tapRoom(state, side, roomId) {
  if (state.screen !== "combat" || !state.combat) return;
  if (side === "enemy") {
    const idx = state.selectedWeapon ?? 0;
    const weapon = state.player.weapons[idx];
    if (weapon) {
      weapon.target = roomId;
      toast(state, `${WEAPONS[weapon.defId].name} aimed at ${roomId}.`);
    }
    return;
  }
  if (state.selectedCrew) {
    orderMove(state, state.selectedCrew, roomId);
    return;
  }
  const present = state.player.crew.filter((c) => c.room === roomId && c.hp > 0);
  if (present.length) state.selectedCrew = present[0].id;
}

export function toggleAutofire(state, index) {
  const weapon = state.player.weapons[index];
  if (!weapon) return;
  weapon.autofire = !weapon.autofire;
  state.selectedWeapon = index;
}

export function selectWeapon(state, index) {
  if (state.player.weapons[index]) state.selectedWeapon = index;
}

function spawnShot(origin, def, targetRoomId, delay) {
  origin.queue.push({
    t: delay,
    kind: def.kind,
    damage: def.damage,
    sys: def.sys,
    ion: def.ion ?? 0,
    target: targetRoomId,
  });
}

export function tryFire(state, ship, index, targetShip) {
  const flags = weaponOnline(ship);
  if (!flags[index]) return false;
  const weapon = ship.weapons[index];
  const def = WEAPONS[weapon.defId];
  if (weapon.charge < def.charge - 0.02) return false;
  const ammoCost = def.ammo * def.shots;
  if (ammoCost > 0 && ship.missiles < ammoCost) return false;
  ship.missiles -= ammoCost;
  weapon.charge = 0;
  const target = weapon.target || "weapons";
  for (let s = 0; s < def.shots; s++) spawnShot(ship, def, target, s * def.stagger);
  return true;
}

export function manualFire(state, index) {
  if (!state.combat || state.paused || state.combat.outcome) return;
  const enemy = state.combat.enemy;
  if (!enemy) return;
  if (tryFire(state, state.player, index, enemy)) {
    const def = WEAPONS[state.player.weapons[index].defId];
    toast(state, `${def.name} away.`);
  }
}
