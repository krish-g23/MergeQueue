const OBJECT = { type: "object", additionalProperties: false };

let registrationSession = null;

function ok(message, data = {}) {
  return { ok: true, message, ...data };
}

function failure(error) {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

export async function registerWebMCPTools(store, onStatus) {
  const tools = createTools(store);
  onStatus({ supported: null, registered: registrationSession?.registered.size || 0, total: tools.length });
  const modelContext = await waitForModelContext();
  if (typeof modelContext?.registerTool !== "function") {
    const status = { supported: false, registered: 0, total: tools.length };
    onStatus(status);
    return status;
  }

  if (!registrationSession || registrationSession.modelContext !== modelContext) {
    const controller = new AbortController();
    registrationSession = { modelContext, controller, registered: new Set() };
    window.addEventListener("pagehide", () => controller.abort(), { once: true });
  }

  for (const tool of tools) {
    if (registrationSession.registered.has(tool.name)) continue;
    try {
      await modelContext.registerTool(withVisibleTrace(tool), { signal: registrationSession.controller.signal });
      registrationSession.registered.add(tool.name);
      onStatus({ supported: true, registered: registrationSession.registered.size, total: tools.length });
    } catch (error) {
      console.error(`Could not register ${tool.name}`, error);
    }
  }
  const status = {
    supported: registrationSession.registered.size > 0,
    registered: registrationSession.registered.size,
    total: tools.length,
  };
  onStatus(status);
  return status;
}

function withVisibleTrace(tool) {
  return {
    ...tool,
    execute: async (input) => {
      const callId = `webmcp-${crypto.randomUUID()}`;
      dispatchToolCall({
        callId,
        name: tool.name,
        source: "webmcp",
        status: "running",
        message: "ChatGPT is calling this page tool…",
      });
      try {
        const result = await tool.execute(input);
        dispatchToolCall({
          callId,
          name: tool.name,
          source: "webmcp",
          status: result?.ok === false ? "error" : "success",
          message: result?.message || result?.error || "Tool call completed.",
        });
        return result;
      } catch (error) {
        dispatchToolCall({
          callId,
          name: tool.name,
          source: "webmcp",
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
}

function dispatchToolCall(detail) {
  window.dispatchEvent(new CustomEvent("mergequeue:tool-call", { detail }));
}

async function waitForModelContext() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (typeof document.modelContext?.registerTool === "function") return document.modelContext;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

export function createTools(store) {
  return [
    {
      name: "get_workspace_summary",
      description: "Read the live project board, its revision, people, tasks, active agent branch, and the valid next actions. Use this before proposing changes.",
      inputSchema: {
        ...OBJECT,
        properties: {
          includeArchived: { type: "boolean", description: "Include archived tasks. Defaults to false." },
          statuses: { type: "array", items: { type: "string", enum: ["backlog", "ready", "in_progress", "review", "done"] }, uniqueItems: true, maxItems: 5 },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async ({ includeArchived = false, statuses = [] } = {}) => {
        try {
          const state = store.getState();
          const tasks = Object.values(state.workspace.tasks)
            .filter((task) => includeArchived || !task.archived)
            .filter((task) => !statuses.length || statuses.includes(task.status))
            .map(({ id, title, description, status, priority, ownerId, dueDate, archived, version }) => ({ id, title, description, status, priority, ownerId, dueDate, archived, version }));
          return ok(`Read revision ${state.workspace.revision} with ${tasks.length} matching tasks.`, {
            workspace: { id: state.workspace.id, revision: state.workspace.revision, people: state.workspace.people, tasks },
            branch: branchSummary(state.branch),
            availableActions: availableActions(state),
          });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "begin_agent_branch",
      description: "Open an isolated agent branch from the current workspace revision. Staged work will not mutate the human's live board until a reviewed merge is committed.",
      inputSchema: {
        ...OBJECT,
        required: ["intent"],
        properties: {
          intent: { type: "string", minLength: 8, maxLength: 240 },
          expectedWorkspaceRevision: { type: "integer", minimum: 1 },
        },
      },
      execute: async ({ intent, expectedWorkspaceRevision }) => {
        try {
          const branch = store.beginBranch(intent, expectedWorkspaceRevision);
          return ok(`Opened branch ${branch.id} from revision ${branch.baseRevision}. Human edits can continue safely.`, {
            branchId: branch.id,
            baseRevision: branch.baseRevision,
            next: "Stage task updates, then preview the merge. Do not commit without human approval.",
          });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "stage_task_updates",
      description: "Stage up to 12 bounded task updates on the active agent branch. These are proposals only and do not change the live human workspace.",
      inputSchema: {
        ...OBJECT,
        required: ["branchId", "updates"],
        properties: {
          branchId: { type: "string", minLength: 8, maxLength: 40 },
          updates: {
            type: "array",
            minItems: 1,
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["taskId", "patch", "rationale"],
              properties: {
                taskId: { type: "string", minLength: 1, maxLength: 50, pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" },
                patch: {
                  type: "object",
                  additionalProperties: false,
                  minProperties: 1,
                  properties: {
                    title: { type: "string", minLength: 1, maxLength: 90 },
                    description: { type: "string", maxLength: 280 },
                    status: { enum: ["backlog", "ready", "in_progress", "review", "done"] },
                    priority: { enum: ["low", "medium", "high", "critical"] },
                    ownerId: { type: ["string", "null"], maxLength: 30 },
                    dueDate: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                    labels: { type: "array", items: { type: "string", minLength: 1, maxLength: 24 }, uniqueItems: true, maxItems: 6 },
                    archived: { type: "boolean" },
                  },
                },
                rationale: { type: "string", minLength: 3, maxLength: 180 },
              },
            },
          },
        },
      },
      execute: async ({ branchId, updates }) => {
        try {
          const outcomes = store.stageTaskUpdates(branchId, updates);
          const succeeded = outcomes.filter((item) => item.ok).length;
          return ok(`Staged ${succeeded} of ${outcomes.length} proposed task updates. The live board is unchanged.`, { outcomes, next: "Call get_branch_diff or preview_merge." });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "stage_new_task",
      description: "Stage one new task on the active agent branch without changing the live human workspace.",
      inputSchema: {
        ...OBJECT,
        required: ["branchId", "task", "rationale"],
        properties: {
          branchId: { type: "string", minLength: 8, maxLength: 40 },
          task: {
            type: "object",
            additionalProperties: false,
            required: ["title", "status", "priority"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 50, pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" },
              title: { type: "string", minLength: 1, maxLength: 90 },
              description: { type: "string", maxLength: 280 },
              status: { enum: ["backlog", "ready", "in_progress", "review", "done"] },
              priority: { enum: ["low", "medium", "high", "critical"] },
              ownerId: { type: ["string", "null"], maxLength: 30 },
              dueDate: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
              labels: { type: "array", items: { type: "string", minLength: 1, maxLength: 24 }, uniqueItems: true, maxItems: 6 },
            },
          },
          rationale: { type: "string", minLength: 3, maxLength: 180 },
        },
      },
      execute: async ({ branchId, task, rationale }) => {
        try {
          const created = store.stageNewTask(branchId, task, rationale);
          return ok(`Staged new task ${created.title}. The live board is unchanged.`, { task: created });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "get_branch_diff",
      description: "Read the active branch's staged operations and summarize human changes made since the branch began.",
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      annotations: { readOnlyHint: true },
      execute: async ({ branchId }) => {
        try {
          const state = store.getState();
          if (!state.branch || state.branch.id !== branchId) throw new Error("Active branch not found.");
          const changedIds = [...new Set([
            ...Object.keys(state.branch.baseSnapshot.tasks),
            ...Object.keys(state.workspace.tasks),
          ])].filter((taskId) => {
            const base = state.branch.baseSnapshot.tasks[taskId];
            const current = state.workspace.tasks[taskId];
            return !base || !current || current.version !== base.version;
          });
          return ok(`Branch has ${state.branch.operations.length} staged operations; ${changedIds.length} live tasks changed since it opened.`, {
            branch: branchSummary(state.branch),
            operations: state.branch.operations.map(({ id, type, taskId, patch, rationale }) => ({ id, type, taskId, patch, rationale })),
            humanChangedTaskIds: changedIds,
          });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "preview_merge",
      description: "Run a deterministic three-way merge between the branch base, the human's current board, and the agent proposal. Opens the visible review drawer and never commits changes.",
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      execute: async ({ branchId }) => {
        try {
          const preview = store.previewMerge(branchId);
          window.dispatchEvent(new CustomEvent("mergequeue:open-preview"));
          return ok(`Merge preview: ${preview.stats.safe} safe changes, ${preview.stats.same} same-result changes, and ${preview.stats.conflicts} conflicts requiring the human.`, {
            stats: preview.stats,
            conflicts: preview.conflicts.map(safeConflict),
            previewRevision: preview.workspaceRevision,
            next: preview.stats.conflicts ? "The human must resolve visible conflicts in the page, then request_merge can be called." : "Call request_merge to ask for explicit human approval.",
          });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "get_merge_conflicts",
      description: "Read unresolved semantic conflicts from the current merge preview. This does not resolve conflicts; those decisions belong to the human in the page.",
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      annotations: { readOnlyHint: true },
      execute: async ({ branchId }) => {
        try {
          const branch = store.getState().branch;
          if (!branch || branch.id !== branchId || !branch.preview) throw new Error("Merge preview not found.");
          const unresolved = branch.preview.conflicts.filter((item) => !item.resolution);
          return ok(`${unresolved.length} conflicts still need a human decision.`, { conflicts: unresolved.map(safeConflict) });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "request_merge",
      description: "Open the merge review UI and request explicit human approval. This tool never commits on its own; the human must resolve conflicts and click Commit merge in the page.",
      inputSchema: {
        ...OBJECT,
        required: ["branchId", "expectedPreviewRevision"],
        properties: {
          branchId: { type: "string", minLength: 8, maxLength: 40 },
          expectedPreviewRevision: { type: "integer", minimum: 1 },
        },
      },
      execute: async ({ branchId, expectedPreviewRevision }) => {
        try {
          const state = store.getState();
          if (!state.branch || state.branch.id !== branchId || !state.branch.preview) throw new Error("Merge preview not found.");
          if (state.branch.preview.workspaceRevision !== expectedPreviewRevision) throw new Error("Preview revision does not match. Create a fresh preview.");
          window.dispatchEvent(new CustomEvent("mergequeue:open-preview"));
          const unresolved = state.branch.preview.conflicts.filter((item) => !item.resolution).length;
          return ok(unresolved ? `Review opened. The human must resolve ${unresolved} conflicts before commit.` : "Review opened. The merge is ready for the human to approve.", {
            status: unresolved ? "awaiting_human_resolution" : "awaiting_human_approval",
            unresolved,
            instruction: "Wait for the human to use the visible merge drawer, then call get_branch_status.",
          });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "get_branch_status",
      description: "Read whether the branch is open, conflicted, awaiting approval, merged, or aborted.",
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      annotations: { readOnlyHint: true },
      execute: async ({ branchId }) => {
        try {
          const branch = store.getState().branch;
          if (!branch || branch.id !== branchId) throw new Error("Branch not found.");
          return ok(`Branch ${branch.id} is ${branch.status}.`, { branch: branchSummary(branch), next: nextForBranch(branch) });
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "abort_branch",
      description: "Discard the active agent branch without changing the human's live workspace.",
      inputSchema: { ...OBJECT, required: ["branchId"], properties: { branchId: { type: "string", minLength: 8, maxLength: 40 } } },
      annotations: { destructiveHint: true },
      execute: async ({ branchId }) => {
        try {
          store.abortBranch(branchId);
          return ok(`Aborted ${branchId}. No staged proposal was applied to the live workspace.`);
        } catch (error) {
          return failure(error);
        }
      },
    },
    {
      name: "revert_last_merge",
      description: "Revert the latest committed merge as a new workspace revision. Use only after the human explicitly asks to undo the merge.",
      inputSchema: { ...OBJECT, properties: { confirmation: { type: "string", const: "revert" } }, required: ["confirmation"] },
      annotations: { destructiveHint: true },
      execute: async ({ confirmation }) => {
        try {
          if (confirmation !== "revert") throw new Error("Explicit confirmation is required.");
          const workspace = store.revertLastMerge();
          return ok(`Reverted the latest merge. The restored board is revision ${workspace.revision}.`, { revision: workspace.revision });
        } catch (error) {
          return failure(error);
        }
      },
    },
  ];
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

function availableActions(state) {
  if (!state.branch || ["merged", "aborted"].includes(state.branch.status)) {
    return ["begin_agent_branch", ...(state.lastCommit && !state.lastCommit.reverted ? ["revert_last_merge"] : [])];
  }
  return state.branch.preview
    ? ["get_merge_conflicts", "request_merge", "get_branch_status", "abort_branch"]
    : ["stage_task_updates", "stage_new_task", "get_branch_diff", "preview_merge", "abort_branch"];
}

function nextForBranch(branch) {
  if (branch.status === "open") return "Stage changes or preview the merge.";
  if (branch.status === "conflicted") return "Wait for the human to resolve conflicts in the page.";
  if (branch.status === "awaiting_approval") return "Wait for the human to commit or reject the merge in the page.";
  if (branch.status === "merged") return "The merge is complete. Read the workspace to verify it.";
  return "No further branch action is available.";
}

function safeConflict(conflict) {
  return {
    id: conflict.id,
    taskId: conflict.taskId,
    field: conflict.field,
    kind: conflict.kind,
    baseValue: conflict.baseValue,
    humanValue: conflict.humanValue,
    agentValue: conflict.agentValue,
    explanation: conflict.explanation,
    consequences: conflict.consequences,
  };
}
