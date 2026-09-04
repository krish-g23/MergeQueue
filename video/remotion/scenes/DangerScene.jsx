import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {Headline, Kicker} from "../components/Type";
import {enter, reveal, settle} from "../utils";

const Choice = ({who, value, color, delay}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.white,
        borderTop: "7px solid " + color,
        padding: "34px 38px",
        ...enter(frame, delay, 26),
        scale: settle(frame, delay, delay + 18),
      }}
    >
      <div style={{fontFamily: FONT_MONO, fontSize: 16, color, letterSpacing: 2}}>{who}</div>
      <div style={{fontSize: 72, lineHeight: 1, fontWeight: 800, marginTop: 22}}>{value}</div>
      <div style={{fontSize: 23, color: COLORS.muted, marginTop: 20}}>Run security review</div>
    </div>
  );
};

export const DangerScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell scene={4} label="THE HIDDEN DANGER" accent={COLORS.focus}>
      <div style={{position: "absolute", left: 96, top: 160, right: 96}}>
        <Kicker color={COLORS.focus} style={enter(frame, 0, 12)}>
          MODEL MEMORY ≠ CONCURRENCY CONTROL
        </Kicker>
        <Headline size={92} style={{marginTop: 26, ...enter(frame, 12, 24)}}>
          HISTORY RECORDS ACTIONS.
          <br />
          IT CANNOT RECONCILE INTENT.
        </Headline>
      </div>

      <div
        style={{
          position: "absolute",
          left: 220,
          right: 220,
          top: 482,
          display: "flex",
          alignItems: "stretch",
          gap: 22,
        }}
      >
        <Choice who="HUMAN CHOSE" value="MAYA" color={COLORS.safe} delay={55} />
        <div
          style={{
            width: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_MONO,
            fontSize: 26,
            fontWeight: 800,
            color: COLORS.focus,
            opacity: reveal(frame, 92, 108),
            scale: interpolate(frame, [92, 112], [0.7, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              output: "perceptual-scale",
            }),
          }}
        >
          ≠
        </div>
        <Choice who="AGENT PROPOSED" value="DEV" color={COLORS.agent} delay={72} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 220,
          right: 220,
          top: 800,
          border: "1px solid " + COLORS.focus,
          backgroundColor: COLORS.focusSoft,
          padding: "20px 28px",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_MONO,
          fontSize: 18,
          letterSpacing: 1.4,
          color: COLORS.focus,
          opacity: reveal(frame, 130, 148),
        }}
      >
        <span>DIRECT WRITE</span>
        <span>SOMEONE’S DECISION DISAPPEARS</span>
      </div>
    </SceneShell>
  );
};
