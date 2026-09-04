import React from "react";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";

export const Kicker = ({children, color = COLORS.agent, style = {}}) => (
  <div
    style={{
      color,
      fontFamily: FONT_MONO,
      fontSize: 18,
      lineHeight: 1.2,
      fontWeight: 800,
      letterSpacing: 2.6,
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Headline = ({children, size = 112, color = COLORS.ink, style = {}}) => (
  <div
    style={{
      color,
      fontFamily: FONT_DISPLAY,
      fontSize: size,
      lineHeight: 0.91,
      fontWeight: 800,
      letterSpacing: -5,
      ...style,
    }}
  >
    {children}
  </div>
);

export const MonoLabel = ({children, color = COLORS.muted, style = {}}) => (
  <div
    style={{
      color,
      fontFamily: FONT_MONO,
      fontSize: 16,
      lineHeight: 1.35,
      fontWeight: 700,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </div>
);
