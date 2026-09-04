import { deepEqual } from "../../src/merge.js";
import { createDemoStore } from "../../src/demo-store.js";
import { registerDomainTools } from "../../src/domain-tools.js";
import { weddingAgentUpdates, weddingHumanUpdates, weddingStoreConfig } from "./data.js";
import { weddingToolSpec } from "./webmcp.js";

const store = createDemoStore(weddingStoreConfig);
const $ = (selector) => document.querySelector(selector);
let toolState = { supported: false, registered: 0, total: 9 };

store.subscribe(render);
wireEvents();
populateForm();
render(store.getState());
registerDomainTools(store, weddingToolSpec, (status) => { toolState = status; renderTools(); });

function render(state) {
  $("#revision").textContent = state.workspace.revision;
  renderMetrics(state);
  renderTables(state);
  renderActivity(state);
  renderBranch(state);
  renderDemo(state);
  if (!$("#merge-overlay").classList.contains("hidden") && state.branch?.preview) renderMerge(state);
  renderTools();
}

function renderMetrics(state) {
  const guests = Object.values(state.workspace.records);
  const meals = guests.filter((guest) => guest.meal !== "standard").length;
  const locked = guests.filter((guest) => guest.locked).length;
  $("#hero-metrics").innerHTML = metric(guests.length, "Guests") + metric(Object.keys(state.workspace.tables).length, "Tables") + metric(meals, "Special meals") + metric(locked, "Locked seats");
}

function renderTables(state) {
  const active = state.branch && !["merged", "aborted"].includes(state.branch.status);
  $("#floor-plan").innerHTML = "";
  for (const table of Object.values(state.workspace.tables)) {
    const liveGuests = Object.values(state.workspace.records).filter((guest) => guest.tableId === table.id);
    const card = document.createElement("article");
    card.className = "table";
    card.dataset.table = table.id;
    const capacityClass = liveGuests.length > table.capacity ? "capacity-warning" : "";
    card.innerHTML = `<div class="table-header"><h3>${escapeHtml(table.name)}</h3><p>${escapeHtml(table.note)}</p><span class="${capacityClass}">${liveGuests.length} / ${table.capacity} seated</span></div><div class="guest-list"></div>`;
    const list = card.querySelector(".guest-list");
    for (const guest of liveGuests) list.append(guestPill(guest, state, false));
    if (active) {
      const ghosts = Object.values(state.branch.workingSnapshot.records).filter((guest) => {
        const live = state.workspace.records[guest.id];
        return guest.tableId === table.id && live && live.tableId !== guest.tableId;
      });
      for (const guest of ghosts) list.append(guestPill(guest, state, true));
    }
    $("#floor-plan").append(card);
  }
}

function guestPill(guest, state, ghost) {
  const live = state.workspace.records[guest.id];
  const working = state.branch?.workingSnapshot.records[guest.id];
  const hasProposal = !ghost && live && working && !deepEqual(publicGuest(live), publicGuest(working)) && !["merged", "aborted"].includes(state.branch.status);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `guest ${ghost ? "ghost" : ""} ${guest.locked ? "locked" : ""} ${hasProposal ? "has-proposal" : ""}`;
  button.dataset.guestId = guest.id;
  button.draggable = !ghost;
  button.disabled = ghost;
  button.innerHTML = `${escapeHtml(guest.name)}${ghost ? `<small>agent → here</small>` : hasProposal ? `<small>${proposalText(live, working, state)}</small>` : ""}`;
  return button;
}

function renderActivity(state) {
  $("#activity-count").textContent = state.activity.length;
  $("#activity").innerHTML = state.activity.slice(0, 18).map((entry) => `<li class="activity-item ${entry.actor}"><i></i><div><time>${relativeTime(entry.at)}</time><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.detail)}</p></div></li>`).join("");
}

function renderBranch(state) {
  const branch = state.branch;
  const active = branch && !["merged", "aborted"].includes(branch.status);
  $("#branch-bar").className = `branch-bar ${active ? "active" : branch?.status === "merged" ? "merged" : "idle"}`;
  $("#abort").classList.toggle("hidden", !active);
  $("#preview").classList.toggle("hidden", !active || branch.operations.length === 0);
  if (!branch || branch.status === "aborted") {
    $("#branch-label").textContent = "Main floor plan";
    $("#branch-title").textContent = branch?.status === "aborted" ? "Agent branch aborted" : "No agent branch is open";
    $("#branch-detail").textContent = "Drag guests or click a name to edit the live plan.";
  } else if (branch.status === "merged") {
    $("#branch-label").textContent = "Merged safely";
    $("#branch-title").textContent = branch.intent;
    $("#branch-detail").textContent = `${branch.operations.length} proposals committed after human review.`;
  } else {
    $("#branch-label").textContent = `Agent branch · base r${branch.baseRevision}`;
    $("#branch-title").textContent = branch.intent;
    $("#branch-detail").textContent = `${branch.operations.length} proposed changes · your placements stay live`;
  }
}

