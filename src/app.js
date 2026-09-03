import { clone, deepEqual } from "./merge.js";
import { createStore, STATUSES } from "./store.js";
import { registerWebMCPTools } from "./webmcp.js";

const store = createStore();
const $ = (selector) => document.querySelector(selector);
const elements = {
  appShell: $("#app-shell"),
  board: $("#board"),
  boardTitle: $("#board-title"),
  boardMetrics: $("#board-metrics"),
  boardEmpty: $("#board-empty"),
  taskSearch: $("#task-search"),
  searchClear: $("#search-clear"),
  emptyClearSearch: $("#empty-clear-search"),
  archivedToggle: $("#archived-toggle"),
  archivedCount: $("#archived-count"),
  revision: $("#revision-value"),
  branchStrip: $("#branch-strip"),
  branchLabel: $("#branch-label"),
  branchTitle: $("#branch-title"),
  branchSubtitle: $("#branch-subtitle"),
  branchAbort: $("#branch-abort"),
  branchPreview: $("#branch-preview"),
  activityList: $("#activity-list"),
  activityCount: $("#activity-count"),
  taskModal: $("#task-modal"),
  taskForm: $("#task-form"),
  taskArchive: $("#task-archive"),
  taskTitleError: $("#task-title-error"),
  confirmModal: $("#confirm-modal"),
  confirmTitle: $("#confirm-title"),
  confirmDescription: $("#confirm-description"),
  confirmCancel: $("#confirm-cancel"),
  confirmAction: $("#confirm-action"),
  mergeOverlay: $("#merge-overlay"),
  mergeStats: $("#merge-stats"),
  safeList: $("#safe-list"),
  safeCount: $("#safe-count"),
  conflictList: $("#conflict-list"),
  conflictCount: $("#conflict-count"),
  conflictSection: $("#conflict-section"),
  commitButton: $("#commit-button"),
  mergeReadiness: $("#merge-readiness"),
  mergeRevisionNote: $("#merge-revision-note"),
  connectionPill: $("#connection-pill"),
  connectionLabel: $("#connection-label"),
  demoProgress: $("#demo-progress"),
  demoTitle: $("#demo-title"),
  demoDescription: $("#demo-description"),
  demoPrimary: $("#demo-primary"),
  toastRegion: $("#toast-region"),
};

let webMCPStatus = { supported: null, registered: 0 };
const initialParams = new URLSearchParams(window.location.search);
let boardView = {
  query: (initialParams.get("q") || "").trim().toLocaleLowerCase(),
  archived: initialParams.get("view") === "archived",
};
let lastDialogTrigger = null;
let pendingConfirmation = null;
let searchComposing = false;

elements.taskSearch.value = initialParams.get("q") || "";

store.subscribe(render);
render(store.getState());
setupEvents();
populateSelects();
registerWebMCPTools(store, (status) => {
  webMCPStatus = status;
  renderConnection();
});

function render(state) {
  elements.revision.textContent = state.workspace.revision;
  renderBoard(state);
  renderBranch(state);
  renderActivity(state);
  renderDemo(state);
  if (!elements.mergeOverlay.classList.contains("hidden")) {
    if (state.branch?.preview) renderMerge(state);
    else closeMerge(false);
  }
  renderConnection();
}

function renderConnection() {
  const supported = webMCPStatus.supported;
  if (supported === null) {
    elements.connectionPill.classList.remove("is-connected", "is-partial");
    elements.connectionLabel.textContent = "Checking site tools…";
    return;
  }
  elements.connectionPill.classList.toggle("is-connected", supported);
  elements.connectionPill.classList.toggle("is-partial", Boolean(supported && webMCPStatus.total && webMCPStatus.registered < webMCPStatus.total));
  elements.connectionLabel.textContent = supported
    ? `${webMCPStatus.registered}${webMCPStatus.total && webMCPStatus.registered < webMCPStatus.total ? ` of ${webMCPStatus.total}` : ""} site tools ready`
    : "Demo mode · site tools unavailable";
}

