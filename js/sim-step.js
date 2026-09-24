import { ENEMIES, WEAPONS } from "./content.js";
import { checkEnd, pickEnemyTarget, rollReward, stepEnemyCrewProxy } from "./sim-ai.js";
import { evasion, tryFire, weaponOnline } from "./sim-crew.js";
import { resolveImpact, stepQueue } from "./sim-fight.js";
import { stepVessel } from "./sim-vessel.js";
import { currentNode, decayToasts, roomById, shieldCap, toast } from "./sim-run.js";
import { createEnemy, rand, rint } from "./sim-ship.js";

export function startCombat(state, enemyId, extras = {}) {
  const def = ENEMIES[enemyId];
  if (!def) return;
  const node = currentNode(state);
  const enemy = createEnemy(def);
  const asb = node && node.col <= state.sector.fleetCol;
  state.combat = {
    enemy,
    enemyId,
    projectiles: [],
    floats: [],
    asb: asb ? { t: 9, warn: 0, roomId: null } : null,
    rocks: node?.hazard === "asteroids" ? { t: 8 } : null,
    time: 0,
    outcome: null,
    reward: rollReward(state, def, extras.reward),
    shake: 0,
    tutorial: !state.introSeen,
  };
  state.screen = "combat";
  state.player.shieldBubbles = shieldCap(state.player);
  if (!state.introSeen) {
    state.introSeen = true;
    state.paused = true;
    state.modal = { type: "tutorial" };
  } else {
    state.paused = false;
    state.modal = null;
  }
  toast(state, asb ? `${def.name} — and the armada has this beacon.` : `${def.name} on the lane.`);
}

function stepHazards(state, dt) {
  const combat = state.combat;
  if (combat.asb) {
    if (combat.asb.warn > 0) {
      combat.asb.warn -= dt;
      if (combat.asb.warn <= 0) {
        const room = roomById(state.player, combat.asb.roomId);
        state.player.hull -= 2;
        if (room && room.system) room.hp = Math.max(0, room.hp - 3);
        if (room) room.flash = 0.3;
        combat.shake = 0.4;
        toast(state, "Armada battery hits " + (room?.id ?? "the hull") + ".");
        combat.asb.roomId = null;
        combat.asb.t = 12;
      }
    } else {
      combat.asb.t -= dt;
      if (combat.asb.t <= 0) {
        const rooms = state.player.rooms.filter((r) => r.system);
        combat.asb.roomId = rooms[rint(state, rooms.length)].id;
        combat.asb.warn = 2.4;
        toast(state, "Battery lock — " + combat.asb.roomId + ".");
      }
    }
  }
  if (combat.rocks) {
    combat.rocks.t -= dt;
    if (combat.rocks.t <= 0) {
      combat.rocks.t = 11;
      if (rand(state) > evasion(state.player) + 0.25) {
        state.player.hull -= 1;
        combat.shake = 0.2;
        toast(state, "Gravel chips the hull.");
      } else toast(state, "Gravel skims past.");
    }
  }
}

function stepCombat(state, dt) {
  const combat = state.combat;
  combat.time += dt;
  combat.shake = Math.max(0, (combat.shake ?? 0) - dt);
  stepVessel(state, state.player, dt, true);
  if (combat.enemy) {
    stepEnemyCrewProxy(combat.enemy);
    stepVessel(state, combat.enemy, dt, false);

    const pFlags = weaponOnline(state.player);
    state.player.weapons.forEach((weapon, i) => {
      if (weapon.autofire && pFlags[i]) tryFire(state, state.player, i, combat.enemy);
    });
    const eFlags = weaponOnline(combat.enemy);
    combat.enemy.weapons.forEach((weapon, i) => {
      if (!eFlags[i]) return;
      const def = WEAPONS[weapon.defId];
      if (weapon.charge >= def.charge - 0.02) weapon.target = pickEnemyTarget(state, state.player);
      tryFire(state, combat.enemy, i, state.player);
    });

    stepQueue(state, state.player, dt, combat.enemy);
    stepQueue(state, combat.enemy, dt, state.player);
  }

  for (const shot of combat.projectiles) shot.dist += shot.speed * dt;
  const arrived = combat.projectiles.filter((shot) => shot.dist >= 1);
  combat.projectiles = combat.projectiles.filter((shot) => shot.dist < 1);
  for (const shot of arrived) {
    const defender = shot.from === "player" ? combat.enemy : state.player;
    const result = resolveImpact(state, defender, shot);
    const label = result.result === "hit" ? `-${result.damage}` : result.result === "shield" ? "block" : result.result === "evade" ? "evade" : "ion";
    combat.floats.push({
      text: label,
      side: defender.side,
      room: shot.target,
      life: 0.8,
    });
    if (result.result === "hit" && defender.side === "player") toast(state, `Hull hit${result.room ? " — " + result.room : ""}.`);
  }
  for (const f of combat.floats) f.life -= dt;
  combat.floats = combat.floats.filter((f) => f.life > 0).slice(-16);

  if (combat.enemy && combat.enemy.boardersLeft > 0) {
    const enemy = combat.enemy;
    enemy.teleportT -= dt;
    if (enemy.teleportT <= 0) {
      enemy.boardersLeft -= 1;
      enemy.teleportT = 22;
      // A boarder is one of the enemy's own crew: they leave their ship, keeping their health.
      const idx = enemy.crew.findLastIndex((c) => c.boards && c.hp > 0);
      if (idx >= 0) {
        const [crew] = enemy.crew.splice(idx, 1);
        const rooms = state.player.rooms;
        const room = rooms[rint(state, rooms.length)].id;
        state.player.boarders.push({ id: crew.id, hp: crew.hp, hpMax: crew.hpMax, room, from: crew.room });
        toast(state, "Boarder in " + room + ".");
      }
    }
  }

  stepHazards(state, dt);
  checkEnd(state);
}

export function step(state, dt) {
  const capped = Math.max(0, Math.min(0.05, dt));
  state.clock += capped;
  decayToasts(state, capped);
  const blocked = state.modal && state.modal.type !== "tutorial";
  if (state.screen === "combat" && state.combat && !state.paused && !blocked && !state.combat.outcome) {
    stepCombat(state, capped);
  }
}
