import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {COLORS, FONT_DISPLAY, FONT_MONO} from "../constants";
import {SceneShell} from "../components/SceneShell";
import {BrowserFrame} from "../components/BrowserFrame";
import {enter, reveal, settle} from "../utils";

const phaseOpacity = (frame, start, end, fade = 16) =>
  interpolate(frame, [start, start + fade, end - fade, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const DemoLabel = ({step, title}) => (
  <div
    style={{
      position: "absolute",
      left: 86,
      top: 136,
      display: "flex",
      alignItems: "center",
      gap: 18,
      zIndex: 12,
    }}
  >
    <div
      style={{
        backgroundColor: COLORS.ink,
        color: COLORS.paper,
        fontFamily: FONT_MONO,
        fontSize: 16,
        letterSpacing: 1.8,
        padding: "10px 13px",
      }}
    >
      DEMO {step}
    </div>
    <div style={{fontFamily: FONT_MONO, fontSize: 18, fontWeight: 800, letterSpacing: 1.6}}>
      {title}
    </div>
  </div>
);

const Receipt = ({name, detail, delay}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "22px 1fr auto",
        gap: 14,
        alignItems: "center",
        padding: "16px 18px",
        borderBottom: "1px solid " + COLORS.rule,
        backgroundColor: COLORS.white,
        ...enter(frame, delay, 13),
      }}
    >
      <span style={{width: 10, height: 10, backgroundColor: COLORS.safe}} />
      <div>
        <div style={{fontFamily: FONT_MONO, fontSize: 16, fontWeight: 800}}>{name}</div>
        <div style={{fontSize: 16, color: COLORS.muted, marginTop: 4}}>{detail}</div>
      </div>
      <div style={{fontFamily: FONT_MONO, color: COLORS.safe, fontSize: 13}}>LIVE</div>
    </div>
  );
};

const ToolPhase = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <DemoLabel step="01" title="WEBMCP OPENS AN ISOLATED BRANCH" />
      <BrowserFrame
        src="merge-queue/01-product-hero.png"
        style={{position: "absolute", left: 86, top: 205, width: 1100, height: 690}}
        imageStyle={{objectPosition: "top left"}}
      />
      <div
        style={{
          position: "absolute",
          right: 86,
          top: 205,
          width: 555,
          backgroundColor: COLORS.white,
          border: "2px solid " + COLORS.ink,
          boxShadow: "14px 16px 0 rgba(26,26,26,.1)",
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.ink,
            color: COLORS.paper,
            padding: "18px 20px",
            fontFamily: FONT_MONO,
            fontSize: 16,
            letterSpacing: 1.5,
          }}
        >
          AGENT / WEBMCP TRACE
        </div>
        <Receipt name="get_workspace_summary" detail="Read main at revision 1" delay={28} />
        <Receipt name="begin_agent_branch" detail="Private branch from R1" delay={62} />
        <Receipt name="stage_task_updates" detail="13 typed operations" delay={96} />
        <div
          style={{
            margin: 24,
            padding: "20px 22px",
            border: "2px solid " + COLORS.agent,
            backgroundColor: COLORS.agentSoft,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            opacity: reveal(frame, 128, 146),
          }}
        >
          <span style={{fontFamily: FONT_MONO, color: COLORS.agent, fontSize: 15}}>AGENT BRANCH</span>
          <strong style={{fontSize: 31}}>BASE R1</strong>
        </div>
      </div>
    </>
  );
};

const BranchPhase = () => (
  <>
    <DemoLabel step="02" title="INTENT STAYS SEPARATE" />
    <BrowserFrame
      src="merge-queue/02-agent-branch.png"
      style={{position: "absolute", left: 86, right: 86, top: 205, height: 690}}
      imageStyle={{objectPosition: "top center"}}
    />
    <div
      style={{
        position: "absolute",
        right: 110,
        top: 232,
        backgroundColor: COLORS.agent,
        color: COLORS.white,
        padding: "18px 24px",
        fontFamily: FONT_MONO,
        fontSize: 19,
        fontWeight: 800,
        boxShadow: "8px 8px 0 rgba(26,26,26,.18)",
      }}
    >
      13 STAGED OPERATIONS · MAIN UNTOUCHED
    </div>
  </>
);

