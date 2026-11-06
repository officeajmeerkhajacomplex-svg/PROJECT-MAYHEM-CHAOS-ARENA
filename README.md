# PROJECT MAYHEM: CHAOS ARENA

Browser-first, single-player 3D FPS prototype for desktop and Android browsers, built with Three.js and Vite.

## Run locally

1. Install Node.js 20.19+ (or 22.12+).
2. Run `npm install`.
3. Run `npm run dev` and open the local Vite URL.

Build for static hosting with `npm run build`; deploy the `dist/` folder.

## Controls

- **PC:** WASD move, mouse look, left click fire, R reload, Shift sprint, Escape pause.
- **Android:** left virtual stick moves, drag the right side to look, FIRE shoots, JUMP jumps, RELOAD reloads. Landscape is recommended.

## Current prototype

- Three.js renderer and a locally vendored Poly Haven Pine Forest environment: 16 optimized GLB models (84.37 MiB total), Meshopt geometry, WebP textures, and a three-worker progressive loader. The forest uses a clear central combat lane with trees, undergrowth, rocks, and fallen wood placed around it.
- One weapon only: Poly Haven Bolt Action Rifle 7.62, with a 5-round magazine, reserve ammunition, and bolt-action firing cadence.
- Scout, Soldier, Heavy, Exploder, and Boss enemy prototypes.
- Basic pursuit/attack AI, health, score, mission objective, and HUD.
- Touch controls for mobile browsers.
- Web app manifest and service worker cache for an installable, offline-capable shell after the first successful load.

## Source-aligned plan

See [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) for the five-region world plan, nine-mission campaign, gameplay modes, systems, MVP targets, phased roadmap, and acceptance criteria from the supplied design brief.

## Known prototype limitations

This is an early playable foundation, not the complete game. The current arena environment has been switched to the Poly Haven Pine Forest collection. Procedural jungle props, ruins, bridge, cave, lab, waterfall, vines, and foliage meshes were removed from the environment; the arena floor remains a simple plane for gameplay. The game reads a generated collection manifest and loads vendored GLBs from the same origin. Scanned trees are normalized against explicit metre-based reference heights (13.5 m canopy trees, 1.8–3.1 m saplings, sub-metre ground cover); rocks and fallen wood use measured bounds and span targets. The environment now has a gently undulating terrain mesh, a curved dirt trail, a textured stream, natural placement zones, subtle tree/sapling wind motion, and a locally vendored Poly Haven Qwantani Mid Morning (Pure Sky) 2K HDRI sky with image-based environment lighting and matching atmospheric fog. Player and enemy ground heights follow the terrain. No live Poly Haven API or third-party asset server is needed during play. The service worker caches fetched same-origin assets for later offline sessions; the first complete asset download still requires connectivity and browser storage. The Pine Forest vendor workflow completed successfully and committed all 16 optimized GLBs. The models are present in the repository and each is below GitHub's 100 MB per-file limit. Actual browser rendering, console/network checks, and Android device performance still need visual/runtime testing before the environment can be called complete. The first-person rifle viewmodel and transform-based firing/reload animations are now implemented, but its in-game framing, hand placement, bolt movement, muzzle flash, and feel still require visual tuning. The campaign, mission/checkpoint system, local progression saves, armour, full enemy state machine, gadgets, final enemy models and animations, weapon audio, boss phases, controller support, adjustable settings, and comprehensive offline/device validation remain to be built. Touch controls and performance have not been verified on real Android devices.

## Technology and licensing

Three.js is installed as an npm dependency (`three`, MIT license). Project-authored application code and procedural placeholder geometry are included here. The service worker caches the same-origin app shell and assets as they are requested; it is not a substitute for testing a production build offline. Poly Haven models are CC0; the live API integration includes the required Powered by Poly Haven credit. The repository includes a GitHub Actions workflow that vendors the Poly Haven Pine Forest CC0 model collection as optimized, self-contained GLBs into public/assets/polyhaven. ambientCG is a planned source for additional CC0 PBR materials; Kenney's per-pack CC0 3D kits are a planned source for modular structures and props. Only assets with individually verified redistribution terms will be added. The game loads those models locally; the workflow downloads or refreshes the files when its configured paths change. The scene also loads the locally vendored Poly Haven Qwantani Mid Morning (Pure Sky) 2K HDRI (`public/assets/hdri/qwantani_mid_morning_puresky_2k.hdr`) for the 360-degree sky and image-based environment lighting. The only player weapon is Poly Haven's Bolt Action Rifle 7.62 by Mateusz Sadek (CC0), vendored from the 2K glTF source as a 3.90 MiB Meshopt/WebP GLB at `public/assets/weapons/bolt_action_rifle_7_62/model.glb`; the first-person viewmodel adds visible hands, configurable recoil values in `src/main.js`, muzzle flash, bolt cycling where the GLB exposes a bolt node, and a timed reload motion. This HDRI is CC0 and is downloaded by the same asset workflow. Verify the workflow run and model files before treating the vendored asset library as complete.
