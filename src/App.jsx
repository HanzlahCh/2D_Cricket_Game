import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// ── Constants ──────────────────────────────────────────────
const TOTAL_BALLS   = 12;   // 2 overs
const TOTAL_WICKETS = 2;
const SLIDER_SPEED  = 0.008; // fraction per frame (0–1 range)

// Probability distributions for each batting style.
// Each entry: { label, runs, prob, cssClass }
// Probabilities MUST sum to exactly 1.00
const BATTING_STYLES = {
  aggressive: {
    label: "Aggressive",
    segments: [
      { label: "W",  runs: "W", prob: 0.35, cssClass: "seg-wicket" },
      { label: "0",  runs: 0,   prob: 0.05, cssClass: "seg-dot"    },
      { label: "1",  runs: 1,   prob: 0.10, cssClass: "seg-one"    },
      { label: "2",  runs: 2,   prob: 0.10, cssClass: "seg-two"    },
      { label: "3",  runs: 3,   prob: 0.05, cssClass: "seg-three"  },
      { label: "4",  runs: 4,   prob: 0.15, cssClass: "seg-four"   },
      { label: "6",  runs: 6,   prob: 0.20, cssClass: "seg-six"    },
    ],
  },
  defensive: {
    label: "Defensive",
    segments: [
      { label: "W",  runs: "W", prob: 0.15, cssClass: "seg-wicket" },
      { label: "0",  runs: 0,   prob: 0.30, cssClass: "seg-dot"    },
      { label: "1",  runs: 1,   prob: 0.25, cssClass: "seg-one"    },
      { label: "2",  runs: 2,   prob: 0.20, cssClass: "seg-two"    },
      { label: "3",  runs: 3,   prob: 0.05, cssClass: "seg-three"  },
      { label: "4",  runs: 4,   prob: 0.05, cssClass: "seg-four"   },
      { label: "6",  runs: 6,   prob: 0.00, cssClass: "seg-six"    },
    ],
  },
};

// Commentary lines per outcome
const COMMENTARY = {
  W:  [
    "🎯 Clean bowled! The stumps are shattered!",
    "🏏 Got him! That was a peach of a delivery!",
    "😱 Caught at slip — the batsman nicks it through to the keeper!",
    "💥 Plumb in front! That's given OUT by the umpire!",
  ],
  0:  [
    "🛡 Solid defence. No run off that one.",
    "🤚 The fielder dives and saves the single!",
    "😤 Dot ball. The pressure is building.",
  ],
  1:  [
    "✅ Quick single taken with sharp running between the wickets!",
    "👣 Tapped into the off side — one run.",
    "🏃 Easy single on the leg side.",
  ],
  2:  [
    "🎉 Driven beautifully — they get two!",
    "🌟 Timed to perfection, two runs added.",
    "💨 A gap in the covers and they sprint back for two!",
  ],
  3:  [
    "🔥 Three runs! Misfield out on the boundary.",
    "⚡ Powerful push and they turn three with terrific running!",
    "🏆 Three more on the board!",
  ],
  4:  [
    "🏏 FOUR! Cracking cover drive races to the rope!",
    "💥 Sliced through the off side — FOUR runs!",
    "🔥 That's a BOUNDARY! What a shot!",
  ],
  6:  [
    "🚀 SIX! Over long-on, absolutely smashed into the crowd!",
    "🎆 MAXIMUM! That's out of the park completely!",
    "🌟 SIX! What a strike! The crowd goes wild!",
  ],
};

