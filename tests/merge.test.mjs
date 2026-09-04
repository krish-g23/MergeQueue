import test from "node:test";
import assert from "node:assert/strict";
import { applyConflictResolutions, mergeField, mergeWorkspaces } from "../src/merge.js";
import { createSeedState, createStore } from "../src/store.js";
import { createTools } from "../src/webmcp.js";

function makeTask(overrides = {}) {
  return {
    id: "alpha",
    title: "Alpha",
    description: "Base",
    status: "ready",
    position: 0,
    priority: "medium",
    ownerId: null,
    dueDate: "2026-09-04",
    labels: [],
    archived: false,
    version: 1,
    createdAt: "x",
    updatedAt: "x",
    ...overrides,
  };
}

function workspace(task) {
  return { id: "test", revision: 1, people: {}, tasks: task ? { [task.id]: task } : {}, updatedAt: "x" };
}

test("keeps a human change when the agent left the field unchanged", () => {
  assert.deepEqual(mergeField("base", "human", "base"), { kind: "keep_human", value: "human" });
});

test("applies an agent change when the human left the field unchanged", () => {
  assert.deepEqual(mergeField("base", "base", "agent"), { kind: "apply_agent", value: "agent" });
});

test("deduplicates identical human and agent changes", () => {
  assert.deepEqual(mergeField("base", "same", "same"), { kind: "same_change", value: "same" });
});

test("reports a conflict when both sides choose different values", () => {
  assert.equal(mergeField("base", "human", "agent").kind, "conflict");
});

test("merges changes to different fields without conflict", () => {
  const base = makeTask();
  const human = makeTask({ ownerId: "maya", version: 2 });
  const agent = makeTask({ priority: "critical", version: 2 });
  const preview = mergeWorkspaces(workspace(base), workspace(human), workspace(agent));
  assert.equal(preview.conflicts.length, 0);
  assert.equal(preview.mergedWorkspace.tasks.alpha.ownerId, "maya");
  assert.equal(preview.mergedWorkspace.tasks.alpha.priority, "critical");
});

test("surfaces concurrent owner edits as a human decision", () => {
  const base = makeTask();
  const human = makeTask({ ownerId: "maya", version: 2 });
  const agent = makeTask({ ownerId: "dev", version: 2 });
  const preview = mergeWorkspaces(workspace(base), workspace(human), workspace(agent));
  assert.equal(preview.conflicts.length, 1);
  assert.equal(preview.conflicts[0].field, "ownerId");
  assert.equal(preview.conflicts[0].humanValue, "maya");
  assert.equal(preview.conflicts[0].agentValue, "dev");
});

test("preserves a task created by the human after branching", () => {
  const base = workspace(makeTask());
  const human = workspace(makeTask());
  human.tasks.humanNew = makeTask({ id: "humanNew", title: "Human task" });
  const agent = workspace(makeTask({ priority: "high" }));
  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.mergedWorkspace.tasks.humanNew.title, "Human task");
});

test("adds a task created by the agent", () => {
  const base = workspace(makeTask());
  const human = workspace(makeTask());
  const agent = workspace(makeTask());
  agent.tasks.agentNew = makeTask({ id: "agentNew", title: "Agent task" });
  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.mergedWorkspace.tasks.agentNew.title, "Agent task");
  assert.equal(preview.safeChanges.some((change) => change.kind === "create"), true);
});

test("accepts a task deleted by both sides without inventing a conflict", () => {
  const base = workspace(makeTask());
  const human = workspace();
  const agent = workspace();
  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.conflicts.length, 0);
  assert.equal(preview.mergedWorkspace.tasks.alpha, undefined);
  assert.equal(preview.sameChanges[0].kind, "delete");
});

test("keeps a human deletion when the agent left the task untouched", () => {
  const base = workspace(makeTask());
  const human = workspace();
  const agent = workspace(makeTask());
  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.conflicts.length, 0);
  assert.equal(preview.mergedWorkspace.tasks.alpha, undefined);
});

test("safely applies an agent deletion when the human left the task untouched", () => {
  const base = workspace(makeTask());
  const human = workspace(makeTask());
  const agent = workspace();
  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.conflicts.length, 0);
  assert.equal(preview.mergedWorkspace.tasks.alpha, undefined);
  assert.equal(preview.safeChanges[0].kind, "delete");
});

test("surfaces delete versus edit as a whole-task conflict", () => {
  const base = workspace(makeTask());
  const human = workspace(makeTask({ description: "Human edit" }));
  const agent = workspace();
  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.conflicts.length, 1);
  assert.equal(preview.conflicts[0].kind, "delete_vs_edit");
  assert.equal(preview.conflicts[0].field, "$task");
});

