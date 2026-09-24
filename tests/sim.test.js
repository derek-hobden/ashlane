import assert from "node:assert/strict";
import test from "node:test";
import { NODES } from "../js/content.js";
import {
  buy,
  choose,
  closeModal,
  doorsAreSymmetric,
  jump,
  newRun,
  orderMove,
  sectorLinksOk,
  setPower,
  shortestJumps,
  startCombat,
  step,
  storeItems,
} from "../js/sim.js";

test("rooms connect both ways and the sector is one piece", () => {
  assert.equal(doorsAreSymmetric(), true);
  assert.equal(sectorLinksOk(NODES), true);
  const shortest = shortestJumps(NODES);
  assert.ok(shortest >= 5 && shortest <= 6, `shortest jumps ${shortest}`);
  assert.equal(NODES.length, 16);
});

test("reactor power never exceeds the cap", () => {
  const state = newRun(3);
  for (const key of Object.keys(state.player.systems)) setPower(state, key, 9);
  const used = Object.values(state.player.systems).reduce((sum, sys) => sum + sys.power, 0);
  assert.ok(used <= state.player.reactor);
  assert.equal(state.player.systems.shields.power, 2);
});

function tune(state) {
  for (const key of ["shields", "engines", "weapons", "oxygen", "medbay"]) setPower(state, key, 0);
  const hurt = state.player.crew.some((c) => c.hp < 55);
  const plan = hurt
    ? [["shields", 2], ["oxygen", 1], ["weapons", 2], ["medbay", 1], ["engines", 1]]
    : [["shields", 2], ["oxygen", 1], ["weapons", 2], ["engines", 2]];
  for (const [key, value] of plan) setPower(state, key, value);
}

function fight(state, limit = 150) {
  state.paused = false;
  if (state.modal?.type === "tutorial") state.modal = null;
  let t = 0;
  while (state.combat && !state.combat.outcome && t < limit) {
    tune(state);
    const enemy = state.combat.enemy;
    if (enemy) {
      const weapons = enemy.rooms.find((r) => r.id === "weapons");
      const target = weapons && weapons.hp > 0 ? "weapons" : "shields";
      for (const weapon of state.player.weapons) weapon.target = target;
      weaponAutofire(state);
    }
    const boarder = state.player.boarders.find((b) => b.hp > 0);
    if (boarder) {
      const present = state.player.crew.some((c) => c.id !== "ilya" && c.room === boarder.room && c.path.length === 0 && c.hp > 0);
      if (!present) {
        const mover = state.player.crew.find((c) => c.id !== "ilya" && c.hp > 30 && c.path.length === 0);
        if (mover && mover.room !== boarder.room) orderMove(state, mover.id, boarder.room);
      }
    }
    step(state, 0.05);
    t += 0.05;
  }
  return { outcome: state.combat?.outcome ?? state.screen, t, hull: state.player.hull };
}

function weaponAutofire(state) {
  for (const weapon of state.player.weapons) weapon.autofire = true;
}

test("short lane clears the sector", () => {
  const state = newRun(11);
  state.introSeen = true;
  const route = ["B", "E", "J", "M", "N"];
  for (const id of route) {
    if (state.modal?.type === "store") {
      storeItems(state);
      if (state.player.missiles < 6 && state.scrap >= 11) buy(state, "missiles3");
      if (state.player.hull < 22 && state.scrap >= 10) buy(state, "repair5");
      closeModal(state);
    }
    const jumped = jump(state, id);
    assert.equal(jumped.ok, true, jumped.reason);
    if (state.screen === "combat") {
      const result = fight(state);
      assert.equal(result.outcome, "win", `lost at ${id} after ${result.t}s hull ${result.hull}`);
      if (state.modal?.type === "loot") closeModal(state);
    }
  }
  assert.equal(state.screen, "victory");
  assert.ok(state.player.hull > 0);
  assert.ok(state.fuel >= 0);
});

test("distress choice and dust jump do not advance the armada", () => {
  const state = newRun(4);
  state.introSeen = true;
  assert.equal(jump(state, "A").ok, true);
  assert.equal(state.modal?.type, "event");
  const stay = choose(state, 2);
  assert.equal(stay.ok, true);
  assert.equal(jump(state, "D").ok, true);
  assert.equal(choose(state, 0).ok, true);
  const before = state.sector.fleetCol;
  assert.equal(jump(state, "E").ok, true);
  assert.equal(state.sector.fleetCol, before, "leaving dust should not advance the armada");
});

test("a boarder is one of the enemy's own crew", () => {
  const state = newRun(5);
  state.introSeen = true;
  startCombat(state, "boarder");
  const enemy = state.combat.enemy;
  for (const weapon of state.player.weapons) weapon.autofire = false;
  state.paused = false;
  state.modal = null;
  const crewBefore = enemy.crew.map((c) => c.id);
  assert.equal(crewBefore.length, 3);
  let t = 0;
  while (state.player.boarders.length === 0 && t < 30) {
    step(state, 0.05);
    t += 0.05;
  }
  assert.equal(state.player.boarders.length, 1, "boarder should arrive");
  const boarder = state.player.boarders[0];
  assert.ok(crewBefore.includes(boarder.id), "boarder came from the enemy crew");
  assert.equal(enemy.crew.length, 2, "enemy has one fewer crew aboard");
  assert.ok(!enemy.crew.some((c) => c.id === boarder.id));
});
