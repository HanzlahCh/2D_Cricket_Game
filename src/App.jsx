import { useState, useEffect } from "react";
import "./App.css";

const STYLES = {
  aggressive: "Aggressive",
  defensive: "Defensive",
};

const LIMITS = {
  wickets: 2,
  balls: 12,
};

function getOutcome(power, style) {
  const riskBoost = style === "aggressive" ? 8 : -8;
  const finalPower = power + riskBoost;
  if (finalPower > 92) return "W";
  if (finalPower > 80) return 6;
  if (finalPower > 65) return 4;
  if (finalPower > 50) return 2;
  if (finalPower > 35) return 1;
  return 0;
}

export default function App() {
  const [battingStyle, setBattingStyle] = useState("aggressive");
  const [power, setPower] = useState(0);
  const [direction, setDirection] = useState(1);
  const [running, setRunning] = useState(false);

  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);
  const [lastEvent, setLastEvent] = useState("No ball played yet");

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setPower((prev) => {
        if (prev >= 100) {
          setDirection(-1);
          return 100;
        }
        if (prev <= 0) {
          setDirection(1);
          return 0;
        }
        return prev + direction * 4;
      });
    }, 80);
    return () => clearInterval(id);
  }, [running, direction]);

  const isGameOver = wickets >= LIMITS.wickets || balls >= LIMITS.balls;

  const playBall = () => {
    if (isGameOver) return;
    setRunning(false);
    const outcome = getOutcome(power, battingStyle);

    setBalls((prev) => prev + 1);
    if (outcome === "W") {
      setWickets((prev) => prev + 1);
      setLastEvent("Wicket!");
      return;
    }

    setRuns((prev) => prev + outcome);
    setLastEvent(outcome === 0 ? "Dot ball" : `${outcome} run${outcome > 1 ? "s" : ""}`);
  };

  return (
    <div className="app-shell">
      <h1>Cricket Blaze</h1>
      <p>Style, power bar, and score updates.</p>

      <div className="scoreboard">
        <div className="score-item"><span>Runs</span><strong>{runs}</strong></div>
        <div className="score-item"><span>Wickets</span><strong>{wickets}/{LIMITS.wickets}</strong></div>
        <div className="score-item"><span>Balls</span><strong>{balls}/{LIMITS.balls}</strong></div>
      </div>

      <div className="style-picker">
        {Object.entries(STYLES).map(([key, label]) => (
          <button
            key={key}
            className={`style-btn ${battingStyle === key ? "active" : ""}`}
            onClick={() => setBattingStyle(key)}
            disabled={isGameOver}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="power-track">
        <div className="power-fill" style={{ width: `${power}%` }} />
      </div>

      <div className="action-row">
        <button className="action-btn" onClick={() => setRunning(true)} disabled={isGameOver}>Start Bar</button>
        <button className="action-btn" onClick={() => setRunning(false)} disabled={isGameOver}>Stop Bar</button>
        <button className="action-btn play" onClick={playBall} disabled={isGameOver}>Play Ball</button>
      </div>

      <p className="style-status">Last event: {lastEvent}</p>
      {isGameOver && <p className="game-over">Innings complete</p>}
    </div>
  );
}
