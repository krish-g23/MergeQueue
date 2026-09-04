import { applyConflictResolutions, clone, deepEqual, mergeWorkspaces, normalizePositions } from "./merge.js";

export const STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "ready", label: "Ready" },
  { id: "in_progress", label: "In progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

export const PRIORITIES = ["low", "medium", "high", "critical"];

const STORAGE_KEY = "merge-queue-state-v1";
const SYNC_CHANNEL = `${STORAGE_KEY}:live`;

const PEOPLE = {
  maya: { id: "maya", name: "Maya", initials: "MY", color: "#7357e8" },
  dev: { id: "dev", name: "Dev", initials: "DV", color: "#0c8f75" },
  noa: { id: "noa", name: "Noa", initials: "NO", color: "#d66d3f" },
  sam: { id: "sam", name: "Sam", initials: "SA", color: "#3676d8" },
};

function task(id, title, status, position, priority, ownerId, dueDate, description) {
  return {
    id,
    title,
    description,
    status,
    position,
    priority,
    ownerId,
    dueDate,
    labels: [],
    archived: false,
    version: 1,
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
  };
}

export function createSeedState() {
  const now = new Date().toISOString();
  const tasks = [
    task("research", "Confirm launch narrative", "done", 0, "high", "maya", "2026-09-02", "Lock the one-line story and proof points."),
    task("analytics", "Verify analytics events", "ready", 0, "high", "sam", "2026-09-06", "Confirm acquisition and activation events."),
    task("security", "Run security review", "ready", 1, "critical", null, "2026-09-04", "Review tool inputs, outputs, and commit boundaries."),
    task("video", "Record product demo", "ready", 2, "critical", "noa", "2026-09-04", "Capture the complete concurrent merge journey."),
    task("copy", "Polish landing-page copy", "in_progress", 0, "medium", "maya", "2026-09-03", "Tighten the problem, mechanism, and payoff."),
    task("a11y", "Accessibility pass", "in_progress", 1, "high", "dev", "2026-09-04", "Keyboard, contrast, labels, and reduced motion."),
    task("readme", "Finish public README", "in_progress", 2, "high", "sam", "2026-09-03", "Document the demo, architecture, and WebMCP tools."),
    task("schemas", "Validate tool schemas", "review", 0, "critical", "dev", "2026-09-03", "Reject broad inputs and verify every tool result."),
    task("screens", "Export submission screenshots", "backlog", 0, "medium", "noa", "2026-09-04", "Create one hero and two workflow screenshots."),
    task("license", "Check open-source license", "backlog", 1, "high", "sam", "2026-09-03", "Ensure the license is visible and detected."),
    task("mobile", "Mobile layout polish", "backlog", 2, "low", null, "2026-09-05", "Improve narrow-screen column navigation."),
    task("old-survey", "Review old onboarding survey", "backlog", 3, "low", null, "2026-08-18", "Legacy research from the previous concept."),
    task("deploy", "Verify production deployment", "review", 1, "critical", "dev", "2026-09-03", "Test the exact public URL in the judge browser."),
    task("description", "Draft Devpost description", "review", 2, "high", "maya", "2026-09-03", "Answer the four judging questions directly."),
    task("qa", "Run seeded demo five times", "backlog", 4, "high", "noa", "2026-09-03", "Verify the same conflict set appears every run."),
    task("captions", "Add video captions", "backlog", 5, "medium", null, "2026-09-04", "Make the demo understandable without sound."),
    task("favicon", "Replace placeholder favicon", "done", 1, "low", "sam", "2026-09-02", "Use the three-way merge mark."),
    task("prompt", "Finalize judge test prompt", "done", 2, "medium", "maya", "2026-09-02", "Keep it short, deterministic, and easy to paste."),
  ];

  return {
    workspace: {
      id: "friday-launch",
      revision: 1,
      people: clone(PEOPLE),
      tasks: Object.fromEntries(tasks.map((item) => [item.id, item])),
      updatedAt: now,
    },
    branch: null,
    lastCommit: null,
    syncVersion: 1,
    syncUpdatedAt: now,
    syncMutationId: "seed",
    activity: [
      activity("system", "Workspace ready", "The Friday launch board is seeded for a repeatable demo."),
    ],
  };
}

function activity(actor, title, detail = "") {
  return {
    id: crypto.randomUUID(),
    actor,
    title,
    detail,
    at: new Date().toISOString(),
  };
}

function validateStatus(status) {
  if (!STATUSES.some((item) => item.id === status)) throw new Error(`Unknown status: ${status}`);
}

function validateId(id) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/.test(id)) {
    throw new Error("Task IDs must be 1–50 letters, numbers, dashes, or underscores.");
  }
}

