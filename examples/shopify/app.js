import { deepEqual } from "../../src/merge.js";
import { createDemoStore } from "../../src/demo-store.js";
import { registerDomainTools } from "../../src/domain-tools.js";
import { shopAgentUpdates, shopHumanUpdates, shopStoreConfig } from "./data.js";
import { shopToolSpec } from "./webmcp.js";

const store = createDemoStore(shopStoreConfig);
const $ = (selector) => document.querySelector(selector);
let currentFilter = "all";
let toolState = { supported: false, registered: 0, total: 9 };

store.subscribe(render);
wireEvents();
populateForm();
render(store.getState());
registerDomainTools(store, shopToolSpec, (status) => {
  toolState = status;
  renderTools();
});

function render(state) {
  $("#revision").textContent = state.workspace.revision;
  renderMetrics(state);
  renderCatalog(state);
  renderActivity(state);
  renderBranch(state);
  renderDemo(state);
  renderTools();
  if (!$("#merge-overlay").classList.contains("hidden") && state.branch?.preview) renderMerge(state);
}

function renderMetrics(state) {
  const products = Object.values(state.workspace.records);
  const active = products.filter((product) => product.status === "active");
  const units = products.reduce((sum, product) => sum + product.inventory, 0);
  const value = products.reduce((sum, product) => sum + product.inventory * product.price, 0);
  $("#metrics").innerHTML = [
    metric(active.length, "Active products"),
    metric(units, "Units in stock"),
    metric(money(value), "Retail value"),
    metric(products.filter((product) => product.featured).length, "Featured"),
  ].join("");
}

function renderCatalog(state) {
  const products = Object.values(state.workspace.records)
    .filter((product) => currentFilter === "all" || product.status === currentFilter);
  $("#catalog").innerHTML = products.map((product) => productCard(product, state)).join("");
}

function productCard(product, state) {
  const activeBranch = state.branch && !["merged", "aborted"].includes(state.branch.status);
  const working = activeBranch ? state.branch.workingSnapshot.records[product.id] : null;
  const proposal = working && !deepEqual(publicProduct(product), publicProduct(working));
  return `<button class="product-card ${proposal ? "has-proposal" : ""}" type="button" data-product-id="${product.id}">
    <span class="product-thumb tone-${product.tone}"></span>
    <span class="product-info">
      <span class="product-topline">
        <span class="status ${product.status}">${product.status}</span>
        ${proposal ? `<span class="proposal-badge">Agent staged</span>` : product.protectedPrice ? `<span class="price-lock">◆ Price locked</span>` : ""}
      </span>
      <h3>${escapeHtml(product.name)}</h3>
      <span class="collection">${escapeHtml(state.workspace.collections[product.collectionId].name)}</span>
      <span class="product-numbers"><span class="price">${money(product.price)}</span><span class="inventory">${product.inventory} in stock</span></span>
    </span>
    ${proposal ? `<span class="proposal-diff">${escapeHtml(proposalText(product, working, state))}</span>` : ""}
  </button>`;
}

function renderActivity(state) {
  $("#activity-count").textContent = state.activity.length;
  $("#activity").innerHTML = state.activity.slice(0, 18).map((entry) => `
    <li class="activity-item ${entry.actor}"><i></i><div><time>${relativeTime(entry.at)}</time><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.detail)}</p></div></li>
  `).join("");
}

function renderBranch(state) {
  const branch = state.branch;
  const active = branch && !["merged", "aborted"].includes(branch.status);
  $("#branch-bar").className = `branch-bar ${active ? "active" : branch?.status === "merged" ? "merged" : "idle"}`;
  $("#abort").classList.toggle("hidden", !active);
  $("#preview").classList.toggle("hidden", !active || branch.operations.length === 0);

  if (!branch || branch.status === "aborted") {
    $("#branch-label").textContent = "Live catalog";
    $("#branch-title").textContent = branch?.status === "aborted" ? "Merchandising branch aborted" : "No merchandising branch is open";
    $("#branch-detail").textContent = "Human edits publish to this simulated catalog immediately.";
  } else if (branch.status === "merged") {
    $("#branch-label").textContent = "Published safely";
    $("#branch-title").textContent = branch.intent;
    $("#branch-detail").textContent = `${branch.operations.length} proposals committed after merchant review.`;
  } else {
    $("#branch-label").textContent = `Agent branch · base r${branch.baseRevision}`;
    $("#branch-title").textContent = branch.intent;
    $("#branch-detail").textContent = `${branch.operations.length} proposed changes · merchant edits remain live`;
  }
}