// Pick a random commentary for the outcome
function getCommentary(outcome) {
  const pool = COMMENTARY[outcome] ?? COMMENTARY[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Find which segment the slider (0–1) falls into
function resolveOutcome(sliderPos, segments) {
  let cumulative = 0;
  for (const seg of segments) {
    cumulative += seg.prob;
    if (sliderPos <= cumulative + 1e-9) return seg;
  }
  return segments[segments.length - 1]; // fallback
}

// Format overs string, e.g. 7 balls bowled → "1.1"
function formatOvers(ballsBowled) {
  const overs    = Math.floor(ballsBowled / 6);
  const ballInOv = ballsBowled % 6;
  return `${overs}.${ballInOv}`;
}

// ── BatsmanSVG ──────────────────────────────────────────────
function BatsmanSVG() {
  return (
    <svg
      viewBox="0 0 60 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      {/* Body */}
      <ellipse cx="30" cy="55" rx="14" ry="18" fill="#1a5c1a" />
      {/* Helmet */}
      <circle cx="30" cy="24" r="11" fill="#1a3a6a" />
      <rect x="19" y="28" width="22" height="5" rx="2" fill="#0a1a3a" />
      {/* Visor */}
      <rect x="19" y="31" width="22" height="3" rx="1" fill="#4a8aff" opacity="0.5" />
      {/* Gloves */}
      <circle cx="16" cy="50" r="5" fill="#f0a500" />
      <circle cx="44" cy="48" r="5" fill="#f0a500" />
      {/* Bat */}
      <rect x="42" y="38" width="6" height="36" rx="3" fill="#c8a060"
        transform="rotate(30 42 52)" />
      {/* Pads */}
      <rect x="20" y="66" width="9" height="14" rx="4" fill="#e8e8e0" />
      <rect x="31" y="66" width="9" height="14" rx="4" fill="#e8e8e0" />
      {/* Name strip on jersey */}
      <rect x="22" y="48" width="16" height="5" rx="2" fill="#ffffff" opacity="0.15" />
    </svg>
  );
}

// ── PowerBar Component ──────────────────────────────────────
function PowerBar({ segments, sliderPos, onShoot, disabled }) {
  // Build cumulative boundary values for labels
  const boundaries = (() => {
    let cum = 0;
    return segments.map((s) => {
      cum += s.prob;
      return cum;
    });
  })();

  return (
    <div className="powerbar-track">
      {/* Coloured segments */}
      <div className="powerbar-segments">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`powerbar-segment ${seg.cssClass}`}
            style={{ width: `${seg.prob * 100}%` }}
            title={`${seg.label}: ${(seg.prob * 100).toFixed(0)}%`}
          >
            {seg.prob > 0 ? seg.label : ""}
          </div>
        ))}
      </div>

      {/* Moving slider indicator */}
      <div
        className="powerbar-slider"
        style={{ left: `${sliderPos * 100}%` }}
        aria-hidden="true"
      >
        <div className="slider-arrow" />
        <div className="slider-line" />
      </div>
    </div>
  );
}

