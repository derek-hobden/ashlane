/** Hand-built one-sector graph. Columns run left → right; links only move forward. */
export const NODES = [
  { id: "S", col: 0, row: 1, kind: "start", name: "Rim gate", links: ["A", "B", "C"] },
  { id: "A", col: 1, row: 0, kind: "quest", name: "Courier ping", links: ["D", "E"], event: "courier" },
  { id: "B", col: 1, row: 1, kind: "hostile", name: "Glass span", links: ["D", "E", "F"], enemy: "skiff" },
  { id: "C", col: 1, row: 2, kind: "empty", name: "Cold buoy", links: ["E", "F"], event: "buoy" },
  { id: "D", col: 2, row: 0, kind: "nebula", name: "Rust dust", links: ["E", "G"], nebula: true, event: "dust" },
  { id: "E", col: 2, row: 1, kind: "store", name: "Chandlery", links: ["G", "H", "J"] },
  { id: "F", col: 2, row: 2, kind: "distress", name: "Hauler burn", links: ["H", "J"], event: "hauler" },
  { id: "G", col: 3, row: 0, kind: "quest", name: "Split lane", links: ["I", "J"], event: "rendezvous" },
  { id: "H", col: 3, row: 1, kind: "hostile", name: "Clamp alley", links: ["J", "K"], enemy: "boarder" },
  { id: "I", col: 4, row: 0, kind: "empty", name: "Quiet shelf", links: ["L", "M"], event: "cache" },
  { id: "J", col: 4, row: 1, kind: "hostile", name: "Cinder bend", links: ["K", "L", "M"], enemy: "cutter" },
  { id: "K", col: 4, row: 2, kind: "hostile", name: "Scrap wake", links: ["M", "P"], enemy: "sloop" },
  { id: "L", col: 5, row: 0, kind: "nebula", name: "Violet bank", links: ["N", "P"], nebula: true, event: "dust" },
  { id: "M", col: 5, row: 1, kind: "elite", name: "Monitor post", links: ["N", "P"], enemy: "monitor" },
  { id: "P", col: 6, row: 1, kind: "hostile", name: "Gravel throat", links: ["N"], enemy: "sloop", hazard: "asteroids" },
  { id: "N", col: 7, row: 1, kind: "exit", name: "Reach exit", links: [], enemy: "warden" },
];