function renderDemo(state) {
  const branch = state.branch;
  const humanDone = state.workspace.records["aurora-lamp"].price === 124
    && state.workspace.records.weekender.inventory === 12
    && state.workspace.records["linen-throw"].status === "archived";

  if (!branch || branch.status === "aborted") {
    setDemo("Step 1 of 3", "Start the weekend merchandise edit", "The agent stages twelve catalog decisions on an isolated branch.", "Start agent plan", "agent");
  } else if (branch.status !== "merged" && !humanDone) {
    setDemo("Step 2 of 3", "Keep merchandising while it works", "Change a price, correct stock, and archive a product on the live catalog.", "Make concurrent edits", "human");
  } else if (branch.status !== "merged") {
    setDemo("Step 3 of 3", branch.preview ? "Resolve the commercial calls" : "Compare both catalog edits", branch.preview ? "Only price, stock, and publication status need the merchant." : "Merge the original, merchant, and agent catalog states.", branch.preview ? "Review merge" : "Preview merge", "preview");
  } else {
    setDemo("Complete", "Both merchandising passes landed", "The catalog published as one reviewed revision and remains reversible.", state.lastCommit?.reverted ? "Reset demo" : "Revert merge", state.lastCommit?.reverted ? "reset" : "revert");
  }
}

function renderMerge(state) {
  const preview = state.branch.preview;
  $("#merge-stats").innerHTML = [
    stat(preview.stats.safe, "Safe fields", "safe"),
    stat(preview.stats.same, "Same decision", "same"),
    stat(preview.stats.conflicts, "Merchant calls", "conflict"),
  ].join("");
  $("#safe-count").textContent = `${preview.stats.safe} compatible`;
  const groups = groupSafe(preview.safeChanges, state);
  $("#safe-list").innerHTML = groups.slice(0, 10).map((group) => `<div class="safe-item"><strong>✓ ${escapeHtml(group.name)}</strong><span>${escapeHtml(group.fields.join(" · "))}</span></div>`).join("");
  $("#conflict-count").textContent = `${preview.conflicts.length} decisions`;
  $("#conflicts").innerHTML = preview.conflicts.map((conflict) => conflictCard(conflict, state)).join("");
  const remaining = preview.conflicts.filter((conflict) => !conflict.resolution).length;
  $("#readiness").textContent = remaining ? `${remaining} decision${remaining === 1 ? "" : "s"} left` : "Ready for merchant approval";
  $("#preview-revision").textContent = `Previewed against revision ${preview.workspaceRevision}`;
  $("#commit").disabled = remaining > 0;
}

function wireEvents() {
  $("#demo-button").addEventListener("click", () => act($("#demo-button").dataset.action));
  $("#preview").addEventListener("click", openPreview);
  $("#abort").addEventListener("click", () => { if (confirm("Abort the merchandising branch?")) store.abortBranch(); });
  $("#reset").addEventListener("click", () => { if (confirm("Reset the merchant demo?")) { store.reset(); closeMerge(); } });
  $("#catalog").addEventListener("click", (event) => {
    const card = event.target.closest("[data-product-id]");
    if (card) openProduct(card.dataset.productId);
  });
  $("#filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    currentFilter = button.dataset.filter;
    $("#filters .active")?.classList.remove("active");
    button.classList.add("active");
    renderCatalog(store.getState());
  });
  $("#product-form").addEventListener("submit", (event) => {
    event.preventDefault();
    store.humanUpdate($("#product-id").value, {
      name: $("#product-name").value.trim(),
      price: Number($("#product-price").value),
      inventory: Number($("#product-inventory").value),
      collectionId: $("#product-collection").value,
      status: $("#product-status").value,
      featured: $("#product-featured").checked,
      protectedPrice: $("#product-protected").checked,
    });
    $("#product-modal").classList.add("hidden");
  });
  document.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close]");
    if (close) document.getElementById(close.dataset.close).classList.add("hidden");
    const choice = event.target.closest("[data-conflict]");
    if (choice) store.resolveConflict(choice.dataset.conflict, choice.dataset.choice);
  });
  $("#merge-close").addEventListener("click", closeMerge);
  $("#scrim").addEventListener("click", closeMerge);
  $("#commit").addEventListener("click", () => {
    const result = store.commitMerge();
    closeMerge();
    toast("Catalog published", `${result.operationCount} proposals landed safely.`);
  });
  window.addEventListener("mergequeue:open-preview", showMerge);
}

function act(action) {
  try {
    if (action === "agent") {
      const branch = store.beginBranch("Prepare the weekend collection without overwriting live merchant decisions", store.getState().workspace.revision);
      store.stageUpdates(branch.id, shopAgentUpdates);
      toast("Merchandising branch ready", "Twelve proposals are staged; the live catalog is untouched.");
    }
    if (action === "human") {
      for (const update of shopHumanUpdates) store.humanUpdate(update.recordId, update.patch);
      toast("Four live edits saved", "The agent still has its original catalog branch.");
    }
    if (action === "preview") openPreview();
    if (action === "revert" && confirm("Revert the catalog merge?")) store.revertLastMerge();
    if (action === "reset") store.reset();
  } catch (error) {
    toast("Could not continue", error.message);
  }
}

