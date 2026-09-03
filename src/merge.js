export const MERGE_FIELDS = [
  "title",
  "description",
  "status",
  "position",
  "priority",
  "ownerId",
  "dueDate",
  "labels",
  "archived",
];

export function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function mergeField(base, human, agent) {
  if (deepEqual(agent, base)) {
    return { kind: "keep_human", value: cloneValue(human) };
  }
  if (deepEqual(human, base)) {
    return { kind: "apply_agent", value: cloneValue(agent) };
  }
  if (deepEqual(human, agent)) {
    return { kind: "same_change", value: cloneValue(human) };
  }
  return {
    kind: "conflict",
    baseValue: cloneValue(base),
    humanValue: cloneValue(human),
    agentValue: cloneValue(agent),
  };
}

function cloneValue(value) {
  return value === undefined ? undefined : clone(value);
}

function classifyConflict(field, human, agent) {
  if (field === "archived") return "archive_vs_edit";
  if (field === "status" || field === "position") return "move_conflict";
  if (human === undefined || agent === undefined) return "delete_vs_edit";
  return "field_conflict";
}

function humanizeField(field) {
  return {
    ownerId: "owner",
    dueDate: "due date",
    archived: "archive state",
    position: "position",
  }[field] ?? field;
}

function consequenceFor(field, human, agent) {
  if (field === "ownerId") {
    return "The selected owner’s workload and accountability will change.";
  }
  if (field === "dueDate") {
    return "Downstream launch timing may depend on this deadline.";
  }
  if (field === "status" || field === "position") {
    return "The task will appear in a different point of the workflow.";
  }
  if (field === "archived") {
    return agent ? "Using the agent value removes the task from the active board." : "Keeping the human value leaves the task active.";
  }
  return "Only the value you select will be committed.";
}

