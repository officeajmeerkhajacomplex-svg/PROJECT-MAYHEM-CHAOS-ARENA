# PROJECT MAYHEM: CHAOS ARENA

Browser-first, single-player 3D FPS prototype for desktop and Android browsers.

## Run locally

1. Install Node.js 20.19+ (or 22.12+).
2. Run `npm install`.
3. Run `npm run dev` and open the local Vite URL.

Build for static hosting with `npm run build`; deploy the `dist/` folder.

## Controls

- **PC:** WASD move, mouse look, left click fire, R reload, Shift sprint, 1–5 switch weapon, Escape pause.
- **Android:** left virtual stick moves, drag the right side to look, FIRE shoots, JUMP jumps, RELOAD reloads. Landscape is recommended.

## Current prototype

- Three.js renderer and procedural Jungle Rush arena.
- Five weapon profiles with ammo and reload handling.
- Scout, Soldier, Heavy, Exploder, and Boss enemy prototypes.
- Basic pursuit/attack AI, health, score, mission objective, and HUD.
- Touch controls for mobile browsers.

## Limitations

This is an early playable foundation, not the complete game brief. It currently has placeholder geometry, simple enemy behavior, and no campaign/save system, audio, polished animations, final boss mechanics, or device-performance validation. The five-region campaign, mission structure, gadgets, progression, local saves, and expanded AI remain planned work.

## Technology and licensing

Three.js is installed as an npm dependency (`three`, MIT license). Project-authored application code and procedural placeholder geometry are included here. Check licences and attribution before adding external assets.
