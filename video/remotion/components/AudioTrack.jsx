import React from "react";
import {Sequence, staticFile, useCurrentFrame} from "remotion";
import {Audio} from "@remotion/media";
import {SCENES, TOTAL_FRAMES} from "../constants";

export const AudioTrack = () => {
  const frame = useCurrentFrame();
  const musicVolume =
    frame >= 1650 && frame < 2850 ? 0.045 : frame >= 3420 ? 0.035 : 0.06;

  return (
    <>
      <Audio
        src={staticFile("audio/merge-queue-bed.wav")}
        volume={musicVolume}
        durationInFrames={TOTAL_FRAMES}
      />
      {SCENES.map((scene) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration}>
          <Audio src={staticFile("voiceover/merge-queue/" + scene.id + ".mp3")} volume={1} />
        </Sequence>
      ))}
      {[1650, 1815, 1875, 2020].map((from) => (
        <Sequence key={from} from={from} durationInFrames={20}>
          <Audio src={staticFile("audio/ui-click.wav")} volume={0.18} />
        </Sequence>
      ))}
      <Sequence from={2020} durationInFrames={42}>
        <Audio src={staticFile("audio/merge-reveal.wav")} volume={0.2} />
      </Sequence>
      <Sequence from={2390} durationInFrames={48}>
        <Audio src={staticFile("audio/commit.wav")} volume={0.22} />
      </Sequence>
    </>
  );
};
