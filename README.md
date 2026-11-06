# PROJECT MAYHEM: CHAOS ARENA

Browser-first, single-player 3D FPS prototype for desktop and Android browsers, built with Three.js and Vite.

## Run locally

1. Install Node.js 20.19+ (or 22.12+).
2. Run `npm install`.
3. Run `npm run dev` and open the local Vite URL.

Build for static hosting with `npm run build`; deploy the `dist/` folder.

## Controls

- **PC:** WASD move, mouse look, left click fire, R reload, Shift sprint, 1–5 switch weapon, Escape pause.
- **Android:** left virtual stick moves, drag the right side to look, FIRE shoots, JUMP jumps, RELOAD reloads. Landscape is recommended.

## Current prototype

- Three.js renderer and Poly Haven Pine Forest collection environment, loaded from repository-local glTF models with their texture dependencies.
- Five weapon profiles with ammunition and reload handling.
- Scout, Soldier, Heavy, Exploder, and Boss enemy prototypes.
- Basic pursuit/attack AI, health, score, mission objective, and HUD.
- Touch controls for mobile browsers.
- Web app manifest and service worker cache for an installable, offline-capable shell after the first successful load.

## Source-aligned plan

See [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) for the five-region world plan, nine-mission campaign, gameplay modes, systems, MVP targets, phased roadmap, and acceptance criteria from the supplied design brief.

## Known prototype limitations

This is an early playable foundation, not the complete game. The current arena environment has been switched to the Poly Haven Pine Forest collection. Procedural jungle props, ruins, bridge, cave, lab, waterfall, vines, and foliage meshes were removed from the environment; the arena floor remains a simple plane for gameplay. The game reads a generated collection manifest and loads each vendored glTF model with its local texture dependencies, then scatters models by detected asset type. The Pine Forest workflow and model files still need successful download, repository verification, and visual testing in the running game before this environment can be called complete. The campaign, mission/checkpoint system, local progression saves, armour, full enemy state machine, gadgets, final models and animations, audio, boss phases, controller support, adjustable settings, and comprehensive offline/device validation remain to be built. Touch controls and performance have not been verified on real Android devices.

## Technology and licensing

Three.js is installed as an npm dependency (`three`, MIT license). Project-authored application code and procedural placeholder geometry are included here. The service worker caches the same-origin app shell and assets as they are requested; it is not a substitute for testing a production build offline. Poly Haven models are CC0; the live API integration includes the required Powered by Poly Haven credit. The repository includes a GitHub Actions workflow that vendors the Poly Haven Pine Forest CC0 glTF collection and its texture dependencies into public/assets/polyhaven. The game loads those models locally; the workflow downloads or refreshes the files when its configured paths change. Verify the workflow run and model files before treating the vendored asset library as complete.