test("treats archive versus concurrent editing as a semantic conflict", () => {
  const base = workspace(makeTask());
  const human = workspace(makeTask({ description: "Human clarified the task" }));
  const agent = workspace(makeTask({ archived: true }));
  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.conflicts.length, 1);
  assert.equal(preview.conflicts[0].kind, "archive_vs_edit");
  preview.conflicts[0].resolution = { choice: "agent" };
  const resolved = applyConflictResolutions(preview);
  assert.equal(resolved.tasks.alpha.archived, true);
  assert.equal(resolved.tasks.alpha.description, "Human clarified the task");
});

test("requires every conflict to be resolved before applying", () => {
  const base = workspace(makeTask());
  const human = workspace(makeTask({ ownerId: "maya" }));
  const agent = workspace(makeTask({ ownerId: "dev" }));
  const preview = mergeWorkspaces(base, human, agent);
  assert.throws(() => applyConflictResolutions(preview), /still need/);
  preview.conflicts[0].resolution = { choice: "human" };
  const resolved = applyConflictResolutions(preview);
  assert.equal(resolved.tasks.alpha.ownerId, "maya");
});

test("applies the agent value when the human explicitly selects it", () => {
  const base = workspace(makeTask());
  const human = workspace(makeTask({ status: "in_progress" }));
  const agent = workspace(makeTask({ status: "review" }));
  const preview = mergeWorkspaces(base, human, agent);
  preview.conflicts[0].resolution = { choice: "agent" };
  const resolved = applyConflictResolutions(preview);
  assert.equal(resolved.tasks.alpha.status, "review");
});

test("the seeded demo produces exactly three meaningful conflicts", () => {
  const base = createSeedState().workspace;
  const human = structuredClone(base);
  human.revision = 5;
  human.tasks.security.ownerId = "maya";
  human.tasks.video.status = "in_progress";
  human.tasks.analytics.dueDate = "2026-09-05";
  human.tasks["judge-url"] = makeTask({
    id: "judge-url",
    title: "Verify judge testing URL",
    status: "ready",
    ownerId: "maya",
  });

  const agent = structuredClone(base);
  agent.tasks.security.ownerId = "dev";
  agent.tasks.security.status = "in_progress";
  agent.tasks.video.status = "review";
  agent.tasks.analytics.dueDate = "2026-09-07";
  agent.tasks.analytics.priority = "medium";
  agent.tasks.screens.status = "ready";
  agent.tasks.screens.ownerId = "noa";
  agent.tasks.license.status = "in_progress";
  agent.tasks.mobile.dueDate = "2026-09-08";
  agent.tasks["old-survey"].archived = true;
  agent.tasks.qa.status = "in_progress";
  agent.tasks.captions.status = "ready";
  agent.tasks.description.status = "done";
  agent.tasks.deploy.status = "done";
  agent.tasks.readme.status = "review";

  const preview = mergeWorkspaces(base, human, agent);
  assert.equal(preview.conflicts.length, 3);
  assert.deepEqual(
    preview.conflicts.map(({ taskId, field }) => `${taskId}:${field}`).sort(),
    ["analytics:dueDate", "security:ownerId", "video:status"],
  );
  assert.equal(preview.mergedWorkspace.tasks["judge-url"].title, "Verify judge testing URL");
});

test("the complete store journey commits once and reverts as a new revision", () => {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  global.window = { dispatchEvent() {} };
  global.CustomEvent = class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init?.detail; }
  };

  const store = createStore();
  const startingRevision = store.getState().workspace.revision;
  const branch = store.beginBranch("Test concurrent merge", startingRevision);
  store.stageTaskUpdates(branch.id, [
    { taskId: "security", patch: { ownerId: "dev" }, rationale: "Test proposal" },
    { taskId: "video", patch: { status: "review" }, rationale: "Test proposal" },
    { taskId: "analytics", patch: { dueDate: "2026-09-07" }, rationale: "Test proposal" },
  ]);
  store.updateWorkspaceTask("security", { ownerId: "maya" });
  store.updateWorkspaceTask("video", { status: "in_progress" });
  store.updateWorkspaceTask("analytics", { dueDate: "2026-09-05" });

  const preview = store.previewMerge(branch.id);
  assert.equal(preview.conflicts.length, 3);
  for (const conflict of store.getState().branch.preview.conflicts) {
    store.resolveConflict(conflict.id, "human");
  }

  const beforeCommitRevision = store.getState().workspace.revision;
  const firstCommit = store.commitMerge(branch.id);
  const repeatedCommit = store.commitMerge(branch.id);
  assert.equal(repeatedCommit.id, firstCommit.id);
  assert.equal(store.getState().workspace.revision, beforeCommitRevision + 1);

  const reverted = store.revertLastMerge();
  assert.equal(reverted.revision, beforeCommitRevision + 2);
  assert.equal(reverted.tasks.security.ownerId, "maya");
  assert.equal(reverted.tasks.video.status, "in_progress");
});

