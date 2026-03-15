import { useState, useEffect } from "react";
import "./App.css";

const STYLES = {
  aggressive: "Aggressive",
  defensive: "Defensive",
};

export default function App() {
  const [battingStyle, setBattingStyle] = useState("aggressive");
  const [power, setPower] = useState(0);
  const [direction, setDirection] = useState(1);
  const [running, setRunning] = useState(false);

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

  return (
    <div className="app-shell">
      <h1>Cricket Blaze</h1>
      <p>Choose style and control the power bar.</p>

      <div className="style-picker">
        {Object.entries(STYLES).map(([key, label]) => (
          <button
            key={key}
            className={`style-btn ${battingStyle === key ? "active" : ""}`}
            onClick={() => setBattingStyle(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="style-status">Selected: {STYLES[battingStyle]}</p>

      <div className="power-track">
        <div className="power-fill" style={{ width: `${power}%` }} />
      </div>

      <div className="action-row">
        <button className="action-btn" onClick={() => setRunning(true)}>Start Bar</button>
        <button className="action-btn" onClick={() => setRunning(false)}>Stop Bar</button>
      </div>
    </div>
  );
}