// ── CricketField Component ──────────────────────────────────
function CricketField({ ballState, batsmanState, stumpsKnocked, resultFlash }) {
  return (
    <div className="field-wrapper">
      <div className="cricket-field">
        {/* Sky */}
        <div className="sky-layer">
          <div className="cloud cloud-1" />
          <div className="cloud cloud-2" />
          <div className="cloud cloud-3" />
        </div>

        {/* Boundary rope circle */}
        <div className="boundary-circle" />

        {/* Pitch strip */}
        <div className="pitch-strip">
          <div className="crease-line crease-top" />
          <div className="crease-line crease-bottom" />
        </div>

        {/* Stumps */}
        <div className={`stumps ${stumpsKnocked ? "knocked" : ""}`}>
          <div className="stump" />
          <div className="stump" />
          <div className="stump" />
          <div className="bail" />
        </div>

        {/* Batsman */}
        <div className={`batsman-wrapper ${batsmanState}`}>
          <BatsmanSVG />
        </div>

        {/* Cricket ball */}
        <div className={`cricket-ball ${ballState}`} />

        {/* Result flash overlay */}
        {resultFlash && (
          <div className={`result-flash ${resultFlash.type}`}>
            {resultFlash.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scoreboard Component ────────────────────────────────────
function Scoreboard({ runs, wickets, ballsBowled }) {
  const wicketArr = Array.from({ length: TOTAL_WICKETS });
  const ballArr   = Array.from({ length: TOTAL_BALLS });
  const overs     = formatOvers(ballsBowled);
  const ballsLeft = TOTAL_BALLS - ballsBowled;

  return (
    <div className="scoreboard-panel">
      <h3>Scoreboard</h3>

      <div className="score-main">
        <div className="score-runs">{runs}</div>
        <div className="score-wickets">
          {wickets}/{TOTAL_WICKETS} WICKETS
        </div>
      </div>

      {/* Wicket dots */}
      <div className="wicket-indicators">
        {wicketArr.map((_, i) => (
          <div key={i} className={`wicket-dot ${i < wickets ? "lost" : ""}`} />
        ))}
      </div>

      <div className="score-detail">
        <div className="score-row">
          <span className="score-label">Overs</span>
          <span className="score-value warning">{overs} / 2.0</span>
        </div>
        <div className="score-row">
          <span className="score-label">Balls Left</span>
          <span
            className={`score-value ${ballsLeft <= 3 ? "danger" : ""}`}
          >
            {ballsLeft}
          </span>
        </div>
        <div className="score-row">
          <span className="score-label">Strike Rate</span>
          <span className="score-value success">
            {ballsBowled > 0
              ? ((runs / ballsBowled) * 100).toFixed(1)
              : "0.0"}
          </span>
        </div>
        <div className="score-row">
          <span className="score-label">Run Rate</span>
          <span className="score-value">
            {ballsBowled > 0
              ? ((runs / (ballsBowled / 6)) ).toFixed(2)
              : "0.00"}
          </span>
        </div>
      </div>

      {/* Per-ball tracker */}
      <div className="ball-tracker" title="Ball history">
        {ballArr.map((_, i) => (
          <div key={i} className="ball-pip" />
        ))}
      </div>
    </div>
  );
}

// ── GameOver Overlay ────────────────────────────────────────
function GameOverOverlay({ runs, wickets, ballsBowled, reason, onRestart }) {
  return (
    <div className="gameover-overlay">
      <div className="gameover-card">
        <div className="gameover-title">INNINGS OVER</div>
        <div className="gameover-reason">{reason}</div>

        <div className="gameover-stats">
          <div className="go-stat">
            <div className="go-stat-value">{runs}</div>
            <div className="go-stat-label">Total Runs</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-value">{wickets}</div>
            <div className="go-stat-label">Wickets Lost</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-value">{formatOvers(ballsBowled)}</div>
            <div className="go-stat-label">Overs Batted</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-value">
              {ballsBowled > 0
                ? ((runs / ballsBowled) * 100).toFixed(0)
                : 0}
            </div>
            <div className="go-stat-label">Strike Rate</div>
          </div>
        </div>

        <button className="play-again-btn" onClick={onRestart}>
          🏏 Play Again
        </button>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────
export default function App() {
  // ── Game State ─────────────────────────────────────────
  const [runs,        setRuns]        = useState(0);
  const [wickets,     setWickets]     = useState(0);
  const [ballsBowled, setBallsBowled] = useState(0);
  const [style,       setStyle]       = useState("aggressive"); // "aggressive" | "defensive"
  const [gameOver,    setGameOver]    = useState(false);
  const [gameOverReason, setGameOverReason] = useState("");

  // ── Slider State ───────────────────────────────────────
  const [sliderPos,   setSliderPos]   = useState(0);
  const [sliderActive, setSliderActive] = useState(false);

  // ── Animation / UI State ───────────────────────────────
  const [phase,        setPhase]       = useState("idle");
  // phases: "idle" | "bowling" | "waiting" | "shot" | "result"
  const [ballState,    setBallState]   = useState("");
  const [batsmanState, setBatsmanState] = useState("");
  const [stumpsKnocked, setStumpsKnocked] = useState(false);
  const [resultFlash,  setResultFlash] = useState(null);
  const [commentary,   setCommentary]  = useState("Welcome to Cricket Blaze! Choose your batting style and press PLAY BALL to start.");

  // Refs for animation frames
  const sliderRafRef  = useRef(null);
  const sliderDirRef  = useRef(1);    // 1 = moving right, -1 = left (bounce)
  const sliderPosRef  = useRef(0);

  // ── Slider animation loop ──────────────────────────────
  const startSlider = useCallback(() => {
    setSliderActive(true);
    const animate = () => {
      sliderPosRef.current += SLIDER_SPEED * sliderDirRef.current;
      if (sliderPosRef.current >= 1) {
        sliderPosRef.current = 1;
        sliderDirRef.current = -1;
      } else if (sliderPosRef.current <= 0) {
        sliderPosRef.current = 0;
        sliderDirRef.current = 1;
      }
      setSliderPos(sliderPosRef.current);
      sliderRafRef.current = requestAnimationFrame(animate);
    };
    sliderRafRef.current = requestAnimationFrame(animate);
  }, []);

  const stopSlider = useCallback(() => {
    setSliderActive(false);
    if (sliderRafRef.current) {
      cancelAnimationFrame(sliderRafRef.current);
      sliderRafRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => () => stopSlider(), [stopSlider]);

  // ── Start a new ball (bowling animation → wait) ────────
  const startBall = useCallback(() => {
    if (gameOver || phase !== "idle") return;

    setPhase("bowling");
    setBallState("bowling-anim");
    setStumpsKnocked(false);
    setResultFlash(null);

    // After bowling animation (~700ms), start slider
    setTimeout(() => {
      setBallState("");
      setPhase("waiting");
      startSlider();
    }, 750);
  }, [gameOver, phase, startSlider]);

  // ── Player presses PLAY SHOT ───────────────────────────
  const playShot = useCallback(() => {
    if (phase !== "waiting") return;

    // Capture slider position
    const capturedPos = sliderPosRef.current;
    stopSlider();

    // Resolve outcome from power bar
    const segments = BATTING_STYLES[style].segments;
    const segment  = resolveOutcome(capturedPos, segments);
    const outcome  = segment.runs; // "W" or number

    setPhase("shot");
    setBatsmanState("swing-anim");

    // Ball animation
    if (outcome === "W") {
      setBallState("hit-anim-dot");
    } else if (outcome === 4 || outcome === 6) {
      setBallState("hit-anim-boundary");
    } else {
      setBallState("hit-anim-runs");
    }

    // After bat swing (~500ms), apply result
    setTimeout(() => {
      setBatsmanState("");
      setBallState("");

      const newBalls    = ballsBowled + 1;
      let   newRuns     = runs;
      let   newWickets  = wickets;
      let   flashText   = "";
      let   flashType   = "runs";

      if (outcome === "W") {
        newWickets += 1;
        flashText  = "OUT!";
        flashType  = "wicket";
        setStumpsKnocked(true);
      } else {
        newRuns += outcome;
        if (outcome === 6) { flashText = "SIX!"; flashType = "boundary"; }
        else if (outcome === 4) { flashText = "FOUR!"; flashType = "boundary"; }
        else if (outcome === 0) { flashText = "DOT"; flashType = "dot"; }
        else { flashText = `${outcome} RUN${outcome > 1 ? "S" : ""}`; flashType = "runs"; }
      }

      setRuns(newRuns);
      setWickets(newWickets);
      setBallsBowled(newBalls);
      setResultFlash({ text: flashText, type: flashType });
      setCommentary(getCommentary(outcome));
      setPhase("result");

      // Check game-over conditions after brief display
      setTimeout(() => {
        setResultFlash(null);
        if (newWickets >= TOTAL_WICKETS) {
          setGameOver(true);
          setGameOverReason(`All ${TOTAL_WICKETS} wickets lost — innings complete!`);
        } else if (newBalls >= TOTAL_BALLS) {
          setGameOver(true);
          setGameOverReason("All 2 overs bowled — innings complete!");
        } else {
          setPhase("idle");
        }
      }, 1400);
    }, 550);
  }, [phase, stopSlider, style, ballsBowled, runs, wickets]);

  // ── Restart game ───────────────────────────────────────
  const restartGame = useCallback(() => {
    stopSlider();
    setRuns(0);
    setWickets(0);
    setBallsBowled(0);
    setStyle("aggressive");
    setGameOver(false);
    setGameOverReason("");
    setPhase("idle");
    setBallState("");
    setBatsmanState("");
    setStumpsKnocked(false);
    setResultFlash(null);
    setSliderPos(0);
    sliderPosRef.current = 0;
    sliderDirRef.current = 1;
    setCommentary("New innings! Choose your batting style and press PLAY BALL.");
  }, [stopSlider]);

  // ── Derived UI values ──────────────────────────────────
  const currentSegments = BATTING_STYLES[style].segments;
  const canPlay         = phase === "idle" && !gameOver;
  const canShoot        = phase === "waiting";
  const isAnimating     = phase === "bowling" || phase === "shot" || phase === "result";

  return (
    <div className="app-container">
      {/* ── Header ── */}
      <header className="game-header">
        <div className="game-title">
          Cricket <span>Blaze</span> 🏏
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>
          CS-4032 • WEB PROGRAMMING
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="game-layout">

        {/* LEFT: Scoreboard */}
        <Scoreboard
          runs={runs}
          wickets={wickets}
          ballsBowled={ballsBowled}
        />

        {/* CENTRE: Field */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <CricketField
            ballState={ballState}
            batsmanState={batsmanState}
            stumpsKnocked={stumpsKnocked}
            resultFlash={resultFlash}
          />
        </div>

        {/* RIGHT: Controls */}
        <div className="controls-panel">
          {/* Batting style selector */}
          <div className="style-selector">
            <h3>Batting Style</h3>
            <div className="style-buttons">
              {Object.entries(BATTING_STYLES).map(([key, data]) => (
                <button
                  key={key}
                  className={`style-btn ${key} ${style === key ? "active" : ""}`}
                  onClick={() => { if (!isAnimating && !sliderActive) setStyle(key); }}
                  disabled={isAnimating || sliderActive}
                >
                  {data.label}
                  <span className="style-badge">
                    {key === "aggressive" ? "⚡ High risk" : "🛡 Safe"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Commentary */}
          <div className="commentary-box">
            <div className="commentary-text">
              <span className="comm-prefix">📢 COMMENTARY</span>
              {commentary}
            </div>
          </div>

          {/* Restart */}
          <button className="restart-btn" onClick={restartGame}>
            ↺ Restart Game
          </button>
        </div>

        {/* BOTTOM: Power bar (full width) */}
        <div className="powerbar-area">
          <div className="powerbar-header">
            <span className="powerbar-title">⚡ Power Bar</span>
            <span className={`style-indicator ${style}`}>
              {BATTING_STYLES[style].label}
            </span>
          </div>

          <PowerBar
            segments={currentSegments}
            sliderPos={sliderPos}
            disabled={!canShoot}
          />

          {/* Probability percentage labels */}
          <div className="prob-labels">
            {currentSegments.map((seg, i) => (
              <div
                key={i}
                className="prob-label"
                style={{ width: `${seg.prob * 100}%` }}
              >
                {seg.prob > 0 ? `${(seg.prob * 100).toFixed(0)}%` : ""}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="shoot-btn-wrapper">
            {canPlay && (
              <button className="shoot-btn" onClick={startBall}>
                🏏 PLAY BALL
              </button>
            )}

            {canShoot && (
              <button className="shoot-btn" onClick={playShot}>
                🎯 PLAY SHOT!
              </button>
            )}

            {isAnimating && (
              <div className="waiting-label">
                {phase === "bowling" && "Ball incoming…"}
                {phase === "shot"   && "Playing shot…"}
                {phase === "result" && "Result…"}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Game Over Overlay ── */}
      {gameOver && (
        <GameOverOverlay
          runs={runs}
          wickets={wickets}
          ballsBowled={ballsBowled}
          reason={gameOverReason}
          onRestart={restartGame}
        />
      )}
    </div>
  );
}
