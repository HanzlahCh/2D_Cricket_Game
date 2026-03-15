import { useState } from "react";
import "./App.css";

const STYLES = {
  aggressive: "Aggressive",
  defensive: "Defensive",
};

export default function App() {
  const [battingStyle, setBattingStyle] = useState("aggressive");

  return (
    <div className="app-shell">
      <h1>Cricket Blaze</h1>
      <p>Choose your batting style.</p>

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
    </div>
  );
}
