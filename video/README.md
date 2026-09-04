# Merge Queue video

The production-ready Remotion composition lives in **video/remotion/**.

## Commands

- **npm run video:studio** — open the composition editor
- **npm run video:still** — render the merge-reveal checkpoint
- **npm run video:render** — render the final 1080p MP4
- **npm run video:voiceover** — regenerate narration using the **ELEVENLABS_API_KEY** environment variable

## Main files

- **STORY_SCRIPT.md** — canonical narrative and delivery direction
- **remotion-script.json** — exact scene timing and voiceover
- **captions.json** — timed Remotion Caption data
- **remotion/MergeQueueVideo.jsx** — master composition
- **remotion/scenes/** — independently previewable scenes
- **output/merge-queue-demo.mp4** — final rendered deliverable

The ElevenLabs key is read from the process environment and is never written to the repository.
