import React from "react";
import {CanvasImage, staticFile} from "remotion";
import {COLORS, FONT_MONO} from "../constants";

export const BrowserFrame = ({
  src,
  style = {},
  imageStyle = {},
  label = "LIVE APPLICATION",
}) => (
  <div
    style={{
      position: "relative",
      backgroundColor: COLORS.white,
      border: "2px solid " + COLORS.ink,
      boxShadow: "16px 18px 0 rgba(26,26,26,.12)",
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 18px",
        backgroundColor: COLORS.ink,
        color: COLORS.paper,
        fontFamily: FONT_MONO,
        fontSize: 13,
        letterSpacing: 1.5,
      }}
    >
      <span style={{width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.focus}} />
      <span style={{width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.agent}} />
      <span style={{opacity: 0.72, marginLeft: 6}}>{label}</span>
    </div>
    <CanvasImage
      src={staticFile(src)}
      style={{
        position: "absolute",
        top: 44,
        left: 0,
        width: "100%",
        height: "calc(100% - 44px)",
        objectFit: "cover",
        objectPosition: "top left",
        ...imageStyle,
      }}
    />
  </div>
);
