# Merge Queue

**Humans keep working. Agents get a branch.**

Merge Queue is a local-first project board for the WebMCP Challenge. It replaces last-writer-wins with semantic three-way merging when a person and an agent edit the same live application.

An agent reads the board, opens an isolated branch, and stages typed changes through top-level WebMCP tools. The person keeps editing the main board normally. Merge Queue compares the branch base, current human state, and agent proposal field by field. Compatible work merges automatically; genuine disagreements become focused decisions in the visible interface.

## Three demo sites

The repository now proves the same merge primitive across three distinct domains:

| Demo | Route | Conflicts surfaced |
| --- | --- | --- |
| Launch command center | `/` | Owner, deadline, and workflow status |
| Wedding seating planner | `/examples/wedding/` | Table assignment and meal requirements |
| Shopify-style merchant catalog | `/examples/shopify/` | Price, inventory, and publication status |

Each route is independently usable, persists its own state, registers a domain-specific top-level WebMCP catalog, and includes a deterministic three-step walkthrough. The commerce example is a fictional merchant interface, not an integration with or endorsement by Shopify.

## Run locally

No package installation or build step is required.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

For a 16:9 recording layout, open `http://localhost:4173/?present=1`. Presentation mode keeps the prompt, WebMCP receipt, branch/base revisions, and live board in the same frame without changing product behavior.

For site-tool discovery, open the page in the latest ChatGPT desktop app with a supported model. Choose **Site tools** in the browser address bar; if the API is disabled, turn on **Enable site tools** in Settings → Browser → Permissions. The **Site tools** button inside Merge Queue reports the live connection, retries registration, lists the tool catalog, and runs an on-page read check. The regular interface and deterministic demo still work without WebMCP.

## Judge demo

The on-page guided flow is deterministic and explicitly labeled `GUIDED`:

1. **Run guided branch** — opens a branch and stages 13 bounded proposals.
2. **Apply human edits** — applies four human changes to the live board.
3. **Preview merge** — automatically combines compatible edits and surfaces exactly three conflicts.

Resolve the three conflicts and commit. The resulting merge is atomic and can be reverted as a new revision.

The board also supports task search, drag-to-move, keyboard editing, a prominent **New task** action, explicit save feedback, and a recoverable archive view. State is stored in the browser, so a refresh preserves both the live workspace and any open agent branch. Same-origin tabs in one browser profile synchronize automatically and identify incoming updates in the board header; there is intentionally no server-backed cross-device sync. When an agent branch is open, live cards and agent-only destination cards are labeled separately so a successful human update cannot look stale.

Suggested agent prompt:

> Inspect this launch board and create an agent branch. Reorganize the work for a Friday launch: prioritize blockers, assign unowned work based on workload, move completed work into Review, and archive obviously stale tasks. Stage the changes, then preview the merge. Do not commit without me.

Calls made by ChatGPT are shown in the page as `LIVE` receipts. The guided fallback uses the same state transitions but remains labeled `GUIDED`, so a screen recording cannot confuse the rehearsal with an external agent call.

### Wedding seating demo

The reception planner visualizes the live floor plan and the agent's proposed destinations at the same time. Guests remain draggable and editable while the branch is open. The walkthrough creates two table-placement conflicts and one catering conflict, while compatible moves, notes, and seat locks merge automatically.

Suggested agent prompt:

> Inspect the wedding floor plan, open a seating branch, and rebalance the room for conversation and traffic flow. Keep locked guests in place, account for meal requirements, stage your proposed guest updates, and preview the merge. Leave the final seating decision to me.

### Merchant catalog demo

The fictional storefront demonstrates the same primitive across price, compare-at price, inventory, collection, featured placement, publication status, and protected-price fields. The walkthrough produces one conflict each for price, stock, and publication status; independent merchandising work remains safe.

Suggested agent prompt:

> Inspect the North Star Goods catalog, open a merchandising branch, and prepare a weekend collection. Stage bounded changes to pricing, inventory, collections, featured placement, and publication status, then preview the merge. Respect protected prices and do not publish without merchant review.