export function mergeWorkspaces(baseWorkspace, humanWorkspace, agentWorkspace) {
  const merged = clone(humanWorkspace);
  const conflicts = [];
  const safeChanges = [];
  const sameChanges = [];
  const allIds = new Set([
    ...Object.keys(baseWorkspace.tasks),
    ...Object.keys(humanWorkspace.tasks),
    ...Object.keys(agentWorkspace.tasks),
  ]);

  for (const taskId of allIds) {
    const baseTask = baseWorkspace.tasks[taskId];
    const humanTask = humanWorkspace.tasks[taskId];
    const agentTask = agentWorkspace.tasks[taskId];

    if (!baseTask && agentTask && !humanTask) {
      merged.tasks[taskId] = clone(agentTask);
      safeChanges.push({ taskId, field: "$task", kind: "create", value: clone(agentTask) });
      continue;
    }

    if (!baseTask && humanTask && !agentTask) {
      continue;
    }

    if (!baseTask && humanTask && agentTask) {
      if (!deepEqual(humanTask, agentTask)) {
        conflicts.push({
          id: `${taskId}::$task`,
          taskId,
          field: "$task",
          kind: "field_conflict",
          baseValue: null,
          humanValue: clone(humanTask),
          agentValue: clone(agentTask),
          explanation: "The human and agent created different tasks with the same ID.",
          consequences: ["Choose which task should keep this identifier."],
          resolution: null,
        });
      }
      continue;
    }

    if (!humanTask && !agentTask) {
      delete merged.tasks[taskId];
      sameChanges.push({ taskId, field: "$task", kind: "delete", value: null });
      continue;
    }

    if (!humanTask && agentTask && deepEqual(baseTask, agentTask)) {
      delete merged.tasks[taskId];
      continue;
    }

    if (humanTask && !agentTask && deepEqual(baseTask, humanTask)) {
      delete merged.tasks[taskId];
      safeChanges.push({ taskId, field: "$task", kind: "delete", from: clone(humanTask), value: null });
      continue;
    }

    if (!humanTask || !agentTask) {
      const surviving = humanTask ?? agentTask;
      conflicts.push({
        id: `${taskId}::$task`,
        taskId,
        field: "$task",
        kind: "delete_vs_edit",
        baseValue: clone(baseTask),
        humanValue: humanTask ? clone(humanTask) : null,
        agentValue: agentTask ? clone(agentTask) : null,
        explanation: "One side removed this task while the other kept editing it.",
        consequences: ["Keeping the surviving version preserves its latest edits."],
        resolution: null,
      });
      if (surviving) merged.tasks[taskId] = clone(surviving);
      continue;
    }

    const mergedTask = clone(humanTask);
    const otherFields = MERGE_FIELDS.filter((field) => field !== "archived");
    const humanArchivedChanged = !deepEqual(baseTask.archived, humanTask.archived);
    const agentArchivedChanged = !deepEqual(baseTask.archived, agentTask.archived);
    const humanEditedContent = otherFields.some((field) => !deepEqual(baseTask[field], humanTask[field]));
    const agentEditedContent = otherFields.some((field) => !deepEqual(baseTask[field], agentTask[field]));
    const hasArchiveVsEditConflict =
      (humanArchivedChanged && !agentArchivedChanged && agentEditedContent)
      || (agentArchivedChanged && !humanArchivedChanged && humanEditedContent);

    for (const field of MERGE_FIELDS) {
      if (field === "archived" && hasArchiveVsEditConflict) {
        conflicts.push({
          id: `${taskId}::${field}`,
          taskId,
          field,
          kind: "archive_vs_edit",
          baseValue: cloneValue(baseTask[field]),
          humanValue: cloneValue(humanTask[field]),
          agentValue: cloneValue(agentTask[field]),
          explanation: "One side archived this task while the other continued editing it.",
          consequences: ["Archiving removes the task from the active board, but its latest details remain recoverable."],
          resolution: null,
        });
        continue;
      }
      const result = mergeField(baseTask[field], humanTask[field], agentTask[field]);
      if (result.kind === "apply_agent") {
        mergedTask[field] = result.value;
        safeChanges.push({
          taskId,
          field,
          kind: "apply_agent",
          from: cloneValue(humanTask[field]),
          value: cloneValue(agentTask[field]),
        });
      } else if (result.kind === "same_change" && !deepEqual(baseTask[field], humanTask[field])) {
        sameChanges.push({ taskId, field, value: cloneValue(humanTask[field]) });
      } else if (result.kind === "conflict") {
        conflicts.push({
          id: `${taskId}::${field}`,
          taskId,
          field,
          kind: classifyConflict(field, humanTask[field], agentTask[field]),
          baseValue: result.baseValue,
          humanValue: result.humanValue,
          agentValue: result.agentValue,
          explanation: `You and the agent changed the ${humanizeField(field)} differently.`,
          consequences: [consequenceFor(field, humanTask[field], agentTask[field])],
          resolution: null,
        });
      }
    }
    merged.tasks[taskId] = mergedTask;
  }

  normalizePositions(merged);

  return {
    workspaceRevision: humanWorkspace.revision,
    mergedWorkspace: merged,
    conflicts,
    safeChanges,
    sameChanges,
    stats: {
      safe: safeChanges.length,
      same: sameChanges.length,
      conflicts: conflicts.length,
      affectedTasks: new Set([
        ...safeChanges.map((change) => change.taskId),
        ...sameChanges.map((change) => change.taskId),
        ...conflicts.map((conflict) => conflict.taskId),
      ]).size,
    },
  };
}

export function applyConflictResolutions(preview) {
  const result = clone(preview.mergedWorkspace);
  const unresolved = preview.conflicts.filter((conflict) => !conflict.resolution);
  if (unresolved.length) {
    throw new Error(`${unresolved.length} conflict${unresolved.length === 1 ? "" : "s"} still need a human decision.`);
  }

  for (const conflict of preview.conflicts) {
    const { choice, value } = conflict.resolution;
    const chosen = choice === "human" ? conflict.humanValue : choice === "agent" ? conflict.agentValue : value;

    if (conflict.field === "$task") {
      if (chosen === null || chosen === undefined) delete result.tasks[conflict.taskId];
      else result.tasks[conflict.taskId] = clone(chosen);
    } else if (result.tasks[conflict.taskId]) {
      result.tasks[conflict.taskId][conflict.field] = cloneValue(chosen);
    }
  }

  normalizePositions(result);
  return result;
}

export function normalizePositions(workspace) {
  const statuses = ["backlog", "ready", "in_progress", "review", "done"];
  for (const status of statuses) {
    Object.values(workspace.tasks)
      .filter((task) => !task.archived && task.status === status)
      .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
      .forEach((task, index) => {
        task.position = index;
      });
  }
  return workspace;
}