function renderBoard(state) {
  elements.board.replaceChildren();
  const activeTasks = Object.values(state.workspace.tasks).filter((task) => !task.archived);
  const archivedTasks = Object.values(state.workspace.tasks).filter((task) => task.archived);
  const today = new Date().toISOString().slice(0, 10);
  elements.boardTitle.textContent = boardView.archived ? "Archived tasks" : "Shipping board";
  elements.archivedCount.textContent = archivedTasks.length;
  elements.archivedToggle.setAttribute("aria-pressed", String(boardView.archived));
  elements.archivedToggle.classList.toggle("is-active", boardView.archived);
  elements.searchClear.classList.toggle("hidden", !elements.taskSearch.value);
  elements.emptyClearSearch.classList.toggle("hidden", !boardView.query);
  elements.boardMetrics.replaceChildren(
    metric(activeTasks.length, "active"),
    metric(activeTasks.filter((task) => task.priority === "critical").length, "critical"),
    metric(activeTasks.filter((task) => !task.ownerId).length, "unassigned"),
    metric(activeTasks.filter((task) => task.dueDate && task.dueDate < today && task.status !== "done").length, "overdue"),
  );

  if (boardView.archived) {
    elements.board.classList.add("is-archive-view");
    const matches = archivedTasks.filter(matchesBoardQuery).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (matches.length) {
      const column = document.createElement("section");
      column.className = "board-column archived-column";
      const heading = makeElement("div", "column-heading");
      const headingCopy = makeElement("div");
      headingCopy.append(
        makeElement("h3", "", "Out of the active workflow"),
        makeElement("p", "", "Open a card to restore it."),
      );
      heading.append(headingCopy, makeElement("span", "", String(matches.length)));
      const cards = makeElement("div", "column-cards");
      column.append(heading, cards);
      for (const task of matches) cards.append(renderTaskCard(task, state));
      elements.board.append(column);
    }
    elements.boardEmpty.classList.toggle("hidden", matches.length > 0);
    return;
  }

  elements.board.classList.remove("is-archive-view");
  let visibleCount = 0;
  for (const status of STATUSES) {
    const tasks = Object.values(state.workspace.tasks)
      .filter((task) => !task.archived && task.status === status.id)
      .filter(matchesBoardQuery)
      .sort((a, b) => a.position - b.position);
    const proposedHere = proposedTasksForStatus(state, status.id).filter(matchesBoardQuery);
    const proposedToRender = proposedHere.filter((proposal) => {
      const live = state.workspace.tasks[proposal.id];
      return !live || live.status !== proposal.status;
    });
    visibleCount += tasks.length + proposedToRender.length;
    const column = document.createElement("section");
    column.className = "board-column";
    column.dataset.status = status.id;
    const heading = makeElement("div", "column-heading");
    heading.append(makeElement("h3", "", status.label), makeElement("span", "", String(tasks.length)));
    const cards = makeElement("div", "column-cards");
    cards.dataset.dropStatus = status.id;
    const addTask = makeElement("button", "add-task-button", "+ Add task");
    addTask.type = "button";
    addTask.dataset.addStatus = status.id;
    column.append(heading, cards, addTask);
    for (const task of tasks) cards.append(renderTaskCard(task, state));
    for (const proposal of proposedToRender) {
      cards.append(renderTaskCard(proposal, state, true));
    }
    elements.board.append(column);
  }
  elements.boardEmpty.classList.toggle("hidden", visibleCount > 0);
}

function renderTaskCard(task, state, forceProposal = false) {
  const card = $("#card-template").content.firstElementChild.cloneNode(true);
  const working = state.branch && !["merged", "aborted"].includes(state.branch.status) ? state.branch.workingSnapshot.tasks[task.id] : null;
  const live = state.workspace.tasks[task.id];
  const hasProposal = working && live && !deepEqual(pickMergeFields(working), pickMergeFields(live));
  const isProposal = forceProposal;
  const display = isProposal ? working || task : task;
  const person = state.workspace.people[display.ownerId];
  card.dataset.taskId = task.id;
  card.draggable = !display.archived && !isProposal;
  card.setAttribute("aria-label", `${display.title}. ${display.priority} priority. ${statusLabel(display.status)}.${isProposal ? " Agent-proposed destination." : " Open task details."}`);
  if (isProposal) {
    card.removeAttribute("role");
    card.removeAttribute("tabindex");
  }
  card.classList.toggle("is-proposal", Boolean(isProposal));
  card.classList.toggle("has-proposal", Boolean(hasProposal && !isProposal));
  card.classList.toggle("is-critical", display.priority === "critical");
  card.classList.toggle("is-archived", Boolean(display.archived));
  card.querySelector("h3").textContent = display.title;
  card.querySelector(".task-description").textContent = display.description;
  const priority = card.querySelector(".priority-chip");
  priority.textContent = display.priority;
  priority.dataset.priority = display.priority;
  const avatar = card.querySelector(".avatar");
  avatar.textContent = person?.initials || "—";
  avatar.title = person?.name || "Unassigned";
  avatar.classList.toggle("is-unassigned", !person);
  if (person) avatar.style.setProperty("--avatar-color", person.color);
  const due = card.querySelector(".due-date");
  due.textContent = display.dueDate ? formatDate(display.dueDate) : "No date";
  due.classList.toggle("is-overdue", Boolean(display.dueDate && display.dueDate < new Date().toISOString().slice(0, 10) && display.status !== "done"));
  if (isProposal || hasProposal) {
    card.querySelector(".proposal-chip").classList.remove("hidden");
    card.querySelector(".proposal-chip").textContent = isProposal ? "Proposed destination" : "Agent staged";
    const diff = card.querySelector(".proposal-diff");
    diff.classList.remove("hidden");
    diff.textContent = proposalSummary(live, working);
  }
  return card;
}

