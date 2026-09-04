import React from "react";
import {CanvasImage, interpolate, staticFile, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {enter, settle} from "../utils";

const Metric = ({value, label, color, delay}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        flex: 1,
        borderLeft: "1px solid rgba(245,243,238,.23)",
        padding: "0 48px",
        ...enter(frame, delay, 38),
        scale: settle(frame, delay, delay + 22),
      }}
    >
      <div
        style={{
          color,
          fontFamily: FONT_DISPLAY,
          fontSize: 196,
          lineHeight: 0.86,
          letterSpacing: -12,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 28,
          color: COLORS.paper,
          fontFamily: FONT_MONO,
          fontSize: 24,
          lineHeight: 1.25,
          letterSpacing: 2.8,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const HookScene = () => {
  const frame = useCurrentFrame();
  const lineWidth = interpolate(frame, [8, 80], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneShell scene={1} label="THE RESULT" dark header={false}>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...enter(frame, 0, 12),
        }}
      >
        <CanvasImage
          src={staticFile("merge-queue/logo-lockup.svg")}
          style={{width: 250, height: 48, filter: "invert(1) grayscale(1) brightness(2)"}}
        />
        <div
          style={{
            fontFamily: FONT_MONO,
            color: "rgba(245,243,238,.7)",
            fontSize: 17,
            letterSpacing: 2.2,
          }}
        >
          A TWO-MINUTE STORY
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 176,
          height: 7,
          backgroundColor: "rgba(245,243,238,.14)",
        }}
      >
        <div style={{height: "100%", width: lineWidth + "%", backgroundColor: COLORS.focus}} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 280,
          display: "flex",
        }}
      >
        <Metric value="26" label="CHANGES PROPOSED" color={COLORS.paper} delay={18} />
        <Metric value="3" label="HUMAN DECISIONS" color={COLORS.focus} delay={42} />
        <Metric value="0" label="LOST WORK" color="#61C79E" delay={68} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 118,
          fontFamily: FONT_DISPLAY,
          fontSize: 40,
          color: "rgba(245,243,238,.78)",
          letterSpacing: -1,
          ...enter(frame, 92, 18),
        }}
      >
        One agent. One human. One live application.
      </div>
    </SceneShell>
  );
};
