import { evasion } from "./sim-crew.js";
import { roomById, shieldCap } from "./sim-run.js";
import { rand } from "./sim-ship.js";

export function stepQueue(state, ship, dt, targetShip) {
  for (const shot of ship.queue) shot.t -= dt;
  const ready = ship.queue.filter((shot) => shot.t <= 0);
  ship.queue = ship.queue.filter((shot) => shot.t > 0);
  for (const shot of ready) {
    state.combat.projectiles.push({
      id: `p${state.clock.toFixed(3)}-${shot.kind}-${shot.target}`,
      kind: shot.kind,
      damage: shot.damage,
      sys: shot.sys,
      ion: shot.ion,
      from: ship.side,
      target: shot.target,
      dist: 0,
      speed: shot.kind === "missile" ? 0.72 : 1.15,
    });
  }
  void targetShip;
}

function applyIon(ship) {
  ship.ionStacks = Math.min(4, ship.ionStacks + 1);
  ship.ionT = 7;
  const cap = shieldCap(ship);
  if (ship.shieldBubbles > cap) ship.shieldBubbles = cap;
}

export function resolveImpact(state, defender, shot) {
  const evade = evasion(defender);
  if (rand(state) < evade) return { result: "evade" };
  if ((shot.kind === "laser" || shot.kind === "ion") && defender.shieldBubbles > 0 && shieldCap(defender) > 0) {
    defender.shieldBubbles -= 1;
    const room = roomById(defender, "shields");
    if (room) room.flash = 0.12;
    return { result: "shield" };
  }
  if (shot.kind === "ion") {
    applyIon(defender);
    return { result: "ion" };
  }
  defender.hull -= shot.damage;
  const room = roomById(defender, shot.target) ?? roomById(defender, "weapons");
  if (room) {
    room.flash = 0.18;
    room.repairLock = 5;
    if (room.system) room.hp = Math.max(0, room.hp - shot.sys);
  }
  if (defender.side === "player") state.combat.shake = Math.min(0.35, (state.combat.shake ?? 0) + 0.18);
  return { result: "hit", damage: shot.damage, room: room?.id ?? shot.target };
}

