import {execFileSync} from "node:child_process";
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const spec = JSON.parse(readFileSync(resolve(root, "video/remotion-script.json"), "utf8"));
const apiKey = process.env.ELEVENLABS_API_KEY;

if (!apiKey) {
  throw new Error("Set ELEVENLABS_API_KEY before running this script.");
}

const voicesResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
  headers: {"xi-api-key": apiKey},
});

if (!voicesResponse.ok) {
  throw new Error("Unable to list ElevenLabs voices: " + voicesResponse.status + " " + (await voicesResponse.text()));
}

const voices = (await voicesResponse.json()).voices ?? [];
const preferredNames = ["Brian", "Daniel", "George", "Adam", "Rachel"];
const selected =
  voices.find((voice) => voice.voice_id === process.env.ELEVENLABS_VOICE_ID) ??
  preferredNames.map((name) => voices.find((voice) => voice.name === name)).find(Boolean) ??
  voices[0];

if (!selected) {
  throw new Error("No ElevenLabs voice is available for this account.");
}

const outputDir = resolve(root, "public/voiceover/merge-queue");
const rawDir = resolve(root, "video/output/voiceover-raw");
mkdirSync(outputDir, {recursive: true});
mkdirSync(rawDir, {recursive: true});

const durationOf = (path) =>
  Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
      {encoding: "utf8"},
    ).trim(),
  );

console.log("Using ElevenLabs voice:", selected.name, "(" + selected.voice_id + ")");

const requestedSceneId = process.argv[2];
const scenes = requestedSceneId
  ? spec.scenes.filter((scene) => scene.id === requestedSceneId)
  : spec.scenes;

if (requestedSceneId && scenes.length === 0) {
  throw new Error("Unknown scene id: " + requestedSceneId);
}

for (const scene of scenes) {
  const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + selected.voice_id, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: scene.voiceover,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.78,
        style: 0.12,
        use_speaker_boost: true,
        speed: 0.92,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("TTS failed for " + scene.id + ": " + response.status + " " + (await response.text()));
  }

  const rawPath = resolve(rawDir, scene.id + ".mp3");
  const outputPath = resolve(outputDir, scene.id + ".mp3");
  writeFileSync(rawPath, Buffer.from(await response.arrayBuffer()));

  const rawDuration = durationOf(rawPath);
  const targetDuration = scene.durationInFrames / spec.composition.fps - 0.35;
  const speedFactor = rawDuration > targetDuration ? rawDuration / targetDuration : 1;

  if (speedFactor > 1.001) {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        rawPath,
        "-filter:a",
        "atempo=" + speedFactor.toFixed(6),
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        outputPath,
      ],
      {stdio: "inherit"},
    );
  } else {
    copyFileSync(rawPath, outputPath);
  }

  console.log(
    scene.id.padEnd(14),
    "raw",
    rawDuration.toFixed(2) + "s",
    "target",
    targetDuration.toFixed(2) + "s",
    "final",
    durationOf(outputPath).toFixed(2) + "s",
  );
}
