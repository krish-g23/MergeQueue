# Merge Queue — final Remotion direction

Build a 120-second, 1920 × 1080, 30 fps product story for Merge Queue. Use the implemented composition **MergeQueueDemo** and the canonical timing in **remotion-script.json**.

## Creative principle

Tell one specific story rather than presenting a feature reel:

> Maya is preparing a Friday launch. She asks an agent to reorganize the board, continues editing main, and creates a real concurrent-state collision. Merge Queue preserves both intentions, automates twenty-three compatible outcomes, returns three decisions to Maya, and commits one reviewed result.

## Visual system

- Warm paper, dark ink, agent blue, conflict orange, and safe green.
- Editorial control-desk composition with strict rules and large typography.
- Real product screenshots for the WebMCP, branch, and merge states.
- Native Remotion layers for revisions, field edits, decisions, routes, and commit state.
- Hard cuts and short opacity changes; no ornamental transitions.
- Captions remain inside the lower safe area and never cover decision controls.

## Timeline

1. **0:00–0:07 · Result:** 26 changes, three decisions, zero lost work.
2. **0:07–0:20 · Maya:** Thursday afternoon, one Friday launch, work cannot stop.
3. **0:20–0:34 · Collision:** the agent remains on base R1 while Maya advances main to R5.
4. **0:34–0:45 · Danger:** model history cannot reconcile Maya versus Dev.
5. **0:45–0:55 · Intervention:** introduce Merge Queue.
6. **0:55–1:35 · Proof:** live tools, isolated branch, human edits, 22 / 1 / 3 reveal, decisions, commit.
7. **1:35–1:45 · Control:** agents may stage but cannot resolve or commit.
8. **1:45–1:54 · WebMCP:** structured tools, versioned state, visible operations, narrow permissions.
9. **1:54–2:00 · Belief:** agent speed, human judgment.

## Implementation constraints

- Use one Remotion Sequence per scene.
- Drive all motion from useCurrentFrame() and interpolate().
- Keep the composition exactly 3,600 frames.
- Use staticFile() for all local media.
- Mix the original ambient bed below narration and use restrained interaction sounds.
- Render H.264 video with AAC audio.

## Accuracy constraints

The video may claim eleven imperative WebMCP tools, thirteen staged operations, twenty-two safe fields, one same result, three conflicts, isolated versioned state, stale-preview protection, human-only resolution and commit, and revert-as-new-revision.

Do not claim cross-operation dependency invalidation, multiple simultaneous agent branches, remote multi-user synchronization, or dynamic registration of the revert tool.