function validateTaskPatch(patch, people) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("A task patch is required.");
  const allowed = new Set(["title", "description", "status", "priority", "ownerId", "dueDate", "labels", "archived"]);
  const unknown = Object.keys(patch).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`Unsupported task field: ${unknown[0]}`);
  if (!Object.keys(patch).length) throw new Error("No supported fields supplied.");
  if (Object.hasOwn(patch, "title") && (typeof patch.title !== "string" || !patch.title.trim() || patch.title.trim().length > 90)) {
    throw new Error("Title must be between 1 and 90 characters.");
  }
  if (Object.hasOwn(patch, "description") && (typeof patch.description !== "string" || patch.description.length > 280)) {
    throw new Error("Description must be no more than 280 characters.");
  }
  if (Object.hasOwn(patch, "status")) validateStatus(patch.status);
  if (Object.hasOwn(patch, "priority") && !PRIORITIES.includes(patch.priority)) throw new Error(`Unknown priority: ${patch.priority}`);
  if (Object.hasOwn(patch, "ownerId") && patch.ownerId !== null && !Object.hasOwn(people, patch.ownerId)) {
    throw new Error(`Unknown owner: ${patch.ownerId}`);
  }
  if (Object.hasOwn(patch, "dueDate") && patch.dueDate !== null) validateDueDate(patch.dueDate);
  if (Object.hasOwn(patch, "labels")) {
    if (!Array.isArray(patch.labels) || patch.labels.length > 6 || patch.labels.some((label) => typeof label !== "string" || !label.trim() || label.length > 24) || new Set(patch.labels.map((label) => label.trim())).size !== patch.labels.length) {
      throw new Error("Labels must contain at most 6 non-empty values of 24 characters or fewer.");
    }
  }
  if (Object.hasOwn(patch, "archived") && typeof patch.archived !== "boolean") throw new Error("Archived must be true or false.");
  return Object.fromEntries(Object.entries(clone(patch)).map(([key, value]) => [key, typeof value === "string" && ["title", "description"].includes(key) ? value.trim() : value]));
}

function validateDueDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Due date must use YYYY-MM-DD.");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Due date must be a real calendar date.");
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const restored = normalizeStoredState(JSON.parse(raw));
      if (restored) return restored;
    }
  } catch (error) {
    console.warn("Could not restore workspace state", error);
  }
  return createSeedState();
}

