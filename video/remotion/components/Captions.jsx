import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import captions from "../../captions.json";
import {COLORS, FONT_DISPLAY} from "../constants";

export const Captions = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nowMs = (frame / fps) * 1000;
  const active = captions.find((caption) => nowMs >= caption.startMs && nowMs < caption.endMs);

  if (!active) {
    return null;
  }

  const startFrame = (active.startMs / 1000) * fps;
  const endFrame = (active.endMs / 1000) * fps;
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 4, endFrame - 4, endFrame],
    [0, 1, 1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 34,
        translate: "-50% 0",
        width: 1320,
        display: "flex",
        justifyContent: "center",
        zIndex: 100,
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          padding: "12px 24px 13px",
          borderRadius: 3,
          backgroundColor: "rgba(26,26,26,.92)",
          color: COLORS.white,
          fontFamily: FONT_DISPLAY,
          fontSize: 31,
          lineHeight: 1.2,
          fontWeight: 600,
          letterSpacing: -0.4,
          textAlign: "center",
          boxShadow: "0 5px 22px rgba(0,0,0,.18)",
        }}
      >
        {active.text}
      </div>
    </div>
  );
};
