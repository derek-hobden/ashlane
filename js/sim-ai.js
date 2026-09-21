import { WEAPONS } from "./content.js";
import { currentNode, manned, toast } from "./sim-run.js";
import { makeWeapon, rand, rangePick } from "./sim-ship.js";

function enemyMannedBonus(ship, system) {
  const n = ship.crew.length;
  if (system === "helm") return n >= 1;
  if (system === "weapons" || system === "shields") return n >= 2;
  if (system === "engines") return n >= 3;
  return false;
}

export function stepEnemyCrewProxy(ship) {
  // Enemy crew don't pathfind; manning is a function of headcount.
  // Tag a synthetic "path empty" crew layout so manned() works.
  const want = {
    helm: enemyMannedBonus(ship, "helm"),
    weapons: enemyMannedBonus(ship, "weapons"),
    engines: enemyMannedBonus(ship, "engines"),
    shields: enemyMannedBonus(ship, "shields"),
  };
  let i = 0;
  for (const key of Object.keys(want)) {
    if (!want[key]) continue;
    if (ship.crew[i]) {
      ship.crew[i].room = key;
      ship.crew[i].path = [];
      i += 1;
    }
  }
}

export function pickEnemyTarget(state, player) {
  const roll = rand(state);
  const table = [
    ["weapons", 0.5],
    ["shields", 0.16],
    ["engines", 0.16],
    ["oxygen", 0.1],
    ["helm", 0.08],
  ];
  let acc = 0;
  for (const [id, w] of table) {
    acc += w;
    if (roll <= acc) return id;
  }
  return "weapons";
}

export function checkEnd(state) {
  const combat = state.combat;
  if (!combat || combat.outcome) return;
  if (state.player.hull <= 0 || state.player.crew.length === 0) {
    state.player.hull = Math.max(0, state.player.hull);
    combat.outcome = "lose";
    state.paused = true;
    state.modal = { type: "gameover" };
    state.screen = "gameover";
    return;
  }
  if (combat.enemy && combat.enemy.hull <= 0) {
    combat.enemy.hull = 0;
    combat.outcome = "win";
    grantReward(state, combat.reward);
    const node = currentNode(state);
    if (node) node.cleared = true;
    state.paused = true;
    if (node?.kind === "exit") {
      state.modal = { type: "victory" };
      state.screen = "victory";
    } else {
      state.modal = {
        type: "loot",
        title: `${combat.enemy.name} breaks up`,
        body: rewardText(combat.reward),
      };
    }
  }
}

function rewardText(reward) {
  if (!reward) return "The lane is clear.";
  const bits = [`${reward.scrap} scrap`];
  if (reward.fuel) bits.push(`${reward.fuel} fuel`);
  if (reward.missiles) bits.push(`${reward.missiles} ${reward.missiles === 1 ? "missile" : "missiles"}`);
  if (reward.weapon) bits.push(WEAPONS[reward.weapon].name);
  return `Recovered ${bits.join(", ")}.`;
}

function grantReward(state, reward) {
  if (!reward || reward.granted) return;
  reward.granted = true;
  state.scrap += reward.scrap;
  state.stats.scrapEarned += reward.scrap;
  state.fuel += reward.fuel;
  state.player.missiles += reward.missiles;
  if (reward.weapon) {
    const have = state.player.weapons.some((w) => w.defId === reward.weapon);
    if (have || state.player.weapons.length >= 3) {
      state.scrap += 22;
      toast(state, have ? "Schematic sold for 22 scrap." : "No free slot — schematic sold for 22 scrap.");
    } else {
      state.player.weapons.push(makeWeapon(reward.weapon, "weapons"));
      toast(state, `${WEAPONS[reward.weapon].name} mounted.`);
    }
  }
}

export function rollReward(state, def, extra) {
  const reward = {
    scrap: rangePick(state, def.scrap),
    fuel: rangePick(state, def.fuel),
    missiles: rangePick(state, def.missileLoot),
    weapon: null,
    granted: false,
  };
  if (extra?.scrap) reward.scrap += extra.scrap;
  if (extra?.fuel) reward.fuel += extra.fuel;
  if (extra?.missiles) reward.missiles += extra.missiles;
  if (extra?.weapon) reward.weapon = extra.weapon;
  else if (def.id === "monitor" && rand(state) < 0.35 && !state.player.weapons.some((w) => w.defId === "pike")) {
    reward.weapon = "pike";
  }
  return reward;
}