function renderBranch(state) {
  const branch = state.branch;
  const active = branch && !["merged", "aborted"].includes(branch.status);
  elements.branchStrip.className = `branch-strip ${active ? "is-active" : branch?.status === "merged" ? "is-merged" : "is-idle"}`;
  elements.branchAbort.classList.toggle("hidden", !active);
  elements.branchPreview.classList.toggle("hidden", !active || branch.operations.length === 0);
  if (!branch || branch.status === "aborted") {
    elements.branchLabel.textContent = "Main workspace";
    elements.branchTitle.textContent = branch?.status === "aborted" ? "Agent branch aborted" : "No agent branch is open";
    elements.branchSubtitle.textContent = "Human changes apply directly to the board.";
  } else if (branch.status === "merged") {
    elements.branchLabel.textContent = "Merged safely";
    elements.branchTitle.textContent = branch.intent;
    elements.branchSubtitle.textContent = `${branch.operations.length} staged operations committed with human review.`;
  } else {
    elements.branchLabel.textContent = `Agent branch · base r${branch.baseRevision}`;
    elements.branchTitle.textContent = branch.intent;
    elements.branchSubtitle.textContent = `${branch.operations.length} staged operation${branch.operations.length === 1 ? "" : "s"} · your live edits remain on main`;
  }
}

function renderActivity(state) {
  elements.activityList.replaceChildren();
  elements.activityCount.textContent = state.activity.length;
  for (const entry of state.activity.slice(0, 18)) {
    const item = document.createElement("li");
    item.className = `activity-item actor-${entry.actor}`;
    const marker = makeElement("span", "activity-marker");
    marker.setAttribute("aria-hidden", "true");
    const copy = makeElement("div");
    copy.append(
      makeElement("span", "activity-time", relativeTime(entry.at)),
      makeElement("strong", "", entry.title),
    );
    if (entry.detail) copy.append(makeElement("p", "", entry.detail));
    item.append(marker, copy);
    elements.activityList.append(item);
  }
}

function renderDemo(state) {
  const branch = state.branch;
  const humanDemoDone = state.workspace.tasks.security?.ownerId === "maya" && state.workspace.tasks.video?.status === "in_progress";
  if (!branch || branch.status === "aborted") {
    elements.demoProgress.textContent = "Step 1 of 3";
    elements.demoTitle.textContent = "Start the agent’s launch plan";
    elements.demoDescription.textContent = "Creates a private branch and stages a deterministic set of launch-board changes.";
    elements.demoPrimary.textContent = "Start agent plan";
    elements.demoPrimary.dataset.action = "start-agent";
  } else if (!["merged"].includes(branch.status) && !humanDemoDone) {
    elements.demoProgress.textContent = "Step 2 of 3";
    elements.demoTitle.textContent = "Keep working while the agent stages";
    elements.demoDescription.textContent = "Simulate four live human edits, including three that intentionally overlap with the agent’s proposal.";
    elements.demoPrimary.textContent = "Make concurrent edits";
    elements.demoPrimary.dataset.action = "human-edits";
  } else if (!["merged"].includes(branch.status)) {
    elements.demoProgress.textContent = "Step 3 of 3";
    elements.demoTitle.textContent = branch.preview ? "Resolve the genuine disagreements" : "Compare both sets of intent";
    elements.demoDescription.textContent = branch.preview
      ? "Choose the human or agent value for each conflict, then commit the combined result."
      : "The merge engine will preserve compatible work and surface only genuine conflicts.";
    elements.demoPrimary.textContent = branch.preview ? "Review merge" : "Preview merge";
    elements.demoPrimary.dataset.action = "preview";
  } else {
    elements.demoProgress.textContent = "Complete";
    elements.demoTitle.textContent = "Both sides landed safely";
    elements.demoDescription.textContent = "The merge committed as one revision. Revert is available without erasing history.";
    elements.demoPrimary.textContent = state.lastCommit?.reverted ? "Reset demo" : "Revert merge";
    elements.demoPrimary.dataset.action = state.lastCommit?.reverted ? "reset" : "revert";
  }
}

