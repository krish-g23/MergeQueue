import { createDomainTools } from "../../src/domain-tools.js";

export const shopToolSpec = {
  plural: "products",
  idKey: "productId",
  names: {
    read: "get_catalog",
    begin: "begin_merchandising_branch",
    stage: "stage_product_changes",
    preview: "preview_catalog_merge",
    conflicts: "get_catalog_conflicts",
    request: "request_catalog_merge",
    status: "get_merchandising_branch_status",
    abort: "abort_merchandising_branch",
    revert: "revert_catalog_merge",
  },
  descriptions: {
    read: "Read the live merchant catalog, prices, inventory, publication state, collections, price locks, revision, and active branch. Use before proposing changes.",
    begin: "Open an isolated merchandising branch while the merchant keeps editing the live catalog.",
    stage: "Stage bounded price, inventory, collection, feature, protection, or publication changes for up to 20 products. Never changes the live catalog.",
    preview: "Three-way merge the branch base, current merchant edits, and agent proposal. Opens a visible review and never publishes.",
    conflicts: "Read unresolved price, inventory, or publication conflicts without deciding them for the merchant.",
    request: "Open the catalog review and request human approval. The merchant alone resolves conflicts and publishes in the page.",
    status: "Read whether the merchandising branch is open, conflicted, awaiting approval, merged, or aborted.",
    abort: "Discard the merchandising branch without changing the live catalog.",
    revert: "Revert the latest catalog merge after the merchant explicitly asks to undo it.",
  },
  patchSchema: {
    name: { type: "string", minLength: 1, maxLength: 70 },
    collectionId: { type: "string", enum: ["lighting", "travel", "desk", "home"] },
    price: { type: "number", minimum: 0, maximum: 100000 },
    compareAtPrice: { type: ["number", "null"], minimum: 0, maximum: 100000 },
    inventory: { type: "integer", minimum: 0, maximum: 100000 },
    status: { type: "string", enum: ["active", "draft", "archived"] },
    featured: { type: "boolean" },
    protectedPrice: { type: "boolean" },
  },
  publicWorkspace(workspace) {
    return {
      id: workspace.id,
      revision: workspace.revision,
      currency: workspace.currency,
      collections: workspace.collections,
      products: Object.values(workspace.records).map(({
        id, name, collectionId, price, compareAtPrice, inventory, status, featured, protectedPrice, version,
      }) => ({ id, name, collectionId, price, compareAtPrice, inventory, status, featured, protectedPrice, version })),
    };
  },
  publicConflict(conflict) {
    return {
      id: conflict.id,
      productId: conflict.recordId,
      field: conflict.field,
      kind: conflict.kind,
      baseValue: conflict.baseValue,
      humanValue: conflict.humanValue,
      agentValue: conflict.agentValue,
      explanation: conflict.explanation,
      consequence: conflict.consequence,
    };
  },
};

export function createShopTools(store) {
  return createDomainTools(store, shopToolSpec);
}
