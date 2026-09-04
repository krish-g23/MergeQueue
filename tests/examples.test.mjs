import test from "node:test";
import assert from "node:assert/strict";
import { mergeRecordWorkspaces, applyRecordResolutions } from "../src/record-merge.js";
import { createDemoStore } from "../src/demo-store.js";
import {
  createWeddingSeed,
  weddingAgentUpdates,
  weddingHumanUpdates,
  weddingMergeConfig,
  weddingStoreConfig,
} from "../examples/wedding/data.js";
import { createWeddingTools } from "../examples/wedding/webmcp.js";
import {
  createShopSeed,
  shopAgentUpdates,
  shopHumanUpdates,
  shopMergeConfig,
  shopStoreConfig,
} from "../examples/shopify/data.js";
import { createShopTools } from "../examples/shopify/webmcp.js";

function applyUpdates(workspace, updates) {
  for (const update of updates) Object.assign(workspace.records[update.recordId], structuredClone(update.patch));
  return workspace;
}

function installBrowserState() {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  global.window = { dispatchEvent() {}, addEventListener() {} };
  global.CustomEvent = class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init?.detail; }
  };
}

test("wedding walkthrough produces exactly two seating conflicts and one meal conflict", () => {
  const base = createWeddingSeed().workspace;
  const human = applyUpdates(structuredClone(base), weddingHumanUpdates);
  human.revision = 5;
  const agent = applyUpdates(structuredClone(base), weddingAgentUpdates);
  const preview = mergeRecordWorkspaces(base, human, agent, weddingMergeConfig);

  assert.equal(preview.conflicts.length, 3);
  assert.deepEqual(preview.conflicts.map(({ recordId, field }) => `${recordId}:${field}`).sort(), [
    "grandma-rose:tableId",
    "jordan:tableId",
    "priya:meal",
  ]);
  assert.equal(preview.sameChanges.some(({ recordId, field }) => recordId === "photographer" && field === "locked"), true);
});

test("merchant walkthrough produces price, inventory, and publication conflicts", () => {
  const base = createShopSeed().workspace;
  const human = applyUpdates(structuredClone(base), shopHumanUpdates);
  human.revision = 5;
  const agent = applyUpdates(structuredClone(base), shopAgentUpdates);
  const preview = mergeRecordWorkspaces(base, human, agent, shopMergeConfig);

  assert.equal(preview.conflicts.length, 3);
  assert.deepEqual(preview.conflicts.map(({ recordId, field }) => `${recordId}:${field}`).sort(), [
    "aurora-lamp:price",
    "linen-throw:status",
    "weekender:inventory",
  ]);
  assert.equal(preview.mergedWorkspace.records["arc-lamp"].protectedPrice, true);
  assert.equal(preview.mergedWorkspace.records["arc-lamp"].featured, true);
});

test("generic record merge refuses to apply unresolved decisions", () => {
  const base = createShopSeed().workspace;
  const human = applyUpdates(structuredClone(base), shopHumanUpdates);
  const agent = applyUpdates(structuredClone(base), shopAgentUpdates);
  const preview = mergeRecordWorkspaces(base, human, agent, shopMergeConfig);
  assert.throws(() => applyRecordResolutions(preview), /still need you/);
  for (const conflict of preview.conflicts) conflict.resolution = { choice: "human" };
  const resolved = applyRecordResolutions(preview);
  assert.equal(resolved.records["aurora-lamp"].price, 124);
});

test("wedding store completes an atomic merge and exact revert", () => {
  installBrowserState();
  const store = createDemoStore(weddingStoreConfig);
  const branch = store.beginBranch("Rebalance the wedding room", 1);
  store.stageUpdates(branch.id, weddingAgentUpdates);
  for (const update of weddingHumanUpdates) store.humanUpdate(update.recordId, update.patch);
  const preview = store.previewMerge(branch.id);
  assert.equal(preview.conflicts.length, 3);
  for (const conflict of store.getState().branch.preview.conflicts) store.resolveConflict(conflict.id, "human");
  const beforeCommit = store.getState().workspace.revision;
  const commit = store.commitMerge(branch.id);
  assert.equal(store.commitMerge(branch.id).id, commit.id);
  assert.equal(store.getState().workspace.revision, beforeCommit + 1);
  const reverted = store.revertLastMerge();
  assert.equal(reverted.revision, beforeCommit + 2);
  assert.equal(reverted.records["grandma-rose"].tableId, "head");
});

test("domain tool catalogs are narrow and never expose commit", () => {
  const wedding = createWeddingTools({});
  const shop = createShopTools({});
  assert.equal(wedding.length, 9);
  assert.equal(shop.length, 9);
  assert.equal(wedding.some(({ name }) => name.includes("commit")), false);
  assert.equal(shop.some(({ name }) => name.includes("commit")), false);
  assert.equal(wedding.every(({ inputSchema }) => inputSchema.additionalProperties === false), true);
  assert.equal(shop.every(({ inputSchema }) => inputSchema.additionalProperties === false), true);
  assert.equal(wedding.find(({ name }) => name === "get_seating_plan").annotations.readOnlyHint, true);
  assert.equal(shop.find(({ name }) => name === "get_catalog").annotations.readOnlyHint, true);
});