function renderMerge(state) {
  const preview = state.branch.preview;
  if (!preview) return;
  elements.mergeStats.replaceChildren(
    stat(preview.stats.safe, "Safe fields", "safe"),
    stat(preview.stats.same, "Same result", "same"),
    stat(preview.stats.conflicts, "Your calls", "conflict"),
  );
  elements.safeCount.textContent = `${preview.stats.safe} automatically compatible`;
  elements.safeList.replaceChildren();
  const safeGroups = groupChanges(preview.safeChanges, state);
  if (!safeGroups.length) {
    const empty = document.createElement("p");
    empty.className = "safe-more";
    empty.textContent = "No agent-only fields to apply in this preview.";
    elements.safeList.append(empty);
  }
  for (const group of safeGroups.slice(0, 8)) {
    const item = document.createElement("div");
    item.className = "safe-item";
    const copy = makeElement("div");
    copy.append(
      makeElement("strong", "", group.title),
      makeElement("p", "", group.fields.join(" · ")),
    );
    item.append(makeElement("span", "safe-check", "✓"), copy);
    elements.safeList.append(item);
  }
  if (safeGroups.length > 8) {
    const more = document.createElement("p");
    more.className = "safe-more";
    more.textContent = `+ ${safeGroups.length - 8} more compatible tasks`;
    elements.safeList.append(more);
  }

  elements.conflictList.replaceChildren();
  elements.conflictCount.textContent = `${preview.stats.conflicts} decision${preview.stats.conflicts === 1 ? "" : "s"}`;
  elements.conflictSection.classList.toggle("hidden", preview.conflicts.length === 0);
  for (const conflict of preview.conflicts) elements.conflictList.append(renderConflict(conflict, state));

  const remaining = preview.conflicts.filter((item) => !item.resolution).length;
  elements.commitButton.disabled = remaining > 0;
  elements.mergeReadiness.textContent = remaining ? `${remaining} decision${remaining === 1 ? "" : "s"} left` : "Ready for your approval";
  elements.mergeRevisionNote.textContent = `Previewed against workspace revision ${preview.workspaceRevision}.`;
}

function renderConflict(conflict, state) {
  const item = document.createElement("article");
  item.className = `conflict-card ${conflict.resolution ? "is-resolved" : ""}`;
  const task = state.workspace.tasks[conflict.taskId] || state.branch.workingSnapshot.tasks[conflict.taskId];
  const field = fieldLabel(conflict.field);
  const humanSelected = conflict.resolution?.choice === "human";
  const agentSelected = conflict.resolution?.choice === "agent";
  const heading = makeElement("div", "conflict-heading");
  const headingCopy = makeElement("div");
  headingCopy.append(makeElement("span", "", field), makeElement("h4", "", task?.title || conflict.taskId));
  heading.append(headingCopy, makeElement("span", "conflict-type", conflict.kind.replaceAll("_", " ")));

  const base = makeElement("div", "base-value");
  base.append(
    makeElement("span", "", "Branch started with"),
    makeElement("strong", "", formatValue(conflict.field, conflict.baseValue, state)),
  );

  const choices = makeElement("div", "choice-grid");
  const humanChoice = conflictChoice("human", "You chose", formatValue(conflict.field, conflict.humanValue, state), conflict.id, humanSelected);
  const agentChoice = conflictChoice("agent", "Agent proposed", formatValue(conflict.field, conflict.agentValue, state), conflict.id, agentSelected);
  choices.append(humanChoice, agentChoice);

  const consequence = makeElement("p", "consequence");
  consequence.append(makeElement("span", "", "↳"), document.createTextNode(conflict.consequences[0]));
  item.append(heading, base, choices, consequence);
  return item;
}

function conflictChoice(choice, label, value, conflictId, selected) {
  const button = makeElement("button", `choice-button ${choice}-choice${selected ? " is-selected" : ""}`);
  button.type = "button";
  button.dataset.conflict = conflictId;
  button.dataset.choice = choice;
  button.setAttribute("aria-pressed", String(selected));
  button.append(makeElement("span", "", label), makeElement("strong", "", value));
  return button;
}