function openPreview() {
  const branch = store.getState().branch;
  if (!branch) return toast("Start a branch first", "Use the walkthrough or ask your agent.");
  if (!branch.preview) store.previewMerge(branch.id);
  showMerge();
}

function showMerge() {
  if (!store.getState().branch?.preview) return;
  renderMerge(store.getState());
  $("#merge-overlay").classList.remove("hidden");
}

function closeMerge() {
  $("#merge-overlay").classList.add("hidden");
}

function openProduct(id) {
  const product = store.getState().workspace.records[id];
  $("#product-id").value = id;
  $("#product-name").value = product.name;
  $("#product-price").value = product.price;
  $("#product-inventory").value = product.inventory;
  $("#product-collection").value = product.collectionId;
  $("#product-status").value = product.status;
  $("#product-featured").checked = product.featured;
  $("#product-protected").checked = product.protectedPrice;
  $("#product-modal").classList.remove("hidden");
}

function populateForm() {
  const collections = shopStoreConfig.createSeed().workspace.collections;
  $("#product-collection").innerHTML = Object.values(collections).map((collection) => `<option value="${collection.id}">${escapeHtml(collection.name)}</option>`).join("");
}

function renderTools() {
  const element = $("#tool-status");
  element.classList.toggle("connected", toolState.supported);
  element.innerHTML = `<i></i>${toolState.supported ? `${toolState.registered} site tools` : "Demo mode"}`;
}

function setDemo(step, title, copy, button, action) {
  $("#demo-step").textContent = step;
  $("#demo-title").textContent = title;
  $("#demo-copy").textContent = copy;
  $("#demo-button").textContent = button;
  $("#demo-button").dataset.action = action;
}

function metric(value, label) {
  return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
}

function stat(value, label, tone) {
  return `<div class="merge-stat ${tone}"><strong>${value}</strong><span>${label}</span></div>`;
}

function publicProduct({ name, collectionId, price, compareAtPrice, inventory, status, featured, protectedPrice }) {
  return { name, collectionId, price, compareAtPrice, inventory, status, featured, protectedPrice };
}

function proposalText(live, working, state) {
  const parts = [];
  if (live.price !== working.price) parts.push(`agent → ${money(working.price)}`);
  if (live.inventory !== working.inventory) parts.push(`stock → ${working.inventory}`);
  if (live.status !== working.status) parts.push(`status → ${working.status}`);
  if (live.collectionId !== working.collectionId) parts.push(`collection → ${state.workspace.collections[working.collectionId].name}`);
  if (live.featured !== working.featured) parts.push(working.featured ? "feature" : "unfeature");
  return parts.join(" · ") || "agent edited";
}

function groupSafe(changes, state) {
  const groups = new Map();
  for (const change of changes) {
    if (!groups.has(change.recordId)) groups.set(change.recordId, { name: state.workspace.records[change.recordId]?.name || change.recordId, fields: [] });
    groups.get(change.recordId).fields.push(fieldLabel(change.field));
  }
  return [...groups.values()];
}

function conflictCard(conflict, state) {
  const product = state.workspace.records[conflict.recordId] || state.branch.workingSnapshot.records[conflict.recordId];
  const human = conflict.resolution?.choice === "human";
  const agent = conflict.resolution?.choice === "agent";
  return `<article class="conflict-card ${conflict.resolution ? "resolved" : ""}">
    <h4>${escapeHtml(product.name)} · ${escapeHtml(fieldLabel(conflict.field))}</h4>
    <p>${escapeHtml(conflict.explanation)}</p>
    <div class="base">Started with: <strong>${escapeHtml(formatValue(conflict.field, conflict.baseValue, state))}</strong></div>
    <div class="choices">
      <button class="choice ${human ? "selected" : ""}" data-conflict="${conflict.id}" data-choice="human"><span>Merchant chose</span><strong>${escapeHtml(formatValue(conflict.field, conflict.humanValue, state))}</strong></button>
      <button class="choice ${agent ? "selected" : ""}" data-conflict="${conflict.id}" data-choice="agent"><span>Agent proposed</span><strong>${escapeHtml(formatValue(conflict.field, conflict.agentValue, state))}</strong></button>
    </div>
    <p class="impact">↳ ${escapeHtml(conflict.consequence)}</p>
  </article>`;
}

function fieldLabel(field) {
  return {
    price: "Price",
    compareAtPrice: "Compare-at price",
    inventory: "Inventory",
    status: "Publication status",
    collectionId: "Collection",
    featured: "Featured placement",
    protectedPrice: "Price protection",
  }[field] || field;
}

function formatValue(field, value, state) {
  if (value === null || value === undefined) return "None";
  if (field === "price" || field === "compareAtPrice") return money(value);
  if (field === "collectionId") return state.workspace.collections[value]?.name || value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function relativeTime(date) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  return seconds < 8 ? "now" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function toast(title, message) {
  const element = document.createElement("div");
  element.className = "toast";
  element.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>`;
  $("#toasts").append(element);
  setTimeout(() => element.remove(), 5500);
}
