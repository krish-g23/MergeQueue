import React from "react";
import {CanvasImage, interpolate, staticFile, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {RouteLines} from "../components/RouteLines";
import {enter, reveal, settle} from "../utils";

export const CloseScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell scene={9} label="THE BELIEF" dark header={false}>
      <div style={{position: "absolute", right: 40, top: 105, width: 780, height: 650, opacity: 0.9}}>
        <RouteLines start={0} />
      </div>
      <div style={{position: "absolute", left: 92, top: 74, ...enter(frame, 0, 12)}}>
        <CanvasImage
          src={staticFile("merge-queue/logo-lockup.svg")}
          style={{width: 280, height: 58, filter: "invert(1) grayscale(1) brightness(2)"}}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 254,
          width: 1140,
          fontFamily: FONT_DISPLAY,
          fontSize: 142,
          lineHeight: 0.9,
          letterSpacing: -8,
          fontWeight: 800,
          ...enter(frame, 15, 34),
        }}
      >
        AGENT SPEED.
        <br />
        <span style={{color: "#61C79E"}}>HUMAN JUDGMENT.</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 100,
          bottom: 166,
          width: 1060,
          fontSize: 35,
          lineHeight: 1.35,
          color: "rgba(245,243,238,.7)",
          opacity: reveal(frame, 55, 72),
        }}
      >
        Agents should work safely around human decisions—not replace them.
      </div>
      <div
        style={{
          position: "absolute",
          right: 115,
          bottom: 138,
          width: 180,
          height: 180,
          borderRadius: "50%",
          backgroundColor: COLORS.focus,
          scale: settle(frame, 72, 96),
          opacity: reveal(frame, 72, 90),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          bottom: 76,
          borderTop: "1px solid rgba(245,243,238,.22)",
          paddingTop: 20,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_MONO,
          fontSize: 16,
          letterSpacing: 2,
          color: "rgba(245,243,238,.54)",
          opacity: reveal(frame, 92, 106),
        }}
      >
        <span>MERGE QUEUE · WEBMCP</span>
        <span>ONE PAGE · TWO WRITERS · ONE DELIBERATE COMMIT</span>
      </div>
    </SceneShell>
  );
};
