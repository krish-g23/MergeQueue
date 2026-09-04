import React from "react";
import {AbsoluteFill, Sequence} from "remotion";
import {HookScene} from "./scenes/HookScene";
import {MayaScene} from "./scenes/MayaScene";
import {CollisionScene} from "./scenes/CollisionScene";
import {DangerScene} from "./scenes/DangerScene";
import {IntroduceScene} from "./scenes/IntroduceScene";
import {DemoScene} from "./scenes/DemoScene";
import {ControlScene} from "./scenes/ControlScene";
import {WebMcpScene} from "./scenes/WebMcpScene";
import {CloseScene} from "./scenes/CloseScene";
import {AudioTrack} from "./components/AudioTrack";
import {Captions} from "./components/Captions";

export const MergeQueueVideo = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={210} name="01 · Hook">
      <HookScene />
    </Sequence>
    <Sequence from={210} durationInFrames={390} name="02 · Maya">
      <MayaScene />
    </Sequence>
    <Sequence from={600} durationInFrames={420} name="03 · Collision">
      <CollisionScene />
    </Sequence>
    <Sequence from={1020} durationInFrames={330} name="04 · Hidden danger">
      <DangerScene />
    </Sequence>
    <Sequence from={1350} durationInFrames={300} name="05 · Introduce">
      <IntroduceScene />
    </Sequence>
    <Sequence from={1650} durationInFrames={1200} name="06 · Demo">
      <DemoScene />
    </Sequence>
    <Sequence from={2850} durationInFrames={300} name="07 · Human control">
      <ControlScene />
    </Sequence>
    <Sequence from={3150} durationInFrames={270} name="08 · WebMCP">
      <WebMcpScene />
    </Sequence>
    <Sequence from={3420} durationInFrames={180} name="09 · Close">
      <CloseScene />
    </Sequence>
    <AudioTrack />
    <Captions />
  </AbsoluteFill>
);
