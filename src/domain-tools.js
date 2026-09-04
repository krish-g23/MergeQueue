const OBJECT = { type: "object", additionalProperties: false };

export async function registerDomainTools(store, spec, onStatus) {
  const modelContext = await waitForModelContext();
  if (typeof modelContext?.registerTool !== "function") {
    onStatus({ supported: false, registered: 0, total: 9 });
    return;
  }
  const tools = createDomainTools(store, spec);
  const controller = new AbortController();
  window.addEventListener("pagehide", () => controller.abort(), { once: true });
  let registered = 0;
  for (const tool of tools) {
    try {
      await modelContext.registerTool(tool, { signal: controller.signal });
      registered += 1;
      onStatus({ supported: true, registered, total: tools.length });
    } catch (error) {
      console.error(`Could not register ${tool.name}`, error);
    }
  }
  onStatus({ supported: registered > 0, registered, total: tools.length });
}

export function createDomainTools(store, spec) {
  const names = spec.names;
  return [
    {
      name: names.read,
      description: spec.descriptions.read,
      inputSchema: { ...OBJECT, properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => protect(() => {
        const state = store.getState();
        return success(`Read revision ${state.workspace.revision} with ${Object.keys(state.workspace.records).length} ${spec.plural}.`, {
          workspace: spec.publicWorkspace(state.workspace),
          branch: branchSummary(state.branch),
          availableActions: availableActions(state, names),
        });
      }),
    },
    {
      name: names.begin,
      description: spec.descriptions.begin,
      inputSchema: {
        ...OBJECT,
        required: ["intent"],
        properties: {
          intent: { type: "string", minLength: 8, maxLength: 240 },
          expectedWorkspaceRevision: { type: "integer", minimum: 1 },
        },
      },
      execute: async ({ intent, expectedWorkspaceRevision }) => protect(() => {
        const branch = store.beginBranch(intent, expectedWorkspaceRevision);
        return success(`Opened ${branch.id} from revision ${branch.baseRevision}. The live human workspace remains editable.`, {
          branchId: branch.id,
          baseRevision: branch.baseRevision,
          next: `Call ${names.stage}, then ${names.preview}.`,
        });
      }),
    },
    {
      name: names.stage,
      description: spec.descriptions.stage,
      inputSchema: {
        ...OBJECT,
        required: ["branchId", "updates"],
        properties: {
          branchId: { type: "string", minLength: 8, maxLength: 40 },
          updates: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            items: {
              type: "object",
              additionalProperties: false,
              required: [spec.idKey, "patch", "rationale"],
              properties: {
                [spec.idKey]: { type: "string", minLength: 1, maxLength: 60, pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" },
                patch: {
                  type: "object",
                  additionalProperties: false,
                  minProperties: 1,
                  properties: spec.patchSchema,
                },
                rationale: { type: "string", minLength: 3, maxLength: 180 },
              },
            },
          },
        },
      },
      execute: async ({ branchId, updates }) => protect(() => {
        const mapped = updates.map((update) => ({ recordId: update[spec.idKey], patch: update.patch, rationale: update.rationale }));
        const outcomes = store.stageUpdates(branchId, mapped);
        const succeeded = outcomes.filter((item) => item.ok).length;
        return success(`Staged ${succeeded} of ${outcomes.length} proposed changes. The live workspace is unchanged.`, {
          outcomes: outcomes.map((item) => ({ ...item, [spec.idKey]: item.recordId })),
          next: `Call ${names.preview} when the proposal is ready.`,
        });
      }),
    },
    {
      name: names.preview,
      description: spec.descriptions.preview,
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      execute: async ({ branchId }) => protect(() => {
        const preview = store.previewMerge(branchId);
        window.dispatchEvent(new CustomEvent("mergequeue:open-preview"));
        return success(`Merge preview has ${preview.stats.safe} safe fields, ${preview.stats.same} same-result fields, and ${preview.stats.conflicts} conflicts for the human.`, {
          stats: preview.stats,
          conflicts: preview.conflicts.map(spec.publicConflict),
          previewRevision: preview.workspaceRevision,
          next: preview.stats.conflicts ? `Wait for the human to resolve the visible conflicts, then call ${names.status}.` : `Call ${names.request}.`,
        });
      }),
    },
    {
      name: names.conflicts,
      description: spec.descriptions.conflicts,
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      annotations: { readOnlyHint: true },
      execute: async ({ branchId }) => protect(() => {
        const branch = requireBranch(store.getState(), branchId);
        if (!branch.preview) throw new Error("Create a merge preview first.");
        const conflicts = branch.preview.conflicts.filter((conflict) => !conflict.resolution).map(spec.publicConflict);
        return success(`${conflicts.length} conflicts still need a human decision.`, { conflicts });
      }),
    },
    {
      name: names.request,
      description: spec.descriptions.request,
      inputSchema: {
        ...OBJECT,
        required: ["branchId", "expectedPreviewRevision"],
        properties: {
          branchId: { type: "string", minLength: 8, maxLength: 40 },
          expectedPreviewRevision: { type: "integer", minimum: 1 },
        },
      },
      execute: async ({ branchId, expectedPreviewRevision }) => protect(() => {
        const branch = requireBranch(store.getState(), branchId);
        if (!branch.preview) throw new Error("Create a merge preview first.");
        if (branch.preview.workspaceRevision !== expectedPreviewRevision) throw new Error("Preview revision does not match. Create a fresh preview.");
        window.dispatchEvent(new CustomEvent("mergequeue:open-preview"));
        const unresolved = branch.preview.conflicts.filter((conflict) => !conflict.resolution).length;
        return success(unresolved ? `Review opened with ${unresolved} unresolved decisions.` : "Review opened and is ready for explicit human approval.", {
          status: unresolved ? "awaiting_human_resolution" : "awaiting_human_approval",
          unresolved,
          instruction: `The human must act in the visible page. Call ${names.status} afterward.`,
        });
      }),
    },
    {
      name: names.status,
      description: spec.descriptions.status,
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      annotations: { readOnlyHint: true },
      execute: async ({ branchId }) => protect(() => {
        const branch = requireBranch(store.getState(), branchId);
        return success(`Branch ${branch.id} is ${branch.status}.`, { branch: branchSummary(branch) });
      }),
    },
    {
      name: names.abort,
      description: spec.descriptions.abort,
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      execute: async ({ branchId }) => protect(() => {
        store.abortBranch(branchId);
        return success(`Aborted ${branchId}. No proposal was applied to the live workspace.`);
      }),
    },
    {
      name: names.revert,
      description: spec.descriptions.revert,
      inputSchema: { ...OBJECT, required: ["confirmation"], properties: { confirmation: { type: "string", const: "revert" } } },
      execute: async ({ confirmation }) => protect(() => {
        if (confirmation !== "revert") throw new Error("Explicit confirmation is required.");
        const workspace = store.revertLastMerge();
        return success(`Reverted the last merge as revision ${workspace.revision}.`, { revision: workspace.revision });
      }),
    },
  ];
}

async function waitForModelContext() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (typeof document.modelContext?.registerTool === "function") return document.modelContext;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

function protect(operation) {
  try { return operation(); }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}

function success(message, data = {}) {
  return { ok: true, message, ...data };
}

function branchSummary(branch) {
  if (!branch) return null;
  return {
    id: branch.id,
    intent: branch.intent,
    baseRevision: branch.baseRevision,
    status: branch.status,
    operationCount: branch.operations.length,
    preview: branch.preview ? { stats: branch.preview.stats, revision: branch.preview.workspaceRevision } : null,
  };
}

function requireBranch(state, branchId) {
  if (!state.branch || state.branch.id !== branchId) throw new Error("Branch not found.");
  return state.branch;
}

function availableActions(state, names) {
  if (!state.branch || ["merged", "aborted"].includes(state.branch.status)) {
    return [names.begin, ...(state.lastCommit && !state.lastCommit.reverted ? [names.revert] : [])];
  }
  return state.branch.preview
    ? [names.conflicts, names.request, names.status, names.abort]
    : [names.stage, names.preview, names.status, names.abort];
}
