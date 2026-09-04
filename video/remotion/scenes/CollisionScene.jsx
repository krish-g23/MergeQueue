import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {enter, reveal} from "../utils";

const EditRow = ({label, value, delay}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(245,243,238,.18)",
        padding: "18px 0",
        fontSize: 25,
        ...enter(frame, delay, 14),
      }}
    >
      <span style={{color: "rgba(245,243,238,.62)"}}>{label}</span>
      <span style={{fontFamily: FONT_MONO, color: COLORS.paper}}>{value}</span>
    </div>
  );
};

export const CollisionScene = () => {
  const frame = useCurrentFrame();
  const revision = Math.min(5, 1 + Math.floor(interpolate(frame, [100, 270], [0, 4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })));
  const branchProgress = reveal(frame, 32, 110);

  return (
    <SceneShell scene={3} label="THE COLLISION" dark accent={COLORS.focus}>
      <div
        style={{
          position: "absolute",
          left: 86,
          right: 86,
          top: 150,
          bottom: 125,
          display: "grid",
          gridTemplateColumns: "1fr 170px 1fr",
          gap: 0,
        }}
      >
        <div style={{padding: "52px 60px", border: "1px solid rgba(245,243,238,.2)"}}>
          <div style={{fontFamily: FONT_MONO, color: "#8EA7FF", fontSize: 19, letterSpacing: 2}}>
            AGENT / PRIVATE BRANCH
          </div>
          <div style={{fontFamily: FONT_DISPLAY, fontSize: 110, fontWeight: 800, marginTop: 28}}>
            BASE R1
          </div>
          <div
            style={{
              marginTop: 50,
              height: 5,
              backgroundColor: "rgba(49,87,213,.2)",
            }}
          >
            <div style={{height: "100%", width: branchProgress * 100 + "%", backgroundColor: COLORS.agent}} />
          </div>
          <div style={{fontSize: 30, lineHeight: 1.35, marginTop: 38, color: "rgba(245,243,238,.7)"}}>
            The branch preserves the exact state the agent read.
          </div>
        </div>

        <div style={{position: "relative"}}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: "rgba(245,243,238,.22)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              translate: "-50% -50%",
              width: 96,
              height: 96,
              borderRadius: "50%",
              backgroundColor: COLORS.focus,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.white,
              fontSize: 46,
              fontWeight: 800,
              scale: interpolate(frame, [260, 278], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
            }}
          >
            !
          </div>
        </div>

        <div style={{padding: "52px 60px", border: "1px solid rgba(245,243,238,.2)"}}>
          <div style={{fontFamily: FONT_MONO, color: "#61C79E", fontSize: 19, letterSpacing: 2}}>
            HUMAN / LIVE MAIN
          </div>
          <div style={{display: "flex", alignItems: "baseline", gap: 22, marginTop: 28}}>
            <div style={{fontFamily: FONT_DISPLAY, fontSize: 110, fontWeight: 800}}>MAIN R{revision}</div>
          </div>
          <div style={{marginTop: 28}}>
            <EditRow label="OWNER" value="MAYA" delay={94} />
            <EditRow label="DEADLINE" value="FRIDAY" delay={128} />
            <EditRow label="STATUS" value="IN PROGRESS" delay={162} />
            <EditRow label="NEW TASK" value="+ JUDGE CHECK" delay={196} />
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 56,
          textAlign: "center",
          color: "rgba(245,243,238,.66)",
          fontFamily: FONT_MONO,
          fontSize: 18,
          letterSpacing: 2,
          opacity: reveal(frame, 244, 262),
        }}
      >
        SAME APPLICATION · DIFFERENT VALID INTENT
      </div>
    </SceneShell>
  );
};
