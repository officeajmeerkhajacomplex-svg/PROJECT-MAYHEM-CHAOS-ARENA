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

- Three.js renderer and expanded procedural Jungle Rush environment: river, bridge, ruins, cave, research outpost, waterfall, dense vegetation, animated water, mist, drifting ambience, and sunlight beams.
- Five weapon profiles with ammunition and reload handling.
- Scout, Soldier, Heavy, Exploder, and Boss enemy prototypes.
- Basic pursuit/attack AI, health, score, mission objective, and HUD.
- Touch controls for mobile browsers.
- Web app manifest and service worker cache for an installable, offline-capable shell after the first successful load.

## Source-aligned plan

See [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) for the five-region world plan, nine-mission campaign, gameplay modes, systems, MVP targets, phased roadmap, and acceptance criteria from the supplied design brief.

## Known prototype limitations

This is an early playable foundation, not the complete game. It still uses procedural placeholder geometry and simple enemy behaviour; the Jungle Rush environment is an atmosphere/layout pass, not final art assets. Generated tileable ground, dirt, bark, stone and water surface maps add mottled natural variation without external downloads. The primitive tree/palm silhouettes and generated fern understory have been removed. Jungle Rush is configured to load Island Tree 02, Island Tree 01, shrub_02, shrub_03, fern_02, grass_medium_02, grass_medium_01 and rock assets from repository-local glTF paths under public/assets/polyhaven. A GitHub Actions workflow vendors these CC0 models and declared texture dependencies. The runtime loader no longer calls the Poly Haven API. The bridge, ruins, lab, cave, water and terrain are still authored procedural environment geometry; those structures have not yet been replaced by suitable scanned models. The asset-vendor workflow and model files must be verified in GitHub Actions before the local asset set can be considered complete. Water/foam/mist animation updates tracked effects rather than traversing the entire scene each frame. The campaign, mission/checkpoint system, local progression saves, armour, full enemy state machine, gadgets, final models and animations, audio, boss phases, controller support, adjustable settings, and comprehensive offline/device validation remain to be built. Touch controls and performance have not been verified on real Android devices.

## Technology and licensing

Three.js is installed as an npm dependency (`three`, MIT license). Project-authored application code and procedural placeholder geometry are included here. The service worker caches the same-origin app shell and assets as they are requested; it is not a substitute for testing a production build offline. Poly Haven models are CC0; the live API integration includes the required Powered by Poly Haven credit. Vendored The repository includes a GitHub Actions workflow that vendors a curated set of Poly Haven CC0 glTF models and their texture dependencies into public/assets/polyhaven. The game loads those models locally; the workflow downloads or refreshes the files when its configured paths change. Verify the workflow run and model files before treating the vendored asset library as complete.