function setupEvents() {
  $("#reset-button").addEventListener("click", requestDemoReset);
  elements.demoPrimary.addEventListener("click", () => {
    const action = elements.demoPrimary.dataset.action;
    try {
      if (action === "start-agent") runDemoAgent();
      if (action === "human-edits") runDemoHumanEdits();
      if (action === "preview") openPreview();
      if (action === "revert") {
        store.revertLastMerge();
        toast("Merge reverted", "The previous board was restored as a new revision.");
      }
      if (action === "reset") requestDemoReset();
    } catch (error) {
      toast("Could not continue", error.message, "error");
    }
  });
  elements.branchPreview.addEventListener("click", openPreview);
  elements.branchAbort.addEventListener("click", () => {
    openConfirmation({
      title: "Abort this agent branch?",
      description: "The staged agent proposals will be discarded. Your live workspace stays unchanged.",
      actionLabel: "Abort branch",
      onConfirm: () => {
        store.abortBranch();
        toast("Branch aborted", "The live workspace was not changed.");
      },
    });
  });
  elements.board.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-status]");
    if (add) return openTaskEditor(null, add.dataset.addStatus);
    const card = event.target.closest(".task-card");
    if (card && !card.classList.contains("is-proposal")) openTaskEditor(card.dataset.taskId);
  });
  elements.board.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const card = event.target.closest(".task-card");
    if (!card || card.classList.contains("is-proposal")) return;
    event.preventDefault();
    openTaskEditor(card.dataset.taskId);
  });
  elements.board.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".task-card");
    if (!card || card.classList.contains("is-proposal")) return event.preventDefault();
    event.dataTransfer.setData("text/task-id", card.dataset.taskId);
    card.classList.add("is-dragging");
  });
  elements.board.addEventListener("dragend", (event) => {
    event.target.closest(".task-card")?.classList.remove("is-dragging");
    elements.board.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
  });
  elements.board.addEventListener("dragover", (event) => {
    const zone = event.target.closest("[data-drop-status]");
    if (!zone) return;
    event.preventDefault();
    elements.board.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    zone.classList.add("is-drop-target");
  });
  elements.board.addEventListener("dragleave", (event) => {
    const zone = event.target.closest("[data-drop-status]");
    if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove("is-drop-target");
  });
  elements.board.addEventListener("drop", (event) => {
    const zone = event.target.closest("[data-drop-status]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove("is-drop-target");
    const taskId = event.dataTransfer.getData("text/task-id");
    if (taskId) store.updateWorkspaceTask(taskId, { status: zone.dataset.dropStatus }, "human");
  });
  elements.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = readTaskForm();
    if (!input.patch.title) {
      setTaskTitleError("Enter a task title before saving.");
      $("#task-title").focus();
      return;
    }
    try {
      if (input.id) store.updateWorkspaceTask(input.id, input.patch, "human");
      else store.createWorkspaceTask(input.patch, "human");
      closeModal(elements.taskModal);
    } catch (error) {
      if (error.message.startsWith("Title")) {
        setTaskTitleError(error.message);
        $("#task-title").focus();
      } else {
        toast("Task not saved", error.message, "error");
      }
    }
  });
  $("#task-title").addEventListener("input", () => setTaskTitleError(""));
  elements.taskArchive.addEventListener("click", () => {
    const taskId = $("#task-id").value;
    const task = store.getState().workspace.tasks[taskId];
    if (!task) return;
    const willArchive = !task.archived;
    store.updateWorkspaceTask(taskId, { archived: willArchive }, "human");
    closeModal(elements.taskModal);
    toast(
      willArchive ? "Task archived" : "Task restored",
      willArchive ? "It is hidden from the active board and remains recoverable." : "The task is back on the active board.",
      "success",
      willArchive ? "Undo" : undefined,
      willArchive ? () => store.updateWorkspaceTask(taskId, { archived: false }, "human") : undefined,
    );
  });
  elements.taskSearch.addEventListener("compositionstart", () => { searchComposing = true; });
  elements.taskSearch.addEventListener("compositionend", () => {
    searchComposing = false;
    applyTaskSearch();
  });
  elements.taskSearch.addEventListener("input", () => {
    elements.searchClear.classList.toggle("hidden", !elements.taskSearch.value);
    if (!searchComposing) applyTaskSearch();
  });
  elements.searchClear.addEventListener("click", clearTaskSearch);
  elements.emptyClearSearch.addEventListener("click", clearTaskSearch);
  elements.archivedToggle.addEventListener("click", () => {
    boardView.archived = !boardView.archived;
    syncBoardUrl();
    renderBoard(store.getState());
  });
  document.addEventListener("click", (event) => {
    const close = event.target.closest("[data-close-modal]");
    if (close) closeModal(document.getElementById(close.dataset.closeModal));
  });
  $("#merge-close").addEventListener("click", closeMerge);
  $("#merge-scrim").addEventListener("click", closeMerge);
  elements.confirmCancel.addEventListener("click", closeConfirmation);
  elements.confirmModal.addEventListener("click", (event) => {
    if (event.target === elements.confirmModal) closeConfirmation();
  });
  elements.confirmAction.addEventListener("click", () => {
    const action = pendingConfirmation;
    closeConfirmation();
    action?.();
  });
  elements.conflictList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-conflict]");
    if (!button) return;
    store.resolveConflict(button.dataset.conflict, button.dataset.choice);
  });
  elements.commitButton.addEventListener("click", () => {
    try {
      const commit = store.commitMerge();
      closeMerge();
      toast("Merge committed", `${commit.operationCount} staged operations landed safely.`, "success", "Revert", () => store.revertLastMerge());
    } catch (error) {
      toast("Merge not committed", error.message, "error");
    }
  });
  window.addEventListener("mergequeue:open-preview", () => {
    if (store.getState().branch?.preview) showMerge();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") trapDialogFocus(event);
    if (event.key === "Escape") {
      if (!elements.confirmModal.classList.contains("hidden")) closeConfirmation();
      else if (!elements.mergeOverlay.classList.contains("hidden")) closeMerge();
      else if (!elements.taskModal.classList.contains("hidden")) closeModal(elements.taskModal);
    }
  });
}

