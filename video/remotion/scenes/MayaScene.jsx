import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {Headline, Kicker, MonoLabel} from "../components/Type";
import {enter, reveal} from "../utils";

const Task = ({title, owner, color, delay}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        backgroundColor: COLORS.white,
        borderTop: "4px solid " + color,
        padding: "20px 20px 18px",
        minHeight: 128,
        boxShadow: "0 8px 20px rgba(26,26,26,.08)",
        ...enter(frame, delay, 18),
      }}
    >
      <MonoLabel style={{fontSize: 12}}>CRITICAL</MonoLabel>
      <div style={{fontSize: 24, fontWeight: 800, lineHeight: 1.12, marginTop: 10}}>{title}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
          fontFamily: FONT_MONO,
          fontSize: 13,
          color: COLORS.muted,
        }}
      >
        <span>{owner}</span>
        <span>FRI</span>
      </div>
    </div>
  );
};

export const MayaScene = () => {
  const frame = useCurrentFrame();
  const cursorX = interpolate(frame, [80, 180], [1060, 1292], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneShell scene={2} label="ONE PERSON · ONE DEADLINE" accent={COLORS.focus}>
      <div style={{position: "absolute", left: 90, top: 180, width: 700}}>
        <Kicker style={enter(frame, 4, 12)}>THURSDAY · 4:42 PM</Kicker>
        <Headline size={124} style={{marginTop: 34, ...enter(frame, 18, 30)}}>
          MAYA HAS A
          <br />
          FRIDAY LAUNCH.
        </Headline>
        <div
          style={{
            width: 610,
            marginTop: 42,
            fontSize: 36,
            lineHeight: 1.28,
            color: COLORS.muted,
            ...enter(frame, 42, 20),
          }}
        >
          She asks an agent for help—then keeps working.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 940,
          top: 164,
          width: 860,
          height: 690,
          border: "2px solid " + COLORS.ink,
          backgroundColor: "#ECE9E2",
          padding: 24,
          opacity: reveal(frame, 28, 48),
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid " + COLORS.rule,
            paddingBottom: 16,
            fontFamily: FONT_MONO,
            fontSize: 15,
            letterSpacing: 1.5,
          }}
        >
          <span>FRIDAY LAUNCH</span>
          <span>MAIN · R1</span>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24}}>
          <Task title="Run security review" owner="UNASSIGNED" color={COLORS.focus} delay={52} />
          <Task title="Record product demo" owner="MAYA" color={COLORS.agent} delay={62} />
          <Task title="Verify analytics" owner="SAM" color={COLORS.agent} delay={72} />
          <Task title="Launch checklist" owner="MAYA" color={COLORS.safe} delay={82} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            bottom: 30,
            backgroundColor: COLORS.ink,
            color: COLORS.paper,
            padding: "22px 26px",
            fontSize: 23,
            lineHeight: 1.3,
            opacity: reveal(frame, 105, 123),
          }}
        >
          <span style={{fontFamily: FONT_MONO, color: "#8EA7FF", marginRight: 18}}>PROMPT</span>
          Reorganize this launch plan around Friday.
        </div>
        <div
          style={{
            position: "absolute",
            left: cursorX,
            top: 425,
            width: 24,
            height: 32,
            backgroundColor: COLORS.focus,
            clipPath: "polygon(0 0, 100% 62%, 58% 68%, 42% 100%)",
            opacity: reveal(frame, 74, 90),
          }}
        />
      </div>
    </SceneShell>
  );
};
