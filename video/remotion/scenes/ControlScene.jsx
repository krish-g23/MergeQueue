import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {enter, reveal, settle} from "../utils";

const Permission = ({label, value, allowed, delay}) => {
  const frame = useCurrentFrame();
  const color = allowed ? "#61C79E" : COLORS.focus;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "25px 0",
        borderBottom: "1px solid rgba(245,243,238,.18)",
        ...enter(frame, delay, 14),
      }}
    >
      <span style={{fontFamily: FONT_MONO, fontSize: 18, letterSpacing: 1.5}}>{label}</span>
      <span style={{fontFamily: FONT_MONO, color, fontSize: 17, fontWeight: 800}}>{value}</span>
    </div>
  );
};

export const ControlScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell scene={7} label="HUMAN CONTROL" dark accent={COLORS.safe}>
      <div style={{position: "absolute", left: 92, right: 92, top: 168, bottom: 126, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34}}>
        <div style={{border: "1px solid rgba(245,243,238,.22)", padding: "42px 48px"}}>
          <div style={{fontFamily: FONT_MONO, color: "#8EA7FF", fontSize: 18, letterSpacing: 2}}>
            AGENT PERMISSIONS
          </div>
          <Permission label="READ STATE" value="ALLOWED" allowed delay={22} />
          <Permission label="OPEN BRANCH" value="ALLOWED" allowed delay={38} />
          <Permission label="STAGE CHANGES" value="ALLOWED" allowed delay={54} />
          <Permission label="RESOLVE CONFLICTS" value="DENIED" delay={86} />
          <Permission label="COMMIT MERGE" value="DENIED" delay={102} />
        </div>
        <div
          style={{
            backgroundColor: COLORS.paper,
            color: COLORS.ink,
            padding: "42px 48px",
            position: "relative",
            opacity: reveal(frame, 72, 92),
          }}
        >
          <div style={{fontFamily: FONT_MONO, color: COLORS.safe, fontSize: 18, letterSpacing: 2}}>
            HUMAN APPROVAL
          </div>
          <div style={{fontSize: 74, lineHeight: 0.98, fontWeight: 800, letterSpacing: -4, marginTop: 34}}>
            ONE ATOMIC
            <br />
            REVISION.
          </div>
          <div
            style={{
              marginTop: 52,
              border: "2px solid " + COLORS.safe,
              backgroundColor: COLORS.safeSoft,
              padding: "24px 26px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              scale: settle(frame, 126, 148),
            }}
          >
            <span style={{fontFamily: FONT_MONO, color: COLORS.safe, fontSize: 17}}>COMMITTED</span>
            <strong style={{fontSize: 39}}>REVISION 6</strong>
          </div>
          <div
            style={{
              marginTop: 18,
              border: "1px solid " + COLORS.rule,
              padding: "20px 26px",
              fontFamily: FONT_MONO,
              fontSize: 17,
              display: "flex",
              justifyContent: "space-between",
              opacity: reveal(frame, 164, 180),
            }}
          >
            <span>REVERT MERGE</span>
            <span style={{color: COLORS.muted}}>CREATES REVISION 7</span>
          </div>
          <div
            style={{
              position: "absolute",
              right: 58,
              bottom: 44,
              width: 88,
              height: 88,
              borderRadius: "50%",
              backgroundColor: COLORS.focus,
              scale: interpolate(frame, [116, 136], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
            }}
          />
        </div>
      </div>
    </SceneShell>
  );
};
