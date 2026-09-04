import React from "react";
import {AbsoluteFill, CanvasImage, staticFile} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";

export const SceneShell = ({
  children,
  scene,
  label,
  dark = false,
  accent = COLORS.agent,
  header = true,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: dark ? COLORS.ink : COLORS.paper,
      color: dark ? COLORS.paper : COLORS.ink,
      fontFamily: FONT_DISPLAY,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(to right, transparent 0, transparent 479px, rgba(115,113,108,.12) 480px, transparent 481px), linear-gradient(to bottom, transparent 0, transparent 269px, rgba(115,113,108,.10) 270px, transparent 271px)",
        backgroundSize: "480px 270px",
        opacity: dark ? 0.28 : 0.8,
      }}
    />
    {header ? (
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 42,
          height: 62,
          borderBottom: "1px solid " + (dark ? "rgba(245,243,238,.22)" : COLORS.rule),
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          zIndex: 20,
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: 18}}>
          <CanvasImage
            src={staticFile("merge-queue/logo-mark.svg")}
            style={{width: 46, height: 30}}
          />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2.4,
            }}
          >
            MERGE QUEUE
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 18,
            alignItems: "center",
            fontFamily: FONT_MONO,
            fontSize: 15,
            letterSpacing: 1.7,
            color: dark ? "rgba(245,243,238,.72)" : COLORS.muted,
          }}
        >
          <span>{String(scene).padStart(2, "0")} / 09</span>
          <span style={{width: 7, height: 7, borderRadius: "50%", backgroundColor: accent}} />
          <span>{label}</span>
        </div>
      </div>
    ) : null}
    {children}
  </AbsoluteFill>
);