function renderDemo(state) {
  const branch = state.branch;
  const humansDone = state.workspace.records["grandma-rose"].tableId === "head" && state.workspace.records.jordan.tableId === "family" && state.workspace.records.priya.meal === "gluten_free";
  if (!branch || branch.status === "aborted") setDemo("Step 1 of 3", "Ask the agent to rebalance the room", "Opens a private seating branch and stages twelve proposals.", "Start agent plan", "agent");
  else if (branch.status !== "merged" && !humansDone) setDemo("Step 2 of 3", "Keep arranging while it works", "Move Grandma, Jordan, and Priya in the live plan while the agent keeps its original branch.", "Make concurrent edits", "human");
  else if (branch.status !== "merged") setDemo("Step 3 of 3", branch.preview ? "Resolve what actually conflicts" : "Compare both arrangements", branch.preview ? "Only three decisions need you; every compatible move is already safe." : "Three-way merge the original, human, and agent seating plans.", branch.preview ? "Review merge" : "Preview merge", "preview");
  else setDemo("Complete", "The room reflects both sets of intent", "The approved seating plan landed as one revision and can still be reverted.", state.lastCommit?.reverted ? "Reset demo" : "Revert merge", state.lastCommit?.reverted ? "reset" : "revert");
}

function renderMerge(state) {
  const preview = state.branch.preview;
  $("#merge-stats").innerHTML = stat(preview.stats.safe, "Safe fields", "safe") + stat(preview.stats.same, "Same choice", "same") + stat(preview.stats.conflicts, "Your calls", "conflict");
  $("#safe-count").textContent = `${preview.stats.safe} compatible`;
  const groups = groupSafe(preview.safeChanges, state);
  $("#safe-list").innerHTML = groups.slice(0, 10).map((group) => `<div class="safe-item"><strong>✓ ${escapeHtml(group.name)}</strong><span>${escapeHtml(group.fields.join(" · "))}</span></div>`).join("");
  $("#conflict-count").textContent = `${preview.conflicts.length} decisions`;
  $("#conflicts").innerHTML = preview.conflicts.map((conflict) => conflictCard(conflict, state)).join("");
  const remaining = preview.conflicts.filter((conflict) => !conflict.resolution).length;
  $("#readiness").textContent = remaining ? `${remaining} decision${remaining === 1 ? "" : "s"} left` : "Ready for your approval";
  $("#preview-revision").textContent = `Previewed against revision ${preview.workspaceRevision}`;
  $("#commit").disabled = remaining > 0;
}

function wireEvents() {
  $("#demo-button").addEventListener("click", () => act($("#demo-button").dataset.action));
  $("#preview").addEventListener("click", openPreview);
  $("#abort").addEventListener("click", () => { if (confirm("Abort the agent seating branch?")) store.abortBranch(); });
  $("#reset").addEventListener("click", () => { if (confirm("Reset the wedding demo?")) { store.reset(); closeMerge(); } });
  $("#floor-plan").addEventListener("click", (event) => { const guest = event.target.closest("[data-guest-id]"); if (guest && !guest.classList.contains("ghost")) openGuest(guest.dataset.guestId); });
  $("#floor-plan").addEventListener("dragstart", (event) => { const guest = event.target.closest("[data-guest-id]"); if (!guest || guest.classList.contains("ghost")) return event.preventDefault(); event.dataTransfer.setData("text/guest-id", guest.dataset.guestId); });
  $("#floor-plan").addEventListener("dragover", (event) => { const table = event.target.closest(".table"); if (table) { event.preventDefault(); table.classList.add("over"); } });
  $("#floor-plan").addEventListener("dragleave", (event) => event.target.closest(".table")?.classList.remove("over"));
  $("#floor-plan").addEventListener("drop", (event) => { const table = event.target.closest(".table"); if (!table) return; event.preventDefault(); table.classList.remove("over"); const id = event.dataTransfer.getData("text/guest-id"); if (id) store.humanUpdate(id, { tableId: table.dataset.table }); });
  $("#guest-form").addEventListener("submit", (event) => { event.preventDefault(); store.humanUpdate($("#guest-id").value, { name: $("#guest-name").value.trim(), tableId: $("#guest-table").value, meal: $("#guest-meal").value, locked: $("#guest-locked").checked, note: $("#guest-note").value.trim() }); $("#guest-modal").classList.add("hidden"); });
  document.addEventListener("click", (event) => { const close = event.target.closest("[data-close]"); if (close) document.getElementById(close.dataset.close).classList.add("hidden"); const choice = event.target.closest("[data-conflict]"); if (choice) store.resolveConflict(choice.dataset.conflict, choice.dataset.choice); });
  $("#merge-close").addEventListener("click", closeMerge); $("#scrim").addEventListener("click", closeMerge);
  $("#commit").addEventListener("click", () => { const result = store.commitMerge(); closeMerge(); toast("Seating plan committed", `${result.operationCount} proposals landed safely.`); });
  window.addEventListener("mergequeue:open-preview", showMerge);
}