## WebMCP tools

| Tool | Purpose |
| --- | --- |
| `get_workspace_summary` | Read the live revision, people, tasks, branch, and valid next actions. |
| `begin_agent_branch` | Snapshot the live workspace and open an isolated proposal branch. |
| `stage_task_updates` | Stage up to 12 bounded task updates without touching main. |
| `stage_new_task` | Stage a new task on the branch. |
| `get_branch_diff` | Inspect agent operations and concurrent human changes. |
| `preview_merge` | Run the deterministic three-way merge and open review. |
| `get_merge_conflicts` | Read unresolved conflicts without deciding them. |
| `request_merge` | Ask the human to review; never commits autonomously. |
| `get_branch_status` | Observe whether the branch is open, conflicted, merged, or aborted. |
| `abort_branch` | Discard staged work without touching main. |
| `revert_last_merge` | Restore the pre-merge board as a new revision after an explicit request. |

The wedding route exposes the equivalent domain vocabulary through `get_seating_plan`, `begin_seating_branch`, `stage_guest_changes`, `preview_seating_merge`, `get_seating_conflicts`, `request_seating_merge`, `get_seating_branch_status`, `abort_seating_branch`, and `revert_seating_merge`.

The merchant route exposes `get_catalog`, `begin_merchandising_branch`, `stage_product_changes`, `preview_catalog_merge`, `get_catalog_conflicts`, `request_catalog_merge`, `get_merchandising_branch_status`, `abort_merchandising_branch`, and `revert_catalog_merge`.

All tools are registered imperatively with `document.modelContext.registerTool` on the top-level page. Registration briefly waits for late browser injection, uses abortable lifecycle cleanup, and reports partial registration in the interface. Inputs use narrow JSON Schemas, while the domain layer independently validates the same boundaries. Tool handlers call the same deterministic commands used by the human interface.

## Merge semantics

For each field, Merge Queue compares:

- `B`: value when the branch began
- `H`: current human value
- `A`: agent-proposed value

| Condition | Result |
| --- | --- |
| `A = B` | Agent left it alone; keep the human value. |
| `H = B` | Human left it alone; apply the agent value. |
| `H = A` | Both chose the same result; deduplicate it. |
| All differ | Ask the human to resolve the conflict. |

The merge is previewed against a specific workspace revision. Any human change after preview invalidates it, preventing a stale commit.

Whole-task creation and deletion follow the same three-way rules. Archive-versus-edit is intentionally treated as a semantic conflict: hiding a task while the other side is actively changing it always comes back to the human.

## Tests

The merge engine uses only standard JavaScript and Node's built-in test runner:

```bash
node --test tests/*.test.mjs
```

The suite covers the merge matrix, independent and conflicting changes, human- and agent-created tasks, whole-task deletion, archive-versus-edit races, command validation, position normalization, resolution enforcement, atomic commit, idempotency, revert, and the public WebMCP catalog.

## Architecture

```text
Human UI ───────────────┐
                       ├──> shared domain commands ──> versioned local store
WebMCP tool handlers ──┘                  │
                                          ├── live human workspace
                                          └── isolated agent branch
                                                    │
                                  deterministic three-way merge
                                                    │
                                      visible human resolution
                                                    │
                                             atomic commit
```

## Safety properties

- Agent proposals never mutate the live board.
- Conflicts can only be resolved in the human interface.
- `request_merge` opens review but does not commit.
- A stale preview cannot commit.
- Branch commits are atomic.
- Abort leaves the live workspace unchanged.
- Revert restores an exact snapshot as a new revision.
- Archived tasks remain recoverable from the visible archive view.
- Invalid owners, dates, priorities, identifiers, labels, and unsupported fields are rejected by the domain layer.
- The application makes no network requests and needs no API key.

## Deployment

This repository is a static site. Deploy its root directory to Cloudflare Pages, Netlify, Vercel, GitHub Pages, or any static host. No environment variables are required.

## License

MIT
