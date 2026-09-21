# Ashlane

A one-sector space roguelike. You fly the courier **Wren** across **the Cinder Reach**: a hand-built chart of 16 beacons, ship-to-ship fights, a store, distress calls, dust that throws off the pursuing armada, and an exit guardian.

It is an original game. The beacon chart, crew, and system combat are the genre — not Subset Games’ writing, ships, or art.

## Play

Landscape. On an iPhone 12 Pro Max (926×428 CSS pixels) the shell uses the full screen, including the notch and home-indicator safe areas, and asks you to rotate if the phone is upright.

- Jump linked beacons. Each jump costs 1 fuel.
- The red line is the Cinder Armada. Beacons it has passed are under battery fire.
- Dust beacons: the armada does not gain when you jump away.
- In a fight, reactor power is limited. Shields stop shots, engines dodge, weapons must be powered to charge.
- Missiles ignore shields and spend ammo.
- Tap a weapon, then an enemy room, to aim. AUTO fires when the bar is full.
- Tap your crew, then a room, to move them.

The short lane is five jumps and still has a store, three fights, and the exit. Longer routes pick up the quest, a boarder, and more scrap — and give the armada time to catch the exit.

## Local

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`. Tests:

```bash
node --test tests/sim.test.js
```
