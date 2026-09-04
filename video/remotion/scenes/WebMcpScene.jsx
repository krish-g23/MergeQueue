import React from "react";
import {CanvasImage, interpolate, staticFile, useCurrentFrame} from "remotion";
import {COLORS, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {enter, reveal} from "../utils";

export const WebMcpScene = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 240], [1.02, 1.09], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <SceneShell scene={8} label="WHY WEBMCP" accent={COLORS.agent}>
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 146,
          width: 1180,
          height: 750,
          overflow: "hidden",
          border: "2px solid " + COLORS.ink,
          backgroundColor: COLORS.white,
        }}
      >
        <CanvasImage
          src={staticFile("merge-queue/04-architecture.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: zoom,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 1298,
          right: 72,
          top: 146,
          bottom: 184,
          backgroundColor: COLORS.ink,
          color: COLORS.paper,
          padding: "44px 42px",
        }}
      >
        <div style={{fontFamily: FONT_MONO, color: "#8EA7FF", fontSize: 17, letterSpacing: 2}}>
          THE LIVE APPLICATION OWNS
        </div>
        {[
          ["01", "STRUCTURED TOOLS"],
          ["02", "VERSIONED STATE"],
          ["03", "VISIBLE OPERATIONS"],
          ["04", "NARROW PERMISSIONS"],
        ].map(([number, label], index) => (
          <div
            key={number}
            style={{
              display: "grid",
              gridTemplateColumns: "54px 1fr",
              gap: 16,
              padding: "24px 0",
              borderBottom: "1px solid rgba(245,243,238,.18)",
              ...enter(frame, 20 + index * 26, 16),
            }}
          >
            <span style={{fontFamily: FONT_MONO, color: index === 3 ? "#61C79E" : COLORS.focus, fontSize: 16}}>
              {number}
            </span>
            <strong style={{fontSize: 26, lineHeight: 1.14}}>{label}</strong>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 1298,
          right: 72,
          bottom: 108,
          fontFamily: FONT_MONO,
          color: COLORS.agent,
          fontSize: 17,
          lineHeight: 1.45,
          opacity: reveal(frame, 128, 146),
        }}
      >
        NOT A CHAT LOG.
        <br />
        A CONCURRENCY CONTRACT.
      </div>
    </SceneShell>
  );
};
