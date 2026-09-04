import React from "react";
import {Composition, Folder} from "remotion";
import {MergeQueueVideo} from "./MergeQueueVideo";
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from "./constants";
import {HookScene} from "./scenes/HookScene";
import {MayaScene} from "./scenes/MayaScene";
import {CollisionScene} from "./scenes/CollisionScene";
import {DangerScene} from "./scenes/DangerScene";
import {IntroduceScene} from "./scenes/IntroduceScene";
import {DemoScene} from "./scenes/DemoScene";
import {ControlScene} from "./scenes/ControlScene";
import {WebMcpScene} from "./scenes/WebMcpScene";
import {CloseScene} from "./scenes/CloseScene";

const sceneCompositions = [
  ["Scene01-Hook", HookScene, 210],
  ["Scene02-Maya", MayaScene, 390],
  ["Scene03-Collision", CollisionScene, 420],
  ["Scene04-Danger", DangerScene, 330],
  ["Scene05-Introduce", IntroduceScene, 300],
  ["Scene06-Demo", DemoScene, 1200],
  ["Scene07-Control", ControlScene, 300],
  ["Scene08-WebMCP", WebMcpScene, 270],
  ["Scene09-Close", CloseScene, 180],
];

export const RemotionRoot = () => (
  <>
    <Composition
      id="MergeQueueDemo"
      component={MergeQueueVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Folder name="MergeQueue-Scenes">
      {sceneCompositions.map(([id, component, durationInFrames]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={durationInFrames}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </Folder>
  </>
);
