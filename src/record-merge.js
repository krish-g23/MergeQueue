import { clone, deepEqual, mergeField } from "./merge.js";

export function mergeRecordWorkspaces(baseWorkspace, humanWorkspace, agentWorkspace, config) {
  const mergedWorkspace = clone(humanWorkspace);
  const conflicts = [];
  const safeChanges = [];
  const sameChanges = [];
  const ids = new Set([
    ...Object.keys(baseWorkspace.records),
    ...Object.keys(humanWorkspace.records),
    ...Object.keys(agentWorkspace.records),
  ]);

  for (const recordId of ids) {
    const base = baseWorkspace.records[recordId];
    const human = humanWorkspace.records[recordId];
    const agent = agentWorkspace.records[recordId];

    if (!base && agent && !human) {
      mergedWorkspace.records[recordId] = clone(agent);
      safeChanges.push({ recordId, field: "$record", kind: "create", value: clone(agent) });
      continue;
    }

    if (!base && human && !agent) continue;

    if (!base && human && agent) {
      if (!deepEqual(human, agent)) {
        conflicts.push(makeWholeRecordConflict(recordId, null, human, agent, config));
      }
      continue;
    }

    if (!human || !agent) {
      conflicts.push(makeWholeRecordConflict(recordId, base, human ?? null, agent ?? null, config));
      if (human || agent) mergedWorkspace.records[recordId] = clone(human ?? agent);
      continue;
    }

    const mergedRecord = clone(human);
    for (const field of config.fields) {
      const result = mergeField(base[field], human[field], agent[field]);
      if (result.kind === "apply_agent") {
        mergedRecord[field] = result.value;
        safeChanges.push({
          recordId,
          field,
          kind: "apply_agent",
          from: cloneMaybe(human[field]),
          value: cloneMaybe(agent[field]),
        });
      } else if (result.kind === "same_change" && !deepEqual(base[field], human[field])) {
        sameChanges.push({ recordId, field, value: cloneMaybe(human[field]) });
      } else if (result.kind === "conflict") {
        conflicts.push({
          id: `${recordId}::${field}`,
          recordId,
          field,
          kind: config.classifyConflict?.(field, human[field], agent[field]) ?? "field_conflict",
          baseValue: result.baseValue,
          humanValue: result.humanValue,
          agentValue: result.agentValue,
          explanation: `You and the agent changed ${config.fieldLabels[field] ?? field} differently.`,
          consequence: config.consequences[field] ?? "Only the value you approve will be committed.",
          resolution: null,
        });
      }
    }
    mergedWorkspace.records[recordId] = mergedRecord;
  }

  config.normalize?.(mergedWorkspace);
  return {
    workspaceRevision: humanWorkspace.revision,
    mergedWorkspace,
    conflicts,
    safeChanges,
    sameChanges,
    stats: {
      safe: safeChanges.length,
      same: sameChanges.length,
      conflicts: conflicts.length,
      affectedRecords: new Set([
        ...safeChanges.map((change) => change.recordId),
        ...sameChanges.map((change) => change.recordId),
        ...conflicts.map((conflict) => conflict.recordId),
      ]).size,
    },
  };
}

export function applyRecordResolutions(preview, normalize) {
  const unresolved = preview.conflicts.filter((conflict) => !conflict.resolution);
  if (unresolved.length) {
    throw new Error(`${unresolved.length} decision${unresolved.length === 1 ? "" : "s"} still need you.`);
  }

  const result = clone(preview.mergedWorkspace);
  for (const conflict of preview.conflicts) {
    const selected = conflict.resolution.choice === "human"
      ? conflict.humanValue
      : conflict.resolution.choice === "agent"
        ? conflict.agentValue
        : conflict.resolution.value;
    if (conflict.field === "$record") {
      if (selected === null || selected === undefined) delete result.records[conflict.recordId];
      else result.records[conflict.recordId] = clone(selected);
    } else if (result.records[conflict.recordId]) {
      result.records[conflict.recordId][conflict.field] = cloneMaybe(selected);
    }
  }
  normalize?.(result);
  return result;
}

function makeWholeRecordConflict(recordId, base, human, agent, config) {
  return {
    id: `${recordId}::$record`,
    recordId,
    field: "$record",
    kind: "delete_vs_edit",
    baseValue: cloneMaybe(base),
    humanValue: cloneMaybe(human),
    agentValue: cloneMaybe(agent),
    explanation: `The human and agent produced incompatible versions of this ${config.singular}.`,
    consequence: `Choose which ${config.singular} version should survive.`,
    resolution: null,
  };
}

function cloneMaybe(value) {
  return value === undefined ? undefined : clone(value);
}
