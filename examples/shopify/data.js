const COLLECTIONS = {
  lighting: { id: "lighting", name: "Lighting" },
  travel: { id: "travel", name: "Travel" },
  desk: { id: "desk", name: "Desk essentials" },
  home: { id: "home", name: "Modern home" },
};

function product(id, name, collectionId, price, inventory, status, tone) {
  return {
    id,
    name,
    collectionId,
    price,
    compareAtPrice: null,
    inventory,
    status,
    featured: false,
    protectedPrice: false,
    tone,
    version: 1,
    updatedAt: "2026-09-01T09:00:00.000Z",
  };
}

export const SHOP_FIELDS = ["name", "collectionId", "price", "compareAtPrice", "inventory", "status", "featured", "protectedPrice"];

export function createShopSeed() {
  const products = [
    product("aurora-lamp", "Aurora table lamp", "lighting", 129, 16, "active", "amber"),
    product("weekender", "Canvas weekender", "travel", 96, 18, "active", "clay"),
    product("linen-throw", "Washed linen throw", "home", 84, 7, "active", "sage"),
    product("arc-lamp", "Arc floor lamp", "lighting", 249, 4, "active", "graphite"),
    product("carry-pouch", "Utility carry pouch", "travel", 34, 42, "active", "sand"),
    product("desk-tray", "Oak desk tray", "desk", 58, 21, "active", "oak"),
    product("pin-board", "Linen pin board", "desk", 72, 0, "draft", "linen"),
    product("stone-vase", "Carved stone vase", "home", 118, 6, "active", "stone"),
    product("task-light", "Pivot task light", "desk", 149, 11, "active", "blue"),
    product("travel-flask", "Insulated travel flask", "travel", 48, 30, "active", "forest"),
    product("old-caddy", "Archive desk caddy", "desk", 39, 0, "active", "rust"),
    product("wool-cushion", "Loop wool cushion", "home", 76, 14, "active", "rose"),
  ];
  return {
    workspace: {
      id: "north-star-goods",
      revision: 1,
      currency: "USD",
      collections: COLLECTIONS,
      records: Object.fromEntries(products.map((item) => [item.id, item])),
      updatedAt: new Date().toISOString(),
    },
    branch: null,
    lastCommit: null,
    activity: [{ id: crypto.randomUUID(), actor: "system", title: "Catalog synced", detail: "12 products · 4 collections · no live store connection", at: new Date().toISOString() }],
  };
}

export const shopAgentUpdates = [
  { recordId: "aurora-lamp", patch: { price: 119, compareAtPrice: 129 }, rationale: "Create a clear hero offer for the weekend edit." },
  { recordId: "weekender", patch: { inventory: 24 }, rationale: "Reflect the expected warehouse intake." },
  { recordId: "linen-throw", patch: { status: "draft" }, rationale: "Low stock makes it risky to promote." },
  { recordId: "arc-lamp", patch: { featured: true }, rationale: "High-margin product anchors the lighting collection." },
  { recordId: "carry-pouch", patch: { price: 29, compareAtPrice: 34, featured: true }, rationale: "Use as the entry-price travel item." },
  { recordId: "desk-tray", patch: { featured: true }, rationale: "Healthy inventory and strong visual merchandising." },
  { recordId: "pin-board", patch: { status: "draft" }, rationale: "Keep the zero-stock product unpublished." },
  { recordId: "stone-vase", patch: { collectionId: "desk" }, rationale: "Cross-merchandise with workspace styling." },
  { recordId: "task-light", patch: { price: 139, compareAtPrice: 149 }, rationale: "Create a complementary desk promotion." },
  { recordId: "travel-flask", patch: { featured: true }, rationale: "Deep inventory supports homepage placement." },
  { recordId: "old-caddy", patch: { status: "archived" }, rationale: "Zero inventory and stale performance." },
  { recordId: "wool-cushion", patch: { collectionId: "desk" }, rationale: "Use as an office-chair accessory." },
];

export const shopHumanUpdates = [
  { recordId: "aurora-lamp", patch: { price: 124 } },
  { recordId: "weekender", patch: { inventory: 12 } },
  { recordId: "linen-throw", patch: { status: "archived" } },
  { recordId: "arc-lamp", patch: { protectedPrice: true } },
];

export const shopMergeConfig = {
  fields: SHOP_FIELDS,
  singular: "product",
  fieldLabels: {
    name: "the product name",
    collectionId: "the collection",
    price: "the selling price",
    compareAtPrice: "the comparison price",
    inventory: "the inventory count",
    status: "the publication status",
    featured: "homepage placement",
    protectedPrice: "the price lock",
  },
  consequences: {
    price: "The storefront will display only the price you approve.",
    inventory: "Inventory drives availability and overselling protection.",
    status: "This controls whether customers can discover and buy the product.",
  },
  classifyConflict(field) {
    return field === "price" ? "price_conflict" : field === "inventory" ? "inventory_conflict" : field === "status" ? "publication_conflict" : "catalog_conflict";
  },
};

export const shopStoreConfig = {
  storageKey: "merge-queue-shop-v1",
  createSeed: createShopSeed,
  fields: SHOP_FIELDS,
  singular: "product",
  singularLabel: "Product",
  getName: (record) => record?.name ?? "product",
  mergeConfig: shopMergeConfig,
  validatePatch(patch) {
    if (patch.collectionId && !COLLECTIONS[patch.collectionId]) throw new Error(`Unknown collection: ${patch.collectionId}`);
    if (patch.status && !["active", "draft", "archived"].includes(patch.status)) throw new Error(`Unknown status: ${patch.status}`);
    if (patch.price !== undefined && (!Number.isFinite(patch.price) || patch.price < 0 || patch.price > 100000)) throw new Error("price must be between 0 and 100000");
    if (patch.inventory !== undefined && (!Number.isInteger(patch.inventory) || patch.inventory < 0 || patch.inventory > 100000)) throw new Error("inventory must be a non-negative integer");
  },
  describePatch(before, patch, workspace) {
    const parts = [];
    if (patch.price !== undefined && patch.price !== before.price) parts.push(`$${before.price} → $${patch.price}`);
    if (patch.inventory !== undefined && patch.inventory !== before.inventory) parts.push(`stock ${before.inventory} → ${patch.inventory}`);
    if (patch.status && patch.status !== before.status) parts.push(`${before.status} → ${patch.status}`);
    if (patch.collectionId && patch.collectionId !== before.collectionId) parts.push(`${workspace.collections[before.collectionId].name} → ${workspace.collections[patch.collectionId].name}`);
    if (patch.featured !== undefined && patch.featured !== before.featured) parts.push(patch.featured ? "featured" : "unfeatured");
    if (patch.protectedPrice !== undefined && patch.protectedPrice !== before.protectedPrice) parts.push(patch.protectedPrice ? "price locked" : "price unlocked");
    return parts.join(" · ") || "Product details updated.";
  },
};
