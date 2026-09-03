# Merge Queue — Devpost submission pack

This file contains paste-ready submission copy, upload-ready asset references, and a timed demo script. Replace the single `LIVE_URL` placeholder after deployment.

## Project overview

**Project name**

Merge Queue

**Tagline**

Git-style conflict resolution for humans and agents editing the same live app.

**Thumbnail**

`assets/devpost/thumbnail.png` — 1200 × 800 PNG, 3:2 ratio.

**Built with**

WebMCP, JavaScript, HTML5, CSS3, JSON Schema, LocalStorage

**Try it out**

- Live app: `LIVE_URL`
- Source: https://github.com/krish-g23/MergeQueue

## Project story

### The problem

Agents are increasingly able to change the same applications people are actively using, but most integrations still behave as if the agent is the only writer. That assumption breaks the moment a person keeps working while an agent handles a larger task. A fresh human decision can be overwritten by an agent acting on an older view of the application—even when the model remembers every tool call it made.

Model history is not concurrency control. It cannot make a multi-step change atomic, detect an edit made after the agent's last read, or guarantee that two independent intentions are reconciled correctly.

### What Merge Queue does

Merge Queue is Git-style change control for a live project board. When an agent begins work, the app creates an isolated branch from the current workspace revision. The agent stages typed task updates on that branch while the human continues editing the visible board normally.

At merge time, the app compares three versions of state: the branch base, the current human workspace, and the agent proposal. Compatible changes merge automatically. If both sides changed the same field differently, Merge Queue presents one focused visual decision—for example, “You chose Maya; the agent proposed Dev.” The human resolves only those meaningful disagreements and approves the combined result as one atomic commit.

### Why this is a strong fit for WebMCP

WebMCP lets the live page expose structured capabilities to the browser agent instead of forcing it to infer application behavior from buttons and DOM text. In Merge Queue, those capabilities are not a thin automation layer: they define a collaborative protocol between two active writers.

The agent can read a revision, open a branch, stage bounded proposals, inspect the diff, preview a deterministic merge, request review, monitor the outcome, or abort safely. The page remains the authority for state, validation, and permissions. Conflict resolution and final commit are intentionally reserved for the human interface.

This is especially natural for WebMCP because the tools execute in the same page that owns the visible board and its local state. The agent and human therefore work through the same domain commands without a separate MCP server or backend synchronization layer.

### A better user experience

People no longer have to freeze the application, wait for an agent to finish, or manually inspect every proposed change. The agent can do the high-volume work while the person continues making time-sensitive decisions. In the seeded demonstration, 13 staged operations become 22 automatically compatible field changes, one identical result, and only three decisions requiring human judgment.

Human edits are never silently discarded. A merge preview is tied to an exact workspace revision, so a later edit invalidates the preview before commit. The branch can be aborted without touching main, and a completed merge can be reverted as a new revision without erasing history.

### What people and agents can now do together

An agent can reorganize an entire launch plan—prioritizing blockers, assigning owners, moving work, creating a task, and archiving stale work—while a teammate simultaneously changes the live plan. Instead of taking turns or accepting last-writer-wins, both sets of intent remain intact until the application can combine them safely.

The agent provides scale and structured reasoning. The person retains authority over ambiguity and consequences. Merge Queue turns that combination into one coherent result rather than a race between two writers.

### How we implemented WebMCP

The top-level page imperatively registers 11 narrowly scoped tools with `document.modelContext.registerTool`. Each tool has a strict JSON Schema, and the domain layer independently validates identifiers, owners, dates, priorities, labels, and supported fields.

`begin_agent_branch` snapshots the versioned workspace. Staging tools mutate only the branch working snapshot. `preview_merge` compares base, human, and agent values field by field and opens the visible review drawer. Read-only tools report state and unresolved conflicts; `request_merge` can open review but cannot commit. The final commit exists only in the human UI.

The app is a static, local-first JavaScript application with no network requests, API keys, or backend. State persists in the browser, tool registration is cleaned up through an `AbortSignal`, and the deterministic merge engine is covered by 20 automated tests.

### Challenges and lessons

The hardest part was deciding where model judgment should stop. Letting the agent resolve its own conflicts would make the demo faster, but it would defeat the product's safety model. We instead made the application responsible for deterministic reconciliation and kept consequential ambiguity with the person.

We also learned that agent-native UX needs more than an activity receipt. A receipt explains what already happened; collaborative change control preserves concurrent intent before anything lands.

### What's next

