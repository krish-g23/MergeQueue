import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {COLORS} from "../constants";

export const RouteLines = ({start = 0, progress: forcedProgress}) => {
  const frame = useCurrentFrame();
  const progress =
    forcedProgress ??
    interpolate(frame, [start, start + 40], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const dash = 1300 * (1 - progress);

  return (
    <svg
      viewBox="0 0 900 520"
      style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}
    >
      <path
        d="M40 130 H300 C420 130 410 260 540 260 H830"
        fill="none"
        stroke={COLORS.ink}
        strokeWidth="8"
        strokeLinecap="round"
        pathLength="1300"
        strokeDasharray="1300"
        strokeDashoffset={dash}
      />
      <path
        d="M40 390 H300 C420 390 410 260 540 260 H830"
        fill="none"
        stroke={COLORS.agent}
        strokeWidth="8"
        strokeLinecap="round"
        pathLength="1300"
        strokeDasharray="1300"
        strokeDashoffset={dash}
      />
      <circle cx="842" cy="260" r="16" fill={COLORS.focus} opacity={progress} />
    </svg>
  );
};
