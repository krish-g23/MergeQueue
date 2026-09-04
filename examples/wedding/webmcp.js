import { createDomainTools } from "../../src/domain-tools.js";

export const weddingToolSpec = {
  plural: "guests",
  idKey: "guestId",
  names: {
    read: "get_seating_plan",
    begin: "begin_seating_branch",
    stage: "stage_guest_changes",
    preview: "preview_seating_merge",
    conflicts: "get_seating_conflicts",
    request: "request_seating_merge",
    status: "get_seating_branch_status",
    abort: "abort_seating_branch",
    revert: "revert_seating_merge",
  },
  descriptions: {
    read: "Read the live wedding floor plan, table capacities, meal needs, locked placements, revision, and active agent branch. Use before proposing changes.",
    begin: "Open an isolated seating branch. Guest moves remain proposals while the human continues editing the live floor plan.",
    stage: "Stage bounded table, meal, accessibility, lock, or note changes for up to 20 guests. Never changes the live floor plan.",
    preview: "Three-way merge the original seating plan, current human placements, and agent proposal. Opens a visible human review and never commits.",
    conflicts: "Read unresolved seating or meal conflicts without deciding them for the human.",
    request: "Open the seating review and request human approval. The human alone resolves conflicts and commits in the page.",
    status: "Read whether the seating branch is open, conflicted, awaiting approval, merged, or aborted.",
    abort: "Discard the proposed seating branch without changing the live floor plan.",
    revert: "Revert the latest seating merge after the human explicitly asks to undo it.",
  },
  patchSchema: {
    name: { type: "string", minLength: 1, maxLength: 60 },
    party: { type: "string", minLength: 1, maxLength: 60 },
    tableId: { type: "string", enum: ["head", "family", "garden", "college", "terrace"] },
    meal: { type: "string", enum: ["standard", "vegetarian", "vegan", "halal", "pescatarian", "gluten_free"] },
    accessibility: { type: "string", maxLength: 80 },
    locked: { type: "boolean" },
    note: { type: "string", maxLength: 180 },
  },
  publicWorkspace(workspace) {
    return { id: workspace.id, revision: workspace.revision, tables: workspace.tables, guests: Object.values(workspace.records).map(({ id, name, party, tableId, meal, accessibility, locked, note, version }) => ({ id, name, party, tableId, meal, accessibility, locked, note, version })) };
  },
  publicConflict(conflict) {
    return { id: conflict.id, guestId: conflict.recordId, field: conflict.field, kind: conflict.kind, baseValue: conflict.baseValue, humanValue: conflict.humanValue, agentValue: conflict.agentValue, explanation: conflict.explanation, consequence: conflict.consequence };
  },
};

export function createWeddingTools(store) {
  return createDomainTools(store, weddingToolSpec);
}
