import { clone, deepEqual } from "./merge.js";
import { applyRecordResolutions, mergeRecordWorkspaces } from "./record-merge.js";

export function createDemoStore(config) {
  let state = load(config.storageKey, config.createSeed);
  const listeners = new Set();

  function emit() {
    localStorage.setItem(config.storageKey, JSON.stringify(state));
    listeners.forEach((listener) => listener(state));
    window.dispatchEvent(new CustomEvent("mergequeue:state", { detail: state }));
  }

  function log(actor, title, detail = "") {
    state.activity.unshift({ id: crypto.randomUUID(), actor, title, detail, at: new Date().toISOString() });
    state.activity = state.activity.slice(0, 80);
  }

  function humanUpdate(recordId, patch) {
    const record = state.workspace.records[recordId];
    if (!record) throw new Error(`${config.singularLabel} not found: ${recordId}`);
    const cleanPatch = validatePatch(patch, config);
    state.workspace.records[recordId] = touch({ ...record, ...clone(cleanPatch) }, record.version);
    state.workspace.revision += 1;
    state.workspace.updatedAt = new Date().toISOString();
    invalidatePreview();
    log("human", `You changed ${config.getName(record)}`, config.describePatch(record, cleanPatch, state.workspace));
    emit();
    return clone(state.workspace.records[recordId]);
  }

  function beginBranch(intent, expectedRevision) {
    if (state.branch && !["merged", "aborted"].includes(state.branch.status)) {
      throw new Error(`Branch ${state.branch.id} is already active.`);
    }
    if (expectedRevision !== undefined && expectedRevision !== state.workspace.revision) {
      throw new Error(`Expected revision ${expectedRevision}, found ${state.workspace.revision}.`);
    }
    const snapshot = clone(state.workspace);
    state.branch = {
      id: `branch-${crypto.randomUUID().slice(0, 8)}`,
      intent: intent.trim(),
      baseRevision: snapshot.revision,
      baseSnapshot: snapshot,
      workingSnapshot: clone(snapshot),
      operations: [],
      preview: null,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    log("agent", "Agent opened a branch", intent);
    emit();
    return clone(state.branch);
  }

  function stageUpdates(branchId, updates) {
    const branch = requireBranch(branchId);
    if (!Array.isArray(updates) || updates.length < 1 || updates.length > 20) {
      throw new Error("Provide between 1 and 20 updates.");
    }
    const outcomes = [];
    for (const update of updates) {
      const record = branch.workingSnapshot.records[update.recordId];
      if (!record) {
        outcomes.push({ recordId: update.recordId, ok: false, error: `${config.singularLabel} not found` });
        continue;
      }
      try {
        const patch = validatePatch(update.patch, config);
        const after = touch({ ...record, ...clone(patch) }, record.version);
        branch.workingSnapshot.records[record.id] = after;
        branch.operations.push({
          id: `op-${crypto.randomUUID().slice(0, 8)}`,
          recordId: record.id,
          patch: clone(patch),
          before: clone(record),
          after: clone(after),
          rationale: String(update.rationale || "No rationale supplied").slice(0, 180),
          createdAt: new Date().toISOString(),
        });
        outcomes.push({ recordId: record.id, ok: true, changed: Object.keys(patch) });
        log("agent", `Agent proposed ${config.getName(record)}`, config.describePatch(record, patch, state.workspace));
      } catch (error) {
        outcomes.push({ recordId: update.recordId, ok: false, error: error.message });
      }
    }
    branch.preview = null;
    branch.status = "open";
    emit();
    return outcomes;
  }

  function previewMerge(branchId = state.branch?.id) {
    const branch = requireBranch(branchId);
    branch.preview = mergeRecordWorkspaces(branch.baseSnapshot, state.workspace, branch.workingSnapshot, config.mergeConfig);
    branch.status = branch.preview.conflicts.length ? "conflicted" : "awaiting_approval";
    log("system", "Merge preview prepared", `${branch.preview.stats.safe} safe · ${branch.preview.stats.conflicts} need your call.`);
    emit();
    return clone(branch.preview);
  }

  function resolveConflict(conflictId, choice, customValue) {
    if (!state.branch?.preview) throw new Error("Create a merge preview first.");
    const conflict = state.branch.preview.conflicts.find((item) => item.id === conflictId);
    if (!conflict) throw new Error(`Conflict not found: ${conflictId}`);
    if (!["human", "agent", "custom"].includes(choice)) throw new Error(`Unsupported resolution: ${choice}`);
    conflict.resolution = { choice, ...(choice === "custom" ? { value: customValue } : {}) };
    const remaining = state.branch.preview.conflicts.filter((item) => !item.resolution).length;
    state.branch.status = remaining ? "conflicted" : "awaiting_approval";
    log("human", `You resolved ${config.getName(state.workspace.records[conflict.recordId] ?? state.branch.workingSnapshot.records[conflict.recordId])}`, `${choice === "human" ? "Kept your value" : choice === "agent" ? "Used the agent value" : "Chose a custom value"}.`);
    emit();
    return { remaining };
  }

  function commitMerge(branchId = state.branch?.id) {
    const branch = state.branch;
    if (!branch || branch.id !== branchId) throw new Error("Active branch not found.");
    if (branch.status === "merged") return clone(state.lastCommit);
    if (branch.status === "aborted") throw new Error("An aborted branch cannot be committed.");
    if (!branch.preview) throw new Error("Create a merge preview first.");
    if (branch.preview.workspaceRevision !== state.workspace.revision) {
      invalidatePreview();
      emit();
      throw new Error("The live workspace changed. Preview the merge again.");
    }
    const beforeSnapshot = clone(state.workspace);
    const merged = applyRecordResolutions(branch.preview, config.mergeConfig.normalize);
    merged.revision = state.workspace.revision + 1;
    merged.updatedAt = new Date().toISOString();
    for (const record of Object.values(merged.records)) {
      const before = beforeSnapshot.records[record.id];
      if (!before || !deepEqual(before, record)) Object.assign(record, touch(record, before?.version ?? 0));
    }
    state.workspace = merged;
    state.lastCommit = {
      id: `merge-${crypto.randomUUID().slice(0, 8)}`,
      branchId: branch.id,
      beforeSnapshot,
      afterSnapshot: clone(merged),
      operationCount: branch.operations.length,
      conflicts: clone(branch.preview.conflicts),
      committedAt: new Date().toISOString(),
      reverted: false,
    };
    branch.status = "merged";
    log("system", "Merge committed", `${branch.operations.length} proposals landed without erasing your work.`);
    emit();
    return clone(state.lastCommit);
  }

  function abortBranch(branchId = state.branch?.id) {
    const branch = requireBranch(branchId);
    branch.status = "aborted";
    log("human", "You aborted the agent branch", "The live workspace was untouched.");
    emit();
  }

  function revertLastMerge() {
    if (!state.lastCommit || state.lastCommit.reverted) throw new Error("There is no merge available to revert.");
    const restored = clone(state.lastCommit.beforeSnapshot);
    restored.revision = state.workspace.revision + 1;
    restored.updatedAt = new Date().toISOString();
    state.workspace = restored;
    state.lastCommit.reverted = true;
    if (state.branch) state.branch.status = "aborted";
    log("human", "You reverted the merge", `Restored the previous state as revision ${restored.revision}.`);
    emit();
    return clone(restored);
  }

  function reset() {
    state = config.createSeed();
    emit();
  }

  function invalidatePreview() {
    if (state.branch?.preview) {
      state.branch.preview = null;
      state.branch.status = "open";
    }
  }

  function requireBranch(branchId) {
    if (!state.branch || state.branch.id !== branchId) throw new Error("Active branch not found.");
    if (["merged", "aborted"].includes(state.branch.status)) throw new Error(`Branch is ${state.branch.status}.`);
    return state.branch;
  }

  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    humanUpdate,
    beginBranch,
    stageUpdates,
    previewMerge,
    resolveConflict,
    commitMerge,
    abortBranch,
    revertLastMerge,
    reset,
  };
}

function validatePatch(patch, config) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Patch must be an object.");
  const entries = Object.entries(patch);
  if (!entries.length) throw new Error("Patch must change at least one field.");
  const unsupported = entries.map(([key]) => key).filter((key) => !config.fields.includes(key));
  if (unsupported.length) throw new Error(`Unsupported fields: ${unsupported.join(", ")}`);
  config.validatePatch?.(patch);
  return Object.fromEntries(entries);
}

function touch(record, previousVersion) {
  return { ...record, version: previousVersion + 1, updatedAt: new Date().toISOString() };
}

function load(storageKey, createSeed) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.warn("Could not restore demo state", error);
  }
  return createSeed();
}
