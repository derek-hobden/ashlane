export const SYS = [
  ["shields", "SHD"],
  ["engines", "ENG"],
  ["weapons", "WPN"],
  ["oxygen", "O₂"],
  ["medbay", "MED"],
];

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

export function pips(power, max) {
  let out = "";
  for (let i = 0; i < max; i++) out += i < power ? "●" : "○";
  return out || "—";
}

export function hasSave() {
  try {
    return Boolean(localStorage.getItem("ashlane-save"));
  } catch {
    return false;
  }
}

export function bestLine() {
  try {
    const raw = localStorage.getItem("ashlane-stats");
    if (!raw) return "No cleared sector yet.";
    const stats = JSON.parse(raw);
    return `Best scrap ${stats.bestScrap ?? 0} · clears ${stats.clears ?? 0}`;
  } catch {
    return "";
  }
}
