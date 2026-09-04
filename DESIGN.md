---
version: alpha
name: "Merge Queue"
description: "An editorial control desk for safely reconciling concurrent human and agent work."
colors:
  ink: "#1A1A1A"
  ink-soft: "#363532"
  paper: "#F5F3EE"
  surface: "#FFFFFF"
  surface-subtle: "#ECE9E2"
  line: "#CECCC5"
  muted: "#706E68"
  primary: "#1A1A1A"
  agent: "#3157D5"
  success: "#23745B"
  warning: "#B85C22"
  danger: "#A63A2A"
  focus: "#E4552F"
typography:
  display:
    fontFamily: "Avenir Next, Avenir, Helvetica Neue, sans-serif"
    lineHeight: "0.92"
  sans:
    fontFamily: "Avenir Next, Avenir, Helvetica Neue, sans-serif"
    lineHeight: "1.45"
  utility:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
    lineHeight: "1.35"
rounded:
  DEFAULT: "0.125rem"
  sm: "0.125rem"
  md: "0.25rem"
  lg: "0.5rem"
spacing:
  control: "0.75rem"
  panel: "1.25rem"
  section-gap: "1.75rem"
  page-max: "120rem"
components:
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.DEFAULT}"
    padding: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.focus}"
  button-agent:
    backgroundColor: "{colors.agent}"
    textColor: "{colors.surface}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.surface}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.surface}"
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.DEFAULT}"
    padding: "{spacing.panel}"
  card-subtle:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-soft}"
  divider:
    backgroundColor: "{colors.line}"
    height: "1px"
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    height: "44px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  drawer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  toast:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.paper}"
---

# Merge Queue Design System

## Overview

### Creative North Star

The interface adapts the Aurea Webflow template's art-directed studio language into a working change-control product: warm white canvas, near-black type, strict rules, oversized geometric headlines, flat editorial surfaces, and occasional technical annotations. It should feel like an architecture studio's project table crossed with a version-control console.

### Product context and register

- **Audience and primary job:** Builders supervising simultaneous human and agent changes who need to understand live state, staged intent, and genuine merge conflicts quickly.
- **Target market(s) and evidence:** Global English-language developer tooling; the repository and current product copy contain no market-specific behavior.
- **Locale(s) and language policy:** English UI with resilient layout for longer copy. Dates remain locale-readable while date-only storage stays UTC-neutral.
- **Usage scene:** Desktop-first, focused project work with a compact mobile inspection path. The board may be scanned repeatedly under deadline pressure.
- **Register:** Hybrid. The masthead carries expressive brand energy; the board, forms, and conflict review stay familiar and operational.
- **Memorable signature:** Oversized `MERGE / QUEUE` typography paired with a three-line merge diagram that visually resolves into one commit.
- **Restraint:** Board cards, fields, status, and conflict decisions remain flat, legible, and semantically colored. Decoration never competes with state.
- **Anti-references:** Rounded SaaS card stacks, pastel gradient dashboards, glassmorphism, pill-heavy filters, and decorative motion without state meaning.
- **Token ownership/runtime mapping:** `styles.css` is the runtime source of truth. This file mirrors its accepted semantic values and rationale. Every shared surface consumes the custom properties declared in `:root`; drift is checked by reviewing both files together and by rendered browser inspection.

## Colors

The core brand is monochrome: `ink` on `paper` or `surface`, with `line` defining structure instead of shadows. `agent` blue marks staged machine intent, `success` green marks safe/committed state, `warning` marks recoverable archive or abort actions, and `danger` is reserved for irreversible or failed outcomes. `focus` is a warm orange ring visible on both white and dark surfaces. High-contrast mode returns control to system colors.

## Typography

`display` and `sans` use Avenir Next where available, with metric-compatible fallbacks. Hero type is tightly tracked and deliberately oversized; product copy stays between 12–16px with comfortable line height. `utility` is reserved for revisions, status labels, counts, timestamps, and technical annotations. Uppercase is limited to short labels, never paragraphs or primary actions.

## Layout