const HumanPhase = () => {
  const frame = useCurrentFrame();
  const edits = [
    ["OWNER", "UNASSIGNED", "MAYA"],
    ["DUE DATE", "SEP 6", "SEP 5"],
    ["STATUS", "READY", "IN PROGRESS"],
    ["NEW TASK", "—", "JUDGE CHECK"],
  ];
  const revision = Math.min(5, 1 + Math.floor(interpolate(frame, [225, 355], [0, 4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })));

  return (
    <>
      <DemoLabel step="03" title="MAYA KEEPS WORKING ON MAIN" />
      <div
        style={{
          position: "absolute",
          left: 86,
          right: 86,
          top: 205,
          height: 690,
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          border: "2px solid " + COLORS.ink,
          backgroundColor: COLORS.white,
        }}
      >
        <div style={{backgroundColor: COLORS.ink, color: COLORS.paper, padding: "48px 42px"}}>
          <div style={{fontFamily: FONT_MONO, color: "#61C79E", fontSize: 17, letterSpacing: 2}}>
            LIVE MAIN
          </div>
          <div style={{fontSize: 126, lineHeight: 0.92, fontWeight: 800, marginTop: 26}}>R{revision}</div>
          <div style={{fontSize: 25, color: "rgba(245,243,238,.66)", lineHeight: 1.35, marginTop: 42}}>
            Four valid human edits happen after the agent’s last read.
          </div>
          <div
            style={{
              marginTop: 60,
              borderTop: "1px solid rgba(245,243,238,.2)",
              paddingTop: 24,
              fontFamily: FONT_MONO,
              fontSize: 15,
              color: "rgba(245,243,238,.6)",
            }}
          >
            AGENT STILL PINNED TO BASE R1
          </div>
        </div>
        <div style={{padding: "34px 42px"}}>
          {edits.map(([label, before, after], index) => (
            <div
              key={label}
              style={{
                display: "grid",
                gridTemplateColumns: "170px 1fr 38px 1fr",
                alignItems: "center",
                gap: 18,
                minHeight: 132,
                borderBottom: index === edits.length - 1 ? "none" : "1px solid " + COLORS.rule,
                opacity: reveal(frame, 215 + index * 28, 230 + index * 28),
                translate: "0px " + (1 - reveal(frame, 215 + index * 28, 235 + index * 28)) * 14 + "px",
              }}
            >
              <span style={{fontFamily: FONT_MONO, color: COLORS.muted, fontSize: 15}}>{label}</span>
              <span style={{fontSize: 30, color: COLORS.muted, textDecoration: "line-through"}}>{before}</span>
              <span style={{fontSize: 26, color: COLORS.focus}}>→</span>
              <strong style={{fontSize: 34}}>{after}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const Count = ({value, label, color, delay}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        flex: 1,
        padding: "26px 30px 22px",
        borderTop: "6px solid " + color,
        backgroundColor: COLORS.white,
        ...enter(frame, delay, 20),
        scale: settle(frame, delay, delay + 18),
      }}
    >
      <div style={{fontSize: 88, fontWeight: 800, lineHeight: 0.9, color}}>{value}</div>
      <div style={{fontFamily: FONT_MONO, fontSize: 15, letterSpacing: 1.8, marginTop: 20}}>{label}</div>
    </div>
  );
};

const MergePhase = () => (
  <>
    <DemoLabel step="04" title="THE THREE-WAY MERGE EXPLAINS THE DIFFERENCE" />
    <BrowserFrame
      src="merge-queue/03-merge-conflicts.png"
      style={{position: "absolute", left: 86, top: 205, width: 1180, height: 690}}
      imageStyle={{objectPosition: "top right"}}
    />
    <div
      style={{
        position: "absolute",
        right: 86,
        top: 205,
        width: 520,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <Count value="22" label="SAFE · AUTO-MERGE" color={COLORS.safe} delay={390} />
      <Count value="1" label="SAME RESULT" color={COLORS.agent} delay={430} />
      <Count value="3" label="YOUR CALLS" color={COLORS.focus} delay={470} />
    </div>
  </>
);

const Decision = ({field, task, human, agent, delay}) => {
  const frame = useCurrentFrame();
  const selected = reveal(frame, delay + 36, delay + 50);
  return (
    <div
      style={{
        backgroundColor: COLORS.white,
        borderLeft: "6px solid " + COLORS.focus,
        padding: "22px 24px",
        ...enter(frame, delay, 15),
      }}
    >
      <div style={{display: "flex", justifyContent: "space-between"}}>
        <span style={{fontFamily: FONT_MONO, color: COLORS.focus, fontSize: 13}}>{field}</span>
        <span style={{fontFamily: FONT_MONO, color: COLORS.muted, fontSize: 12}}>HUMAN DECIDES</span>
      </div>
      <div style={{fontSize: 23, fontWeight: 800, marginTop: 9}}>{task}</div>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 15}}>
        <div
          style={{
            border: "2px solid " + COLORS.safe,
            backgroundColor: "rgba(35,116,91," + (0.06 + selected * 0.12) + ")",
            padding: "12px 14px",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          ✓ {human}
        </div>
        <div style={{border: "1px solid " + COLORS.rule, padding: "13px 14px", fontSize: 21, color: COLORS.muted}}>
          {agent}
        </div>
      </div>
    </div>
  );
};

const DecisionsPhase = () => (
  <>
    <DemoLabel step="05" title="ONLY AMBIGUITY RETURNS TO MAYA" />
    <div
      style={{
        position: "absolute",
        left: 130,
        top: 225,
        width: 760,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Decision field="DUE DATE" task="Verify analytics events" human="FRIDAY" agent="MONDAY" delay={550} />
      <Decision field="OWNER" task="Run security review" human="MAYA" agent="DEV" delay={600} />
      <Decision field="WORKFLOW" task="Record product demo" human="IN PROGRESS" agent="REVIEW" delay={650} />
    </div>
    <div
      style={{
        position: "absolute",
        right: 130,
        top: 260,
        width: 670,
        paddingLeft: 50,
        borderLeft: "1px solid " + COLORS.rule,
      }}
    >
      <div style={{fontFamily: FONT_MONO, color: COLORS.muted, fontSize: 16, letterSpacing: 2}}>
        REVIEW SURFACE
      </div>
      <div style={{fontSize: 86, lineHeight: 0.98, fontWeight: 800, letterSpacing: -4, marginTop: 26}}>
        REVIEW THREE.
        <br />
        NOT TWENTY-SIX.
      </div>
      <div style={{fontSize: 29, lineHeight: 1.4, color: COLORS.muted, marginTop: 36}}>
        Safe intent is automated. Human judgment stays explicit.
      </div>
    </div>
  </>
);

const CommitPhase = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <DemoLabel step="06" title="ONE DELIBERATE COMMIT" />
      <div
        style={{
          position: "absolute",
          left: 190,
          right: 190,
          top: 258,
          height: 470,
          backgroundColor: COLORS.ink,
          color: COLORS.paper,
          display: "grid",
          gridTemplateColumns: "1fr 240px 1fr",
          alignItems: "center",
          padding: "0 78px",
        }}
      >
        <div style={{textAlign: "center", ...enter(frame, 725, 18)}}>
          <div style={{fontFamily: FONT_MONO, color: "#8EA7FF", fontSize: 16}}>AGENT BRANCH</div>
          <div style={{fontSize: 76, fontWeight: 800, marginTop: 16}}>13 OPS</div>
        </div>
        <div style={{position: "relative", height: 240}}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: 6,
              backgroundColor: COLORS.paper,
              scale: interpolate(frame, [745, 785], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
              transformOrigin: "left center",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              translate: "-50% -50%",
              width: 90,
              height: 90,
              borderRadius: "50%",
              backgroundColor: COLORS.focus,
              scale: settle(frame, 772, 792),
            }}
          />
        </div>
        <div style={{textAlign: "center", ...enter(frame, 784, 18)}}>
          <div style={{fontFamily: FONT_MONO, color: "#61C79E", fontSize: 16}}>COMMITTED MAIN</div>
          <div style={{fontSize: 76, fontWeight: 800, marginTop: 16}}>R6</div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 770,
          translate: "-50% 0",
          backgroundColor: COLORS.focus,
          color: COLORS.white,
          padding: "20px 38px",
          fontFamily: FONT_MONO,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 1.6,
          opacity: reveal(frame, 800, 818),
        }}
      >
        COMMIT MERGE
      </div>
    </>
  );
};

export const DemoScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneShell scene={6} label="THE LIVE PROOF" accent={COLORS.focus}>
      <div style={{position: "absolute", inset: 0, opacity: phaseOpacity(frame, 0, 185)}}>
        <ToolPhase />
      </div>
      <div style={{position: "absolute", inset: 0, opacity: phaseOpacity(frame, 170, 315)}}>
        <BranchPhase />
      </div>
      <div style={{position: "absolute", inset: 0, opacity: phaseOpacity(frame, 300, 390)}}>
        <HumanPhase />
      </div>
      <div style={{position: "absolute", inset: 0, opacity: phaseOpacity(frame, 375, 545)}}>
        <MergePhase />
      </div>
      <div style={{position: "absolute", inset: 0, opacity: phaseOpacity(frame, 530, 735)}}>
        <DecisionsPhase />
      </div>
      <div style={{position: "absolute", inset: 0, opacity: phaseOpacity(frame, 720, 1200, 14)}}>
        <CommitPhase />
      </div>
    </SceneShell>
  );
};
