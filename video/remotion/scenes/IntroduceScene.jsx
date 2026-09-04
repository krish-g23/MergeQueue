import React from "react";
import {CanvasImage, staticFile, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {RouteLines} from "../components/RouteLines";
import {enter, reveal} from "../utils";

export const IntroduceScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell scene={5} label="THE INTERVENTION" dark header={false}>
      <div style={{position: "absolute", inset: 0}}>
        <RouteLines start={10} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 70,
          display: "flex",
          alignItems: "center",
          gap: 20,
          ...enter(frame, 0, 12),
        }}
      >
        <CanvasImage
          src={staticFile("merge-queue/logo-mark.svg")}
          style={{width: 64, height: 42}}
        />
        <span style={{fontFamily: FONT_MONO, fontSize: 18, letterSpacing: 2.5}}>INTRODUCING</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 212,
          width: 970,
          fontFamily: FONT_DISPLAY,
          fontSize: 176,
          lineHeight: 0.82,
          letterSpacing: -11,
          fontWeight: 800,
          ...enter(frame, 20, 38),
        }}
      >
        MERGE
        <br />
        QUEUE
      </div>
      <div
        style={{
          position: "absolute",
          right: 94,
          top: 250,
          width: 670,
          backgroundColor: COLORS.ink,
          borderTop: "6px solid " + COLORS.focus,
          padding: "34px 0 28px 0",
          zIndex: 3,
          opacity: reveal(frame, 52, 72),
        }}
      >
        <div style={{fontSize: 58, lineHeight: 1.05, fontWeight: 700, letterSpacing: -2}}>
          Git-style conflict resolution for humans and agents.
        </div>
        <div style={{marginTop: 32, color: "rgba(245,243,238,.64)", fontSize: 28, lineHeight: 1.4}}>
          The application keeps both intentions separate until a human approves the result.
        </div>
      </div>
    </SceneShell>
  );
};