function requestDemoReset() {
  openConfirmation({
    title: "Reset the demo board?",
    description: "This discards the current branch, live edits, and merge history, then restores the deterministic launch board.",
    actionLabel: "Reset demo",
    onConfirm: () => {
      store.reset();
      closeMerge(false);
      toast("Demo reset", "The deterministic launch board is ready.");
    },
  });
}

function applyTaskSearch() {
  boardView.query = elements.taskSearch.value.trim().toLocaleLowerCase();
  syncBoardUrl();
  renderBoard(store.getState());
}

function clearTaskSearch() {
  elements.taskSearch.value = "";
  boardView.query = "";
  syncBoardUrl();
  renderBoard(store.getState());
  elements.taskSearch.focus();
}

function syncBoardUrl() {
  const url = new URL(window.location.href);
  const query = elements.taskSearch.value.trim();
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  if (boardView.archived) url.searchParams.set("view", "archived");
  else url.searchParams.delete("view");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function setTaskTitleError(message) {
  elements.taskTitleError.textContent = message;
  $("#task-title").setAttribute("aria-invalid", String(Boolean(message)));
}

function openConfirmation({ title, description, actionLabel, onConfirm }) {
  lastDialogTrigger = document.activeElement;
  pendingConfirmation = onConfirm;
  elements.confirmTitle.textContent = title;
  elements.confirmDescription.textContent = description;
  elements.confirmAction.textContent = actionLabel;
  elements.confirmModal.classList.remove("hidden");
  syncModalState();
  setTimeout(() => elements.confirmCancel.focus(), 0);
}

function closeConfirmation(restoreFocus = true) {
  elements.confirmModal.classList.add("hidden");
  pendingConfirmation = null;
  syncModalState();
  if (restoreFocus) restoreDialogFocus();
}

function populateSelects() {
  const statusOptions = STATUSES.map((item) => {
    const option = makeElement("option", "", item.label);
    option.value = item.id;
    return option;
  });
  $("#task-status").replaceChildren(...statusOptions);
  const people = store.getState().workspace.people;
  const unassigned = makeElement("option", "", "Unassigned");
  unassigned.value = "";
  const peopleOptions = Object.values(people).map((person) => {
    const option = makeElement("option", "", person.name);
    option.value = person.id;
    return option;
  });
  $("#task-owner").replaceChildren(unassigned, ...peopleOptions);
}

function openTaskEditor(taskId, defaultStatus = "backlog") {
  const task = taskId ? store.getState().workspace.tasks[taskId] : null;
  lastDialogTrigger = document.activeElement;
  setTaskTitleError("");
  $("#task-modal-title").textContent = task?.archived ? "Review archived task" : task ? "Edit task" : "Create task";
  $("#task-id").value = task?.id || "";
  $("#task-title").value = task?.title || "";
  $("#task-description").value = task?.description || "";
  $("#task-status").value = task?.status || defaultStatus;
  $("#task-priority").value = task?.priority || "medium";
  $("#task-owner").value = task?.ownerId || "";
  $("#task-due").value = task?.dueDate || "";
  elements.taskArchive.classList.toggle("hidden", !task);
  elements.taskArchive.textContent = task?.archived ? "Restore task" : "Archive task";
  elements.taskArchive.classList.toggle("button-restore", Boolean(task?.archived));
  elements.taskArchive.classList.toggle("button-warning", !task?.archived);
  elements.taskModal.classList.remove("hidden");
  syncModalState();
  setTimeout(() => $("#task-title").focus(), 0);
}

function readTaskForm() {
  return {
    id: $("#task-id").value,
    patch: {
      title: $("#task-title").value.trim(),
      description: $("#task-description").value.trim(),
      status: $("#task-status").value,
      priority: $("#task-priority").value,
      ownerId: $("#task-owner").value || null,
      dueDate: $("#task-due").value || null,
    },
  };
}

function runDemoAgent() {
  const branch = store.beginBranch("Reorganize the launch board around Friday’s deadline", store.getState().workspace.revision);
  store.stageTaskUpdates(branch.id, [
    { taskId: "security", patch: { ownerId: "dev", status: "in_progress" }, rationale: "Critical blocker; Dev owns implementation security." },
    { taskId: "video", patch: { status: "review" }, rationale: "Demo should be reviewed before submission." },
    { taskId: "analytics", patch: { dueDate: "2026-09-07", priority: "medium" }, rationale: "Post-launch analytics can follow the submission." },
    { taskId: "screens", patch: { status: "ready", ownerId: "noa", priority: "high" }, rationale: "Submission screenshots are launch-critical." },
    { taskId: "license", patch: { status: "in_progress", ownerId: "sam" }, rationale: "The repository must expose a valid license." },
    { taskId: "mobile", patch: { priority: "low", dueDate: "2026-09-08" }, rationale: "Desktop judge flow takes priority." },
    { taskId: "old-survey", patch: { archived: true }, rationale: "Stale work from the previous concept." },
    { taskId: "qa", patch: { status: "in_progress", ownerId: "noa", priority: "critical" }, rationale: "A deterministic demo needs repeated verification." },
    { taskId: "captions", patch: { status: "ready", ownerId: "maya" }, rationale: "Captions improve judge comprehension." },
    { taskId: "description", patch: { status: "done" }, rationale: "The four judging answers are ready." },
    { taskId: "deploy", patch: { status: "done" }, rationale: "The production URL passed the smoke check." },
    { taskId: "readme", patch: { status: "review" }, rationale: "README is ready for final inspection." },
  ]);
  store.stageNewTask(branch.id, {
    id: "submission-check",
    title: "Run final submission preflight",
    description: "Verify live URL, repository, video, license, and testing instructions.",
    status: "ready",
    priority: "critical",
    ownerId: "sam",
    dueDate: "2026-09-03",
  }, "One final gate prevents a technically complete entry from failing eligibility.");
  toast("Agent branch ready", "13 proposals are staged; your live board is untouched.");
}

function runDemoHumanEdits() {
  store.updateWorkspaceTask("security", { ownerId: "maya" }, "human");
  store.updateWorkspaceTask("video", { status: "in_progress" }, "human");
  store.updateWorkspaceTask("analytics", { dueDate: "2026-09-05" }, "human");
  store.createWorkspaceTask({
    id: "judge-url",
    title: "Verify judge testing URL",
    description: "Open the exact public URL in the supported browser.",
    status: "ready",
    priority: "critical",
    ownerId: "maya",
    dueDate: "2026-09-03",
  }, "human");
  toast("Four live edits applied", "The agent branch still contains its original intent.");
}

function openPreview() {
  const branch = store.getState().branch;
  if (!branch) throw new Error("Start an agent branch first.");
  if (!branch.preview) store.previewMerge(branch.id);
  showMerge();
}

function showMerge() {
  lastDialogTrigger = document.activeElement;
  renderMerge(store.getState());
  elements.mergeOverlay.classList.remove("hidden");
  syncModalState();
  setTimeout(() => $("#merge-close").focus(), 0);
}

function closeMerge(restoreFocus = true) {
  elements.mergeOverlay.classList.add("hidden");
  syncModalState();
  if (restoreFocus) restoreDialogFocus();
}

function closeModal(modal) {
  modal.classList.add("hidden");
  syncModalState();
  restoreDialogFocus();
}

function syncModalState() {
  const hasOpenLayer = [elements.taskModal, elements.confirmModal, elements.mergeOverlay]
    .some((layer) => !layer.classList.contains("hidden"));
  document.body.classList.toggle("modal-open", hasOpenLayer);
  elements.appShell.inert = hasOpenLayer;
}

function restoreDialogFocus() {
  if (lastDialogTrigger instanceof HTMLElement && document.contains(lastDialogTrigger)) lastDialogTrigger.focus();
  lastDialogTrigger = null;
}

function trapDialogFocus(event) {
  const container = !elements.confirmModal.classList.contains("hidden")
    ? elements.confirmModal.querySelector(".confirm-card")
    : !elements.mergeOverlay.classList.contains("hidden")
    ? elements.mergeOverlay.querySelector(".merge-drawer")
    : !elements.taskModal.classList.contains("hidden")
      ? elements.taskModal.querySelector(".modal-card")
      : null;
  if (!container) return;
  const focusable = [...container.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")]
    .filter((item) => !item.classList.contains("hidden"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function toast(title, message, tone = "default", actionLabel, action) {
  const key = `${tone}:${title}`;
  elements.toastRegion.querySelector(`[data-toast-key="${CSS.escape(key)}"]`)?.remove();
  const item = document.createElement("div");
  item.className = `toast toast-${tone}`;
  item.dataset.toastKey = key;
  item.setAttribute("role", tone === "error" ? "alert" : "status");
  const copy = makeElement("div");
  copy.append(makeElement("strong", "", title), makeElement("p", "", message));
  item.append(copy);
  const actions = document.createElement("div");
  actions.className = "toast-actions";
  if (actionLabel && action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = actionLabel;
    button.addEventListener("click", () => { action(); item.remove(); });
    actions.append(button);
  }
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.setAttribute("aria-label", `Dismiss ${title} notification`);
  dismiss.textContent = "×";
  dismiss.addEventListener("click", () => item.remove());
  actions.append(dismiss);
  item.append(actions);
  elements.toastRegion.append(item);
  setTimeout(() => item.classList.add("is-visible"), 10);
  if (tone !== "error") {
    setTimeout(() => { item.classList.remove("is-visible"); setTimeout(() => item.remove(), 220); }, 6500);
  }
}

function proposedTasksForStatus(state, status) {
  if (!state.branch || ["merged", "aborted"].includes(state.branch.status)) return [];
  return Object.values(state.branch.workingSnapshot.tasks).filter((task) => !task.archived && task.status === status);
}

function matchesBoardQuery(task) {
  if (!boardView.query) return true;
  return [task.title, task.description, task.priority, task.ownerId, statusLabel(task.status)]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase().includes(boardView.query));
}

function metric(value, label) {
  const item = makeElement("span", "metric-pill");
  item.append(makeElement("strong", "", String(value)), document.createTextNode(` ${label}`));
  return item;
}

function pickMergeFields(task) {
  if (!task) return null;
  const { title, description, status, priority, ownerId, dueDate, labels, archived } = task;
  return { title, description, status, priority, ownerId, dueDate, labels, archived };
}

function proposalSummary(live, working) {
  if (!live) return "New task";
  const changed = [];
  if (live.status !== working.status) changed.push(`${statusLabel(live.status)} → ${statusLabel(working.status)}`);
  if (live.ownerId !== working.ownerId) changed.push("owner changed");
  if (live.dueDate !== working.dueDate) changed.push("date changed");
  if (live.priority !== working.priority) changed.push(`priority → ${working.priority}`);
  if (live.archived !== working.archived) changed.push(working.archived ? "archive" : "restore");
  return changed.join(" · ") || "Details changed";
}

function groupChanges(changes, state) {
  const groups = new Map();
  for (const change of changes) {
    if (!groups.has(change.taskId)) {
      const task = state.workspace.tasks[change.taskId] || state.branch.workingSnapshot.tasks[change.taskId];
      groups.set(change.taskId, { title: task?.title || change.taskId, fields: [] });
    }
    groups.get(change.taskId).fields.push(change.field === "$task" ? (change.kind === "delete" ? "delete task" : "new task") : fieldLabel(change.field));
  }
  return [...groups.values()];
}

function stat(value, label, tone) {
  const item = makeElement("div", `merge-stat stat-${tone}`);
  item.append(makeElement("strong", "", String(value)), makeElement("span", "", label));
  return item;
}

function formatValue(field, value, state) {
  if (value === null || value === undefined || value === "") return "None";
  if (field === "ownerId") return state.workspace.people[value]?.name || value;
  if (field === "status") return statusLabel(value);
  if (field === "dueDate") return formatDate(value);
  if (field === "archived") return value ? "Archived" : "Active";
  if (field === "$task") return value?.title || "Deleted";
  if (Array.isArray(value)) return value.join(", ") || "None";
  return String(value);
}

function fieldLabel(field) {
  return { ownerId: "Owner", dueDate: "Due date", status: "Workflow status", position: "Position", archived: "Archive state", $task: "Whole task" }[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

function statusLabel(status) {
  return STATUSES.find((item) => item.id === status)?.label || status;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function relativeTime(date) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 8) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

function makeElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== "") element.textContent = text;
  return element;
}
