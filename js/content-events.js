export const EVENTS = {
  courier: {
    id: "courier",
    title: "Split courier",
    body: "A courier is leaking fuel across the lane. They will hand over a Pike schematic if you meet them at Split lane, ahead of the armada. The crate is also right here, unguarded.",
    choices: [
      { label: "Agree to the rendezvous", effect: "quest-start" },
      { label: "Crack the crate", effect: "scrap-hull", scrap: 18, hull: -3 },
      { label: "Leave them", effect: "leave" },
    ],
  },
  rendezvous: {
    id: "rendezvous",
    title: "Split lane",
    body: "The courier’s transponder is a whisper. If you promised to meet, they’re pinned by an ash monitor. Otherwise the lane is just slag and static.",
    choices: [
      { label: "Honor the meet", effect: "quest-fight", requiresQuest: true },
      { label: "Search the slag", effect: "search", scrap: [6, 12], fuel: 0.35 },
      { label: "Move on", effect: "leave" },
    ],
  },
  hauler: {
    id: "hauler",
    title: "Burning hauler",
    body: "A hauler is venting air. Its captain asks you to cut the skiff clamped to their hull. The locker is yours either way — if you can live with how you take it.",
    choices: [
      { label: "Fight the skiff", effect: "fight", enemy: "cutter", reward: { scrap: 18, fuel: 2, missiles: 1 } },
      { label: "Strip the locker and go", effect: "scrap-hull", scrap: 16, hull: -4 },
      { label: "Stay clear", effect: "leave" },
    ],
  },
  buoy: {
    id: "buoy",
    title: "Cold buoy",
    body: "No hail. The buoy’s hull is filmed with ash, and a maintenance hatch is still warm.",
    choices: [
      { label: "Search the hatch", effect: "search", scrap: [4, 10], fuel: 0.55, missiles: 0.25 },
      { label: "Leave it sealed", effect: "leave" },
    ],
  },
  cache: {
    id: "cache",
    title: "Quiet shelf",
    body: "A shelf of rock hides a courier cache. The seal is intact.",
    choices: [
      { label: "Break the seal", effect: "search", scrap: [8, 14], fuel: 0.7, missiles: 0.65 },
      { label: "Leave it", effect: "leave" },
    ],
  },
  dust: {
    id: "dust",
    title: "Ionized dust",
    body: "Rust-colored dust wraps the beacon. A jump that starts in this cloud throws off the armada’s fix — they will not gain on you when you leave.",
    choices: [{ label: "Chart it", effect: "leave" }],
  },
};

export const KIND_LABEL = {
  start: "Start",
  hostile: "Hostile",
  elite: "Elite",
  store: "Store",
  empty: "Quiet",
  distress: "Distress",
  nebula: "Dust",
  quest: "Signal",
  exit: "Exit",
};
