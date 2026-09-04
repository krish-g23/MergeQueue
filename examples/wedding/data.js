const TABLES = {
  head: { id: "head", name: "Head table", note: "Wedding party", capacity: 6 },
  family: { id: "family", name: "Family table", note: "Near the dance floor", capacity: 8 },
  garden: { id: "garden", name: "Garden table", note: "Quiet conversation", capacity: 8 },
  college: { id: "college", name: "College friends", note: "High energy", capacity: 8 },
  terrace: { id: "terrace", name: "Terrace table", note: "Near the aisle", capacity: 8 },
};

function guest(id, name, party, tableId, meal = "standard", note = "") {
  return {
    id,
    name,
    party,
    tableId,
    meal,
    accessibility: "none",
    locked: false,
    note,
    version: 1,
    updatedAt: "2026-09-01T09:00:00.000Z",
  };
}

export const WEDDING_FIELDS = ["name", "party", "tableId", "meal", "accessibility", "locked", "note"];

export function createWeddingSeed() {
  const guests = [
    guest("ava", "Ava", "Wedding party", "head", "vegetarian"),
    guest("marcus", "Marcus", "Wedding party", "head"),
    guest("nina", "Nina", "Wedding party", "head", "vegan"),
    guest("theo", "Theo", "Wedding party", "head"),
    guest("grandma-rose", "Grandma Rose", "Bride's family", "family", "standard", "Keep close to Ava"),
    guest("uncle-ben", "Uncle Ben", "Bride's family", "family"),
    guest("leila", "Leila", "Bride's family", "family", "halal"),
    guest("omar", "Omar", "Bride's family", "family", "halal"),
    guest("jordan", "Jordan", "College", "college"),
    guest("casey", "Casey", "College", "college", "vegetarian"),
    guest("morgan", "Morgan", "College", "college"),
    guest("riley", "Riley", "College", "college"),
    guest("alex", "Alex", "College", "college"),
    guest("becca", "Becca", "College", "college", "vegan"),
    guest("priya", "Priya", "Work friends", "garden", "vegetarian"),
    guest("daniel", "Daniel", "Work friends", "garden"),
    guest("mei", "Mei", "Work friends", "garden", "pescatarian"),
    guest("sora", "Sora", "Work friends", "garden"),
    guest("iris", "Iris", "Neighbors", "terrace"),
    guest("leo", "Leo", "Neighbors", "terrace", "vegetarian"),
    guest("fatima", "Fatima", "Neighbors", "terrace", "halal"),
    guest("sam", "Sam", "Neighbors", "terrace"),
    guest("photographer", "June", "Vendors", "terrace", "standard", "Photographer; keep near aisle"),
    guest("dj", "Milo", "Vendors", "garden", "vegan"),
  ];
  return {
    workspace: {
      id: "ava-marcus-wedding",
      revision: 1,
      tables: TABLES,
      records: Object.fromEntries(guests.map((item) => [item.id, item])),
      updatedAt: new Date().toISOString(),
    },
    branch: null,
    lastCommit: null,
    activity: [{ id: crypto.randomUUID(), actor: "system", title: "Reception plan ready", detail: "24 guests · 5 tables · every human move stays live", at: new Date().toISOString() }],
  };
}

export const weddingAgentUpdates = [
  { recordId: "grandma-rose", patch: { tableId: "garden" }, rationale: "A quieter table improves conversation." },
  { recordId: "jordan", patch: { tableId: "garden" }, rationale: "Balance table sizes and mix social groups." },
  { recordId: "priya", patch: { meal: "vegan" }, rationale: "Use the stricter plant-based meal constraint." },
  { recordId: "alex", patch: { tableId: "garden" }, rationale: "Balance the college table." },
  { recordId: "becca", patch: { tableId: "terrace" }, rationale: "Seat vegan guests closer to service." },
  { recordId: "daniel", patch: { tableId: "college" }, rationale: "Balance table occupancy." },
  { recordId: "mei", patch: { tableId: "family" }, rationale: "Place Mei near people she knows." },
  { recordId: "leo", patch: { tableId: "garden" }, rationale: "Balance terrace capacity." },
  { recordId: "fatima", patch: { tableId: "family" }, rationale: "Keep halal meals in one service zone." },
  { recordId: "dj", patch: { tableId: "terrace" }, rationale: "Keep vendors near the aisle." },
  { recordId: "uncle-ben", patch: { note: "Keep near Grandma Rose" }, rationale: "Preserve the family support pair." },
  { recordId: "photographer", patch: { locked: true }, rationale: "Do not move the photographer away from the aisle." },
];

export const weddingHumanUpdates = [
  { recordId: "grandma-rose", patch: { tableId: "head" } },
  { recordId: "jordan", patch: { tableId: "family" } },
  { recordId: "priya", patch: { meal: "gluten_free" } },
  { recordId: "photographer", patch: { locked: true } },
];

export const weddingMergeConfig = {
  fields: WEDDING_FIELDS,
  singular: "guest",
  fieldLabels: {
    name: "the guest name",
    party: "the guest group",
    tableId: "the table assignment",
    meal: "the meal requirement",
    accessibility: "the accessibility requirement",
    locked: "the locked status",
    note: "the planning note",
  },
  consequences: {
    tableId: "This guest can only occupy one table in the final floor plan.",
    meal: "The caterer will receive only the approved meal requirement.",
    locked: "A locked guest cannot be moved by later automation.",
  },
  classifyConflict(field) {
    return field === "tableId" ? "seat_conflict" : field === "meal" ? "meal_conflict" : "guest_conflict";
  },
};

export const weddingStoreConfig = {
  storageKey: "merge-queue-wedding-v1",
  createSeed: createWeddingSeed,
  fields: WEDDING_FIELDS,
  singular: "guest",
  singularLabel: "Guest",
  getName: (record) => record?.name ?? "guest",
  mergeConfig: weddingMergeConfig,
  validatePatch(patch) {
    if (patch.tableId && !TABLES[patch.tableId]) throw new Error(`Unknown table: ${patch.tableId}`);
    if (patch.meal && !["standard", "vegetarian", "vegan", "halal", "pescatarian", "gluten_free"].includes(patch.meal)) throw new Error(`Unknown meal: ${patch.meal}`);
    if (patch.locked !== undefined && typeof patch.locked !== "boolean") throw new Error("locked must be a boolean");
  },
  describePatch(before, patch, workspace) {
    const parts = [];
    if (patch.tableId && patch.tableId !== before.tableId) parts.push(`${workspace.tables[before.tableId].name} → ${workspace.tables[patch.tableId].name}`);
    if (patch.meal && patch.meal !== before.meal) parts.push(`meal → ${patch.meal.replaceAll("_", " ")}`);
    if (patch.locked !== undefined && patch.locked !== before.locked) parts.push(patch.locked ? "locked" : "unlocked");
    if (patch.note && patch.note !== before.note) parts.push("note updated");
    return parts.join(" · ") || "Guest details updated.";
  },
};