The current project board proves the interaction locally. The same model could support shared documents, design tools, no-code editors, spreadsheets, and administrative consoles. Next steps include explicit operation dependencies, multiple simultaneous agent branches, richer policy rules, and durable remote collaboration.

## Gallery order and captions

1. **The shared control desk** — “People keep working. Agents get an isolated branch. Merge Queue is a live project board built for multiple writers.”
2. **Agent intent stays visible and isolated** — “The agent staged 13 proposals from revision 1. Blue annotations show proposed destinations while the human's main workspace remains editable.”
3. **Only real disagreements come back to you** — “The three-way merge found 22 safe fields, one identical result, and three conflicts. The person decides only where intent genuinely differs.”
4. **One page, one domain model, two writers** — “Human actions and WebMCP tools share validated commands, then converge through a deterministic merge and human-approved commit.”

## Judge test prompt

> Inspect this launch board and create an agent branch. Reorganize the work for a Friday launch: prioritize blockers, assign unowned work based on workload, move completed work into Review, and archive obviously stale tasks. Stage the changes, then preview the merge. Do not commit without me.

If the judge wants the guaranteed three-conflict path, the on-page **90-second walkthrough** produces the exact state without relying on model variability.

## Demo video

**Suggested title**

Merge Queue — WebMCP conflict resolution for humans and agents

**Suggested description**

Merge Queue lets a human and browser agent edit the same live project board without last-writer-wins. Agent work is staged on a versioned branch, compatible changes merge automatically, and genuine conflicts return to the person for a deliberate commit.

Built for the WebMCP Challenge: `LIVE_URL`

### 2:15 script and shot list

| Time | Show | Voiceover |
| --- | --- | --- |
| 0:00–0:12 | Hero and board; keep “11 site tools ready” visible. | “What happens when you and an agent edit the same live app at the same time? Today, one of you usually overwrites the other. Merge Queue replaces that race with a reviewed merge.” |
| 0:12–0:27 | Briefly show the agent prompt and WebMCP tool discovery. | “The page exposes eleven structured WebMCP tools. The agent reads the live revision and opens an isolated branch—inside the application, not as a dry run.” |
| 0:27–0:45 | Start the agent plan. Pan across blue `AGENT STAGED` labels and proposed destinations. | “The agent stages thirteen coordinated changes: owners, deadlines, workflow moves, an archive, and a new task. Main is untouched, and every proposal stays visible.” |
| 0:45–1:02 | Use **Make concurrent edits**; highlight revision changing from 1 to 5 and the activity feed. | “While that work exists, I keep editing the board. I assign Maya, move the video task, change a deadline, and create a judge-check task. These are real live edits.” |
| 1:02–1:25 | Open **Preview merge**. Pause on the counts, then the three cards. | “Merge Queue compares the branch base, my current board, and the agent proposal. Twenty-two field changes are compatible. One reached the same result. Only three need me.” |
| 1:25–1:45 | Select a mixture of human and agent values. | “Instead of reviewing every operation, I resolve the actual differences: which deadline, which owner, and which workflow state. The app explains the consequence of each choice.” |
| 1:45–1:58 | Commit and show the updated branch strip/toast. | “The combined result lands atomically only after my approval. The agent never receives a commit tool.” |
| 1:58–2:08 | Revert the merge. | “If I change my mind, revert restores the exact previous board as a new revision—without erasing history.” |
| 2:08–2:15 | Return to logo/hero. | “The model may remember its calls. Merge Queue makes concurrent intent safe. Humans keep working. Agents get a branch.” |

### Recording checklist

- Record at 1440 × 900 or 1920 × 1080 with the browser zoom at 100%.
- Use ChatGPT's in-app browser or Chrome with WebMCP enabled so **11 site tools ready** is visible.
- Keep the final edit below three minutes; aim for 2:10–2:25.
- Use a screen recording with live narration, not a marketing montage.
- Add captions and verify that the public YouTube or Vimeo link embeds when logged out.
- Reset the demo immediately before recording so the opening revision is 1.

## Claims checklist

Safe to claim now:

- Versioned agent branch with isolated working state
- Concurrent human edits on main
- Deterministic semantic three-way merge
- Visual human-only conflict resolution
- Stale-preview invalidation
- Atomic commit, abort, and revert-as-new-revision
- 11 imperative WebMCP tools with narrow schemas
- 20 passing automated tests
- Static, local-first app with no backend or API key

Do not claim without further implementation:

- Dynamic registration of `revert_last_merge` after commit
- Cross-operation dependency invalidation
- Multiple simultaneous agent branches
- Remote multi-user synchronization