The page uses a wide editorial frame capped by `page-max`. The masthead and hero follow a two-column split inspired by Aurea; the workspace switches to one column before its operational content becomes cramped. The board is a deliberate, bounded five-column dataset rendered in full and owns horizontal scrolling at narrow widths. Mobile keeps each column wide enough to scan instead of collapsing task content. Scrollable regions inherit the global visible scrollbar baseline.

Presentation mode is a named desktop variant for 16:9 recording. It compresses—but does not remove—the branded hero so the prompt, live WebMCP trace, base/main revision split, and top of the board can share one frame. The underlying board and merge behavior remain identical to the standard view.

## Elevation & Depth

Hierarchy comes from black/white tonal contrast, rules, and changes in type scale. Static panels and cards are flat. Hover may add a compact hard-edged shadow to indicate lift, while dialogs and the merge drawer use one restrained ambient shadow because they occupy a separate interaction layer. Blur is limited to modal backdrops.

## Shapes

Edges are mostly square with 2–8px radii for ergonomic controls and overlays. Pills are reserved for true compact status indicators such as the connection dot; metrics and filters use ruled rectangular geometry. Borders are one pixel, with thicker top or left strokes only to signal hierarchy or critical state.

## Components

### Foundational visual states

Every interactive control defines hover, visible focus, pressed, disabled, and selected states without layout shift. Focus uses a 2px `focus` outline with offset. Agent, success, warning, and danger states always combine color with copy, borders, or icons. Local operations complete immediately, so the application does not introduce ornamental loading skeletons.

### Buttons and actions

Primary safe actions are solid ink or inverted white on dark. Secondary actions are outline/ghost. Recoverable archive and abort actions use warning treatment; danger is reserved for failures or irreversible operations. Buttons use specific verbs, fixed minimum height, and subtle directional arrow treatment on primary actions.

### Navigation and data display

The board renders its known small dataset in full. Search and archive view state are reflected in the URL. Task cards stay rectangular and use a status line, readable title, two-line description preview, owner identity, and due date. Dragging is optional because the edit dialog's Status field provides the non-drag route.

The agent trace is an audit surface, not decoration. Calls made through WebMCP are labeled `LIVE`; deterministic button-driven rehearsal steps are labeled `GUIDED` so a recording never implies that a local fallback was an external agent call.

The shipping board is live across same-origin tabs in one browser profile. Its compact freshness line names that scope explicitly, distinguishes local saves from updates received from another tab, and falls back to an honest “This tab only” state if browser persistence is unavailable. It must never imply server-backed or cross-device synchronization. An open task editor pins the task version it loaded; if another tab changes that task, saving is blocked until the person deliberately reviews the latest version.

### Forms and overlays

Search has an app-owned clear control. The task form uses app-owned validation and disables native validation bubbles. Native select and date popups are an intentional choice: this utility accepts platform-owned popup geometry and locale behavior while owning the closed-field styling. The task dialog and merge drawer trap focus, restore focus, make background content inert, close with Escape, and stay within the viewport. Confirmations use the shared app-owned alert dialog; toasts use one live region and stable bottom-right placement.

### Iconography

Icons are simple text or CSS line marks with one- to two-pixel strokes. Ambiguous icons always retain visible text or an accessible label. Decorative merge paths are hidden from assistive technology.

### Motion

Motion communicates layer entry, card hover, or state selection. Interaction transitions run 140–240ms with ease-out timing. The initial hero has one short, staggered entrance. Reduced-motion mode removes transforms and stagger, leaving only near-instant opacity feedback.

### Content and data visualization

Voice is direct, calm, and technically precise. Copy names the actor and consequence: “Agent proposal,” “Save to main,” “Commit merge.” Counts use tabular numerals. The merge diagram is explanatory decoration only; all merge state remains available as text.

## Do's and Don'ts

- **Do:** Use strong type scale, rules, and monochrome contrast to create hierarchy before adding color or shadow.
- **Do:** Keep agent, human, safe, warning, and conflict semantics consistent across the board, drawer, activity, and toast systems.
- **Don't:** Reintroduce rounded card stacks, glass panels, pastel gradients, or a field of unrelated accent colors.
- **Don't:** Hide actions behind hover, rely on color alone, or let expressive hero styling spill into dense task controls.