test("store commands reject invalid task data even outside tool schemas", () => {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const store = createStore();
  assert.throws(() => store.updateWorkspaceTask("security", { priority: "urgent" }), /Unknown priority/);
  assert.throws(() => store.updateWorkspaceTask("security", { ownerId: "nobody" }), /Unknown owner/);
  assert.throws(() => store.updateWorkspaceTask("security", { dueDate: "2026-02-30" }), /real calendar date/);
  assert.throws(() => store.createWorkspaceTask({ id: "bad id", title: "Bad", status: "ready" }), /Task IDs/);
});

test("moving a live task appends it to its destination and keeps positions unique", () => {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const store = createStore();
  store.updateWorkspaceTask("security", { status: "in_progress" });
  const tasks = Object.values(store.getState().workspace.tasks)
    .filter((task) => !task.archived && task.status === "in_progress")
    .sort((a, b) => a.position - b.position);
  assert.equal(tasks.at(-1).id, "security");
  assert.deepEqual(tasks.map((task) => task.position), [0, 1, 2, 3]);
});

test("a newer board snapshot from another tab is applied live", () => {
  const values = new Map();
  const eventListeners = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  global.window = {
    addEventListener(type, listener) { eventListeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (eventListeners.get(type) === listener) eventListeners.delete(type);
    },
    dispatchEvent() {},
  };

  const store = createStore();
  let observedChange = null;
  store.subscribe((_state, change) => { observedChange = change; });
  const incoming = structuredClone(store.getState());
  incoming.workspace.tasks.security.status = "in_progress";
  incoming.workspace.revision += 1;
  incoming.syncVersion += 1;
  incoming.syncUpdatedAt = new Date(Date.now() + 1_000).toISOString();
  incoming.syncMutationId = "other-tab:2:test";

  eventListeners.get("storage")({
    key: "merge-queue-state-v1",
    newValue: JSON.stringify(incoming),
  });

  assert.equal(store.getState().workspace.tasks.security.status, "in_progress");
  assert.deepEqual(observedChange, {
    source: "external",
    transport: "storage",
    persisted: true,
    concurrent: false,
  });
  store.destroy();
  assert.equal(eventListeners.has("storage"), false);
});

test("reset keeps the live sync clock monotonic", () => {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  global.window = { dispatchEvent() {} };

  const store = createStore();
  store.updateWorkspaceTask("security", { ownerId: "maya" });
  const beforeReset = store.getState().syncVersion;
  store.reset();
  assert.equal(store.getState().syncVersion, beforeReset + 1);
  assert.equal(store.getState().workspace.revision, 1);
});

test("a stale task editor cannot overwrite a newer tab version", () => {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  global.window = { dispatchEvent() {} };

  const store = createStore();
  const editorVersion = store.getState().workspace.tasks.security.version;
  store.updateWorkspaceTask("security", { status: "in_progress" });
  assert.throws(
    () => store.updateWorkspaceTask("security", { ownerId: "maya" }, "human", editorVersion),
    /changed in another tab/,
  );
  assert.equal(store.getState().workspace.tasks.security.ownerId, null);
});

test("the top-level WebMCP catalog is narrow, complete, and keeps commit human-only", () => {
  const tools = createTools({});
  const names = tools.map((tool) => tool.name);
  assert.deepEqual(names, [
    "get_workspace_summary",
    "begin_agent_branch",
    "stage_task_updates",
    "stage_new_task",
    "get_branch_diff",
    "preview_merge",
    "get_merge_conflicts",
    "request_merge",
    "get_branch_status",
    "abort_branch",
    "revert_last_merge",
  ]);
  assert.equal(names.includes("commit_merge"), false);
  assert.equal(tools.every((tool) => tool.inputSchema.additionalProperties === false), true);
  assert.equal(tools.find((tool) => tool.name === "get_workspace_summary").annotations.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === "stage_task_updates").annotations, undefined);
});
