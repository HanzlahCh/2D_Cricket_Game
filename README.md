# Cricket Blaze

Short description
- A small, browser-based 2-over cricket batting game built with React and Vite. The player selects a batting style, presses "Play Ball" to start a ball, then times a slider to attempt runs or avoid wickets.

What this repository implements
- A single-page React app that renders a playable cricket mini-game. The main gameplay is implemented in `src/App.jsx` and the application is mounted from `src/main.jsx`.
- Game rules implemented in code:
  - Innings length: 2 overs (12 balls)
  - Wickets: 2 wickets available
  - Batting styles: `aggressive` and `defensive` with different outcome probability segments
  - Outcomes resolved by sampling a slider position against the chosen style's probability segments (runs or wicket)

How to play (in the browser)
1. Run the dev server (`npm run dev`).
2. Click `PLAY BALL` to start a delivery; a power-slider begins moving.
3. Click `PLAY SHOT!` while the slider is active to capture the slider position.
4. The outcome (0, 1, 2, 3, 4, 6, or W) is resolved and applied to the scoreboard. The innings ends when 12 balls are bowled or 2 wickets fall.

Key implementation files
- `src/main.jsx` — App entry: mounts the React tree into `#root`.
- `src/App.jsx` — Full game implementation: state management, UI components (`Scoreboard`, `PowerBar`, `CricketField`, overlays), game loop, and outcome resolution logic.
- `src/App.css` — Full UI styling (colors, layout, animations, responsive grid).
- `index.html` — HTML shell including Google Fonts and the app root.
- `vite.config.js` — Vite configuration with `@vitejs/plugin-react`.

Tech stack (exact dependencies)
- React 19 (react, react-dom)
- Vite (dev server & build)
- @vitejs/plugin-react (JSX + fast refresh)
- Babel + `babel-plugin-react-compiler` used by the dev toolchain (present in devDependencies)
- ESLint with React-related plugins (devDependencies)

Developer scripts
- `npm run dev` — start Vite dev server (HMR)
- `npm run build` — produce a production bundle
- `npm run preview` — serve the production bundle locally
- `npm run lint` — run ESLint

Notes for maintainers
- The main gameplay logic lives in `src/App.jsx`. Look for constants at the top (`TOTAL_BALLS`, `TOTAL_WICKETS`, `BATTING_STYLES`) to change game difficulty or batting probabilities.
- The slider-based outcome resolution is handled by `resolveOutcome()`; modify `BATTING_STYLES` to tune probabilities.
- UI and animations are CSS-driven in `src/App.css`. Fonts are loaded from Google Fonts in `index.html`.

Run locally
1. Install:

	npm install

2. Start dev server:

	npm run dev

3. Open the app at the URL printed by Vite (usually http://localhost:5173).

Optional improvements
- Add unit tests for `resolveOutcome()` and game-state transitions.
- Add persistence (localStorage) to save high scores.
- Add mobile-specific touch controls for the slider.

Credits
- Game UI, logic, and assets implemented in this repository.

---
This README was updated to accurately reflect the repository's implemented game and files.
