import { WEAPONS } from "./content.js";
import { weaponOnline } from "./sim-crew.js";
import { manned, roomById, shieldCap, systemRoom, toast } from "./sim-run.js";

export function stepVessel(state, ship, dt, ownerIsPlayer) {
  if (ship.ionT > 0) {
    ship.ionT -= dt;
    if (ship.ionT <= 0) {
      ship.ionT = 0;
      ship.ionStacks = 0;
    }
  }
  const cap = shieldCap(ship);
  if (ship.shieldBubbles > cap) ship.shieldBubbles = cap;
  if (ship.shieldBubbles < cap) {
    const rate = manned(ship, "shields") ? 1.3 : 1;
    ship.shieldRegen += dt * rate;
    const need = 2.35;
    if (ship.shieldRegen >= need) {
      ship.shieldBubbles += 1;
      ship.shieldRegen = 0;
    }
  } else ship.shieldRegen = 0;

  if (ownerIsPlayer) {
    const o2room = systemRoom(ship, "oxygen");
    const o2on = ship.systems.oxygen.power > 0 && o2room && o2room.hp > 0;
    ship.o2 = Math.max(0, Math.min(100, ship.o2 + (o2on ? 16 : -7) * dt));
  }

  const flags = weaponOnline(ship);
  const wRoom = systemRoom(ship, "weapons");
  const health = !wRoom || wRoom.hp <= 0 ? 0 : 0.35 + 0.65 * (wRoom.hp / wRoom.hpMax);
  const man = manned(ship, "weapons") ? 1.2 : 1;
  ship.weapons.forEach((weapon, i) => {
    const def = WEAPONS[weapon.defId];
    if (flags[i] && health > 0) weapon.charge = Math.min(def.charge, weapon.charge + dt * health * man);
    else weapon.charge = Math.max(0, weapon.charge - dt * 0.4);
  });

  for (const crew of ship.crew) {
    if (crew.hp <= 0) continue;
    if (crew.path.length) {
      crew.hop += dt;
      if (crew.hop >= 0.42) {
        crew.room = crew.path.shift();
        crew.hop = 0;
      }
    }
  }

  // Repair, heal, suffocate, brawl.
  const boardersHere = (roomId) => ship.boarders.filter((b) => b.room === roomId && b.hp > 0);
  for (const crew of ship.crew) {
    if (crew.hp <= 0 || crew.path.length) continue;
    const room = roomById(ship, crew.room);
    const foes = boardersHere(crew.room);
    if (ownerIsPlayer && ship.o2 < 12) crew.hp -= 12 * dt;
    if (foes.length) {
      foes[0].hp -= 16 * dt;
      crew.hp -= (10 * dt) / Math.max(1, ship.crew.filter((c) => c.room === crew.room && c.path.length === 0 && c.hp > 0).length);
    } else if (room && room.system && room.hp < room.hpMax && room.repairLock <= 0) {
      const crewed = ship.crew.some((c) => c.hp > 0 && c.room === room.id && c.path.length === 0);
      const rate = room.hp <= 0 ? (crewed ? 0.85 : 0.28) : crewed ? 0.75 : 0.15;
      room.hp = Math.min(room.hpMax, room.hp + rate * dt);
    }
    if (ownerIsPlayer && crew.room === "medbay" && ship.systems.medbay.power > 0) {
      const med = systemRoom(ship, "medbay");
      if (med && med.hp > 0) crew.hp = Math.min(crew.hpMax, crew.hp + 20 * dt);
    }
  }

  if (ownerIsPlayer) {
    for (const boarder of ship.boarders) {
      if (boarder.hp <= 0) continue;
      const foes = ship.crew.filter((c) => c.room === boarder.room && c.hp > 0 && c.path.length === 0);
      if (!foes.length) {
        const room = roomById(ship, boarder.room);
        if (room && room.system) room.hp = Math.max(0, room.hp - 3.2 * dt);
      }
    }
    const before = ship.crew.length;
    ship.crew = ship.crew.filter((c) => c.hp > 0);
    const lost = before - ship.crew.length;
    if (lost > 0) {
      state.stats.crewLost += lost;
      toast(state, lost === 1 ? "A crewmate is gone." : "Crew down.");
      if (state.selectedCrew && !ship.crew.some((c) => c.id === state.selectedCrew)) state.selectedCrew = null;
    }
    ship.boarders = ship.boarders.filter((b) => b.hp > 0);
  }

  for (const room of ship.rooms) {
    room.flash = Math.max(0, room.flash - dt);
    room.repairLock = Math.max(0, (room.repairLock ?? 0) - dt);
  }
}