export function createStore() {
  let state = loadState();
  const listeners = new Set();
  const sourceId = crypto.randomUUID();
  let broadcastChannel = null;

  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) acceptExternalState(event.newValue, "storage");
  };

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", handleStorage);
    if (typeof window.BroadcastChannel === "function") {
      try {
        broadcastChannel = new window.BroadcastChannel(SYNC_CHANNEL);
        broadcastChannel.addEventListener("message", (event) => {
          if (event.data?.sourceId !== sourceId && event.data?.state) {
            acceptExternalState(event.data.state, "broadcast", event.data.persisted !== false);
          }
        });
      } catch (error) {
        console.warn("Could not open live board channel", error);
      }
    }
  }

  function emit() {
    state.syncVersion = normalizedSyncVersion(state) + 1;
    state.syncUpdatedAt = new Date().toISOString();
    state.syncMutationId = `${sourceId}:${state.syncVersion}:${crypto.randomUUID()}`;
    let persisted = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      persisted = true;
    } catch (error) {
      console.warn("Could not persist workspace state", error);
    }
    notify({ source: "local", persisted, concurrent: false });
    try {
      broadcastChannel?.postMessage({ sourceId, state, persisted });
    } catch (error) {
      console.warn("Could not broadcast live board state", error);
    }
  }

  function notify(change) {
    listeners.forEach((listener) => listener(state, change));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mergequeue:state", { detail: state }));
  }

  function acceptExternalState(value, transport, persisted = true) {
    try {
      const incoming = normalizeStoredState(typeof value === "string" ? JSON.parse(value) : clone(value));
      if (!incoming || incoming.syncMutationId === state.syncMutationId) return;
      const comparison = compareSyncClock(incoming, state);
      const concurrent = normalizedSyncVersion(incoming) === normalizedSyncVersion(state);
      if (comparison > 0) {
        state = incoming;
        notify({ source: "external", transport, persisted, concurrent });
        return;
      }
      if (concurrent && comparison < 0) {
        // Two tabs can write the same local revision within one event loop. Reassert
        // the deterministic winner so every open tab converges on one snapshot.
        let reconciledPersisted = false;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          reconciledPersisted = true;
          broadcastChannel?.postMessage({ sourceId, state, persisted: true });
        } catch (error) {
          console.warn("Could not reconcile concurrent board state", error);
        }
        notify({ source: "local", persisted: reconciledPersisted, concurrent: true });
      }
    } catch (error) {
      console.warn("Could not apply live board update", error);
    }
  }

  function addActivity(actor, title, detail = "") {
    state.activity.unshift(activity(actor, title, detail));
    state.activity = state.activity.slice(0, 80);
  }

  function updateWorkspaceTask(taskId, patch, actor = "human", expectedVersion) {
    const current = state.workspace.tasks[taskId];
    if (!current) throw new Error(`Task not found: ${taskId}`);
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new Error("This task changed in another tab. Review the latest version before saving.");
    }
    const cleanPatch = validateTaskPatch(patch, state.workspace.people);
    if (cleanPatch.status && cleanPatch.status !== current.status) {
      cleanPatch.position = Object.values(state.workspace.tasks).filter((item) => item.id !== taskId && item.status === cleanPatch.status && !item.archived).length;
    } else if (cleanPatch.archived === false && current.archived) {
      cleanPatch.position = Object.values(state.workspace.tasks).filter((item) => item.id !== taskId && item.status === current.status && !item.archived).length;
    }
    state.workspace.tasks[taskId] = {
      ...current,
      ...cleanPatch,
      id: current.id,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    normalizePositions(state.workspace);
    state.workspace.revision += 1;
    state.workspace.updatedAt = new Date().toISOString();
    if (state.branch?.preview) {
      state.branch.preview = null;
      state.branch.status = "open";
    }
    addActivity(actor, `${actor === "human" ? "You changed" : "Changed"} ${current.title}`, describePatch(current, cleanPatch, state.workspace.people));
    emit();
    return clone(state.workspace.tasks[taskId]);
  }

  function createWorkspaceTask(input, actor = "human") {
    const { id: requestedId, ...taskFields } = input || {};
    const cleanInput = validateTaskPatch(taskFields, state.workspace.people);
    if (!Object.hasOwn(cleanInput, "title") || !Object.hasOwn(cleanInput, "status")) throw new Error("Title and status are required.");
    const id = requestedId || `task-${crypto.randomUUID().slice(0, 8)}`;
    validateId(id);
    if (state.workspace.tasks[id]) throw new Error(`Task already exists: ${id}`);
    const now = new Date().toISOString();
    const taskValue = {
      id,
      title: cleanInput.title,
      description: cleanInput.description || "",
      status: cleanInput.status,
      position: Object.values(state.workspace.tasks).filter((item) => item.status === cleanInput.status && !item.archived).length,
      priority: cleanInput.priority || "medium",
      ownerId: cleanInput.ownerId || null,
      dueDate: cleanInput.dueDate || null,
      labels: cleanInput.labels || [],
      archived: cleanInput.archived || false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    state.workspace.tasks[id] = taskValue;
    state.workspace.revision += 1;
    state.workspace.updatedAt = now;
    if (state.branch?.preview) {
      state.branch.preview = null;
      state.branch.status = "open";
    }
    addActivity(actor, `${actor === "human" ? "You created" : "Created"} ${taskValue.title}`, `Added to ${labelForStatus(taskValue.status)}.`);
    emit();
    return clone(taskValue);
  }

  function beginBranch(intent, expectedWorkspaceRevision) {
    if (state.branch && !["merged", "aborted"].includes(state.branch.status)) {
      throw new Error(`Branch ${state.branch.id} is already active.`);
    }
    if (expectedWorkspaceRevision !== undefined && expectedWorkspaceRevision !== state.workspace.revision) {
      throw new Error(`Expected revision ${expectedWorkspaceRevision}, found ${state.workspace.revision}.`);
    }
    if (typeof intent !== "string" || intent.trim().length < 8 || intent.trim().length > 240) {
      throw new Error("Branch intent must be between 8 and 240 characters.");
    }
    const snapshot = clone(state.workspace);
    state.branch = {
      id: `branch-${crypto.randomUUID().slice(0, 8)}`,
      intent: intent.trim(),
      baseRevision: state.workspace.revision,
      baseSnapshot: snapshot,
      workingSnapshot: clone(snapshot),
      operations: [],
      status: "open",
      preview: null,
      createdAt: new Date().toISOString(),
    };
    addActivity("agent", "Agent opened a branch", intent);
    emit();
    return clone(state.branch);
  }

  function stageTaskUpdates(branchId, updates) {
    const branch = requireOpenBranch(branchId);
    if (!Array.isArray(updates) || updates.length < 1 || updates.length > 12) {
      throw new Error("Provide between 1 and 12 task updates.");
    }
    const outcomes = [];
    for (const update of updates) {
      const current = branch.workingSnapshot.tasks[update.taskId];
      if (!current) {
        outcomes.push({ taskId: update.taskId, ok: false, error: "Task not found" });
        continue;
      }
      let patch;
      try {
        patch = validateTaskPatch(update.patch, branch.workingSnapshot.people);
        if (typeof update.rationale !== "string" || update.rationale.trim().length < 3 || update.rationale.trim().length > 180) {
          throw new Error("Rationale must be between 3 and 180 characters.");
        }
      } catch (error) {
        outcomes.push({ taskId: update.taskId, ok: false, error: error.message });
        continue;
      }
      const nextPosition = patch.status && patch.status !== current.status
        ? Object.values(branch.workingSnapshot.tasks).filter((item) => item.id !== update.taskId && item.status === patch.status && !item.archived).length
        : current.position;
      const after = {
        ...current,
        ...clone(patch),
        position: nextPosition,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      };
      branch.workingSnapshot.tasks[update.taskId] = after;
      branch.operations.push({
        id: `op-${crypto.randomUUID().slice(0, 8)}`,
        type: patch.archived === true ? "archive" : patch.status ? "move" : "update",
        taskId: update.taskId,
        before: clone(current),
        after: clone(after),
        patch: clone(patch),
        rationale: update.rationale.trim(),
        createdAt: new Date().toISOString(),
      });
      outcomes.push({ taskId: update.taskId, ok: true, changed: Object.keys(patch) });
      addActivity("agent", `Agent proposed ${current.title}`, describePatch(current, patch, state.workspace.people));
    }
    branch.preview = null;
    branch.status = "open";
    emit();
    return outcomes;
  }

  function stageNewTask(branchId, input, rationale = "") {
    const branch = requireOpenBranch(branchId);
    if (typeof rationale !== "string" || rationale.trim().length < 3 || rationale.trim().length > 180) {
      throw new Error("Rationale must be between 3 and 180 characters.");
    }
    const { id: requestedId, ...taskFields } = input || {};
    const cleanInput = validateTaskPatch(taskFields, branch.workingSnapshot.people);
    if (!Object.hasOwn(cleanInput, "title") || !Object.hasOwn(cleanInput, "status")) throw new Error("Title and status are required.");
    const id = requestedId || `agent-${crypto.randomUUID().slice(0, 8)}`;
    validateId(id);
    if (branch.workingSnapshot.tasks[id]) throw new Error(`Task already exists: ${id}`);
    const now = new Date().toISOString();
    const newTask = {
      id,
      title: cleanInput.title,
      description: cleanInput.description || "",
      status: cleanInput.status,
      position: Object.values(branch.workingSnapshot.tasks).filter((item) => item.status === cleanInput.status && !item.archived).length,
      priority: cleanInput.priority || "medium",
      ownerId: cleanInput.ownerId || null,
      dueDate: cleanInput.dueDate || null,
      labels: cleanInput.labels || [],
      archived: cleanInput.archived || false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    branch.workingSnapshot.tasks[id] = newTask;
    branch.operations.push({
      id: `op-${crypto.randomUUID().slice(0, 8)}`,
      type: "create",
      taskId: id,
      before: null,
      after: clone(newTask),
      rationale: rationale.trim(),
      createdAt: now,
    });
    branch.preview = null;
    addActivity("agent", `Agent proposed ${newTask.title}`, `New task in ${labelForStatus(newTask.status)}.`);
    emit();
    return clone(newTask);
  }

  function previewMerge(branchId = state.branch?.id) {
    const branch = requireOpenBranch(branchId);
    const preview = mergeWorkspaces(branch.baseSnapshot, state.workspace, branch.workingSnapshot);
    branch.preview = preview;
    branch.status = preview.conflicts.length ? "conflicted" : "awaiting_approval";
    addActivity(
      "system",
      "Merge preview prepared",
      `${preview.stats.safe} safe · ${preview.stats.conflicts} need${preview.stats.conflicts === 1 ? "s" : ""} your call.`,
    );
    emit();
    return clone(preview);
  }

  function resolveConflict(conflictId, choice, customValue) {
    if (!state.branch?.preview) throw new Error("Create a merge preview first.");
    const conflict = state.branch.preview.conflicts.find((item) => item.id === conflictId);
    if (!conflict) throw new Error(`Conflict not found: ${conflictId}`);
    if (!["human", "agent", "custom"].includes(choice)) throw new Error(`Unsupported resolution: ${choice}`);
    conflict.resolution = { choice, ...(choice === "custom" ? { value: customValue } : {}) };
    const remaining = state.branch.preview.conflicts.filter((item) => !item.resolution).length;
    state.branch.status = remaining ? "conflicted" : "awaiting_approval";
    addActivity("human", `You resolved ${taskName(conflict.taskId)}`, `${choice === "human" ? "Kept your value" : choice === "agent" ? "Used the agent value" : "Chose a custom value"} for ${fieldLabel(conflict.field)}.`);
    emit();
    return { remaining };
  }

  function commitMerge(branchId = state.branch?.id) {
    const branch = state.branch;
    if (!branch || branch.id !== branchId) throw new Error("Active branch not found.");
    if (branch.status === "merged") {
      if (state.lastCommit?.branchId === branch.id) return clone(state.lastCommit);
      throw new Error("This branch has already been merged.");
    }
    if (branch.status === "aborted") throw new Error("An aborted branch cannot be committed.");
    if (!branch.preview) throw new Error("Create a merge preview first.");
    if (branch.preview.workspaceRevision !== state.workspace.revision) {
      branch.preview = null;
      branch.status = "open";
      emit();
      throw new Error("The workspace changed after the preview. Preview the merge again.");
    }
    const beforeSnapshot = clone(state.workspace);
    const resolved = applyConflictResolutions(branch.preview);
    resolved.revision = state.workspace.revision + 1;
    resolved.updatedAt = new Date().toISOString();
    for (const item of Object.values(resolved.tasks)) {
      const before = beforeSnapshot.tasks[item.id];
      if (!before || !deepEqual(before, item)) {
        item.version = (before?.version || 0) + 1;
        item.updatedAt = resolved.updatedAt;
      }
    }
    state.workspace = resolved;
    state.lastCommit = {
      id: `merge-${crypto.randomUUID().slice(0, 8)}`,
      branchId: branch.id,
      beforeSnapshot,
      afterSnapshot: clone(resolved),
      conflictResolutions: clone(branch.preview.conflicts),
      operationCount: branch.operations.length,
      committedAt: new Date().toISOString(),
      reverted: false,
    };
    branch.status = "merged";
    addActivity("system", "Merge committed", `${branch.operations.length} staged operations landed without losing your edits.`);
    emit();
    return clone(state.lastCommit);
  }

  function abortBranch(branchId = state.branch?.id) {
    if (!state.branch || state.branch.id !== branchId) throw new Error("Active branch not found.");
    if (state.branch.status === "merged") throw new Error("A committed branch cannot be aborted.");
    state.branch.status = "aborted";
    addActivity("human", "You aborted the agent branch", "The main workspace was not changed.");
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
    addActivity("human", "You reverted the last merge", `Restored the board as revision ${restored.revision}.`);
    emit();
    return clone(restored);
  }

  function reset() {
    const currentSyncVersion = normalizedSyncVersion(state);
    state = createSeedState();
    state.syncVersion = currentSyncVersion;
    emit();
  }

  function requireOpenBranch(branchId) {
    if (!state.branch || state.branch.id !== branchId) throw new Error("Active branch not found.");
    if (["merged", "aborted"].includes(state.branch.status)) throw new Error(`Branch is ${state.branch.status}.`);
    return state.branch;
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function destroy() {
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("storage", handleStorage);
    }
    broadcastChannel?.close();
    listeners.clear();
  }

  return {
    getState,
    subscribe,
    destroy,
    reset,
    updateWorkspaceTask,
    createWorkspaceTask,
    beginBranch,
    stageTaskUpdates,
    stageNewTask,
    previewMerge,
    resolveConflict,
    commitMerge,
    abortBranch,
    revertLastMerge,
  };
}

function normalizeStoredState(value) {
  if (!value || typeof value !== "object" || !value.workspace || typeof value.workspace !== "object") return null;
  if (!value.workspace.tasks || typeof value.workspace.tasks !== "object" || !value.workspace.people || typeof value.workspace.people !== "object") return null;
  if (!Array.isArray(value.activity)) value.activity = [];
  if (!Number.isInteger(value.syncVersion) || value.syncVersion < 1) {
    value.syncVersion = Math.max(1, Number(value.workspace.revision) || 1) + value.activity.length;
  }
  if (typeof value.syncUpdatedAt !== "string") {
    value.syncUpdatedAt = value.activity[0]?.at || value.workspace.updatedAt || new Date().toISOString();
  }
  if (typeof value.syncMutationId !== "string") {
    value.syncMutationId = `legacy:${value.syncUpdatedAt}:${value.activity.length}:${value.branch?.operations?.length || 0}`;
  }
  return value;
}

function normalizedSyncVersion(value) {
  return Number.isInteger(value?.syncVersion) ? value.syncVersion : Math.max(1, Number(value?.workspace?.revision) || 1);
}

function compareSyncClock(left, right) {
  const versionDifference = normalizedSyncVersion(left) - normalizedSyncVersion(right);
  if (versionDifference) return versionDifference;
  const timeDifference = String(left.syncUpdatedAt || "").localeCompare(String(right.syncUpdatedAt || ""));
  if (timeDifference) return timeDifference;
  return String(left.syncMutationId || "").localeCompare(String(right.syncMutationId || ""));
}

function describePatch(before, patch, people) {
  const descriptions = [];
  if (patch.status && patch.status !== before.status) descriptions.push(`${labelForStatus(before.status)} → ${labelForStatus(patch.status)}`);
  if (patch.priority && patch.priority !== before.priority) descriptions.push(`priority → ${patch.priority}`);
  if (Object.hasOwn(patch, "ownerId") && patch.ownerId !== before.ownerId) descriptions.push(`owner → ${patch.ownerId ? people[patch.ownerId]?.name || patch.ownerId : "unassigned"}`);
  if (Object.hasOwn(patch, "dueDate") && patch.dueDate !== before.dueDate) descriptions.push(`due → ${patch.dueDate || "none"}`);
  if (patch.archived === true && !before.archived) descriptions.push("archived");
  return descriptions.join(" · ") || "Task details updated.";
}

function labelForStatus(status) {
  return STATUSES.find((item) => item.id === status)?.label || status;
}

function fieldLabel(field) {
  return { ownerId: "owner", dueDate: "due date", status: "status", $task: "task" }[field] || field;
}

function taskName(id) {
  return id.replaceAll("-", " ");
}