function act(action) {
  try {
    if (action === "agent") { const branch = store.beginBranch("Rebalance the reception while honoring relationships, meals, and room flow", store.getState().workspace.revision); store.stageUpdates(branch.id, weddingAgentUpdates); toast("Agent seating branch ready", "Twelve proposals are visible; your floor plan is untouched."); }
    if (action === "human") { for (const update of weddingHumanUpdates) store.humanUpdate(update.recordId, update.patch); toast("Four live choices saved", "The agent still has its original branch."); }
    if (action === "preview") openPreview();
    if (action === "revert") { if (confirm("Revert the seating merge?")) store.revertLastMerge(); }
    if (action === "reset") store.reset();
  } catch (error) { toast("Could not continue", error.message); }
}

function openPreview() { const branch = store.getState().branch; if (!branch) return toast("Start a branch first", "Use the walkthrough or ask your agent."); if (!branch.preview) store.previewMerge(branch.id); showMerge(); }
function showMerge() { if (!store.getState().branch?.preview) return; renderMerge(store.getState()); $("#merge-overlay").classList.remove("hidden"); }
function closeMerge() { $("#merge-overlay").classList.add("hidden"); }
function openGuest(id) { const guest = store.getState().workspace.records[id]; $("#guest-id").value = id; $("#guest-name").value = guest.name; $("#guest-table").value = guest.tableId; $("#guest-meal").value = guest.meal; $("#guest-locked").checked = guest.locked; $("#guest-note").value = guest.note; $("#guest-modal").classList.remove("hidden"); }
function populateForm() { const tables = weddingStoreConfig.createSeed().workspace.tables; $("#guest-table").innerHTML = Object.values(tables).map((table) => `<option value="${table.id}">${escapeHtml(table.name)}</option>`).join(""); }
function renderTools() { const el = $("#tool-status"); el.classList.toggle("connected", toolState.supported); el.innerHTML = `<i></i>${toolState.supported ? `${toolState.registered} site tools` : "Demo mode"}`; }
function setDemo(step, title, copy, button, action) { $("#demo-step").textContent = step; $("#demo-title").textContent = title; $("#demo-copy").textContent = copy; $("#demo-button").textContent = button; $("#demo-button").dataset.action = action; }
function metric(value, label) { return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`; }
function stat(value, label, tone) { return `<div class="merge-stat ${tone}"><strong>${value}</strong><span>${label}</span></div>`; }
function publicGuest({ name, tableId, meal, locked, note }) { return { name, tableId, meal, locked, note }; }
function proposalText(live, working, state) { const parts=[]; if(live.tableId!==working.tableId) parts.push(`agent → ${state.workspace.tables[working.tableId].name}`); if(live.meal!==working.meal) parts.push(`meal → ${working.meal.replaceAll("_"," ")}`); if(live.locked!==working.locked) parts.push(working.locked?"agent locks":"agent unlocks"); return parts.join(" · ") || "agent edited"; }
function groupSafe(changes, state) { const map=new Map(); for(const change of changes){ if(!map.has(change.recordId)) map.set(change.recordId,{name:state.workspace.records[change.recordId]?.name||change.recordId,fields:[]}); map.get(change.recordId).fields.push(fieldLabel(change.field)); } return [...map.values()]; }
function conflictCard(conflict,state){ const guest=state.workspace.records[conflict.recordId]||state.branch.workingSnapshot.records[conflict.recordId]; const human=conflict.resolution?.choice==="human",agent=conflict.resolution?.choice==="agent"; return `<article class="conflict-card ${conflict.resolution?"resolved":""}"><h4>${escapeHtml(guest.name)} · ${escapeHtml(fieldLabel(conflict.field))}</h4><p>${escapeHtml(conflict.explanation)}</p><div class="base">Started with: <strong>${escapeHtml(formatValue(conflict.field,conflict.baseValue,state))}</strong></div><div class="choices"><button class="choice ${human?"selected":""}" data-conflict="${conflict.id}" data-choice="human"><span>You chose</span><strong>${escapeHtml(formatValue(conflict.field,conflict.humanValue,state))}</strong></button><button class="choice ${agent?"selected":""}" data-conflict="${conflict.id}" data-choice="agent"><span>Agent proposed</span><strong>${escapeHtml(formatValue(conflict.field,conflict.agentValue,state))}</strong></button></div><p class="impact">↳ ${escapeHtml(conflict.consequence)}</p></article>`; }
function fieldLabel(field){ return {tableId:"Table",meal:"Meal",locked:"Placement lock",note:"Note"}[field]||field; }
function formatValue(field,value,state){ if(value===null||value===undefined||value==="") return "None"; if(field==="tableId") return state.workspace.tables[value]?.name||value; if(field==="meal") return String(value).replaceAll("_"," "); if(field==="locked") return value?"Locked":"Flexible"; return String(value); }
function relativeTime(value){ const sec=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/1000)); return sec<8?"now":sec<60?`${sec}s`:`${Math.floor(sec/60)}m`; }
function toast(title,copy){ const item=document.createElement("div"); item.className="toast"; item.innerHTML=`<strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p>`; $("#toasts").append(item); setTimeout(()=>item.remove(),5200); }
function escapeHtml(value){ const div=document.createElement("div"); div.textContent=String(value); return div.innerHTML; }
