export const competitions = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Eredivisie",
  "Primeira Liga",
  "Scottish Premiership",
  "Turkish Süper Lig",
  "Belgian Pro League",
  "Brazilian Série A",
  "Argentine Primera División",
  "Colombian Primera A",
  "Chilean Primera División",
  "MLS",
  "Liga MX",
  "Saudi Pro League",
  "J1 League",
  "K League",
  "Chinese Super League",
  "A-League",
  "Egyptian Premier League",
  "South African Premiership",
  "Women’s Super League",
  "Liga F",
  "NWSL",
  "FIFA World Cup",
  "UEFA Euros",
  "Copa América",
  "AFCON",
  "AFC Asian Cup",
  "CONCACAF Gold Cup",
  "Olympic Football",
  "UEFA Nations League",
  "FIFA Club World Cup",
  "UEFA Champions League",
  "UEFA Europa League",
  "UEFA Conference League",
  "Copa Libertadores",
  "Other / custom",
];
export const kitTypes = [
  "Home",
  "Away",
  "Third",
  "Goalkeeper",
  "Special",
  "Historical / concept",
];
export const kitDefaults = {
  enabled: false,
  competition: "Other / custom",
  team: "My team",
  season: "2026/27",
  type: "Home",
  pattern: "solid",
  jersey: "#c5283d",
  accent: "#ffffff",
  shorts: "#ffffff",
  socks: "#c5283d",
  ink: "#ffffff",
  player: "PLAYER",
  number: "10",
  personalize: true,
  mapping: { jersey: -1, shorts: -1, socks: -1 },
};
export function validateKit(k) {
  if (
    !k ||
    typeof k.enabled !== "boolean" ||
    typeof k.personalize !== "boolean"
  )
    throw Error("Invalid kit settings.");
  for (const field of ["jersey", "accent", "shorts", "socks", "ink"])
    if (!/^#[0-9a-f]{6}$/i.test(k[field])) throw Error("Invalid kit colour.");
  for (const [field, max] of [
    ["competition", 80],
    ["team", 80],
    ["season", 30],
    ["player", 20],
  ])
    if (
      typeof k[field] !== "string" ||
      k[field].length > max ||
      /[\u0000-\u001f]/.test(k[field])
    )
      throw Error(`Invalid kit ${field}.`);
  if (
    !kitTypes.includes(k.type) ||
    !["solid", "stripes", "hoops", "sash", "halves"].includes(k.pattern) ||
    typeof k.number !== "string" ||
    !/^\d{0,2}$/.test(k.number)
  )
    throw Error("Invalid kit type, pattern or number.");
  if (!k.mapping) throw Error("Missing kit mesh mapping.");
  const ids = [];
  for (const part of ["jersey", "shorts", "socks"]) {
    const id = k.mapping[part];
    if (!Number.isInteger(id) || id < -1 || id > 10000)
      throw Error("Invalid kit mesh mapping.");
    if (id >= 0) ids.push(id);
  }
  if (new Set(ids).size !== ids.length)
    throw Error("Assign a different mesh to each clothing part.");
  return k;
}
