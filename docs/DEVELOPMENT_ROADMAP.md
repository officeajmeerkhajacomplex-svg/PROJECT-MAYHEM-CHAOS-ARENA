# Development roadmap — source brief alignment

This roadmap follows the supplied PROJECT MAYHEM: CHAOS ARENA design brief. It is a plan, not a claim that the listed features are already implemented.

## Target experience

- Offline-first single-player first-person arcade shooter for Android and PC.
- Playful, colourful stylized realism; energetic combat, exploration, secrets, gadgets, objectives, and bosses.
- No account, online server, or internet requirement for core gameplay after installation.
- Shared mechanics with platform-adapted touch and keyboard/mouse/controller controls.

## World regions

1. **Jungle Rush** — tropical vegetation, waterfalls, rivers, caves, bridges, ruins, and research facilities; ambushes, exploration, alternate paths, and light stealth.
2. **Neon City** — futuristic streets, rooftops, tunnels, shopping centres, and laboratories; close-quarters combat and rooftop routes.
3. **Dust Valley** — deserts, rocky mountains, outposts, bunkers, and sandstorms; long-range encounters and sniper opportunities.
4. **Deep Blue** — underwater stations, glass tunnels, submerged labs, and marine spaces; restricted visibility and pressure hazards.
5. **Robot Factory** — production machinery, conveyor belts, labs, power stations, and control rooms; moving hazards and machinery puzzles.

Each region is intended to include a critical path, optional routes, secrets, supplies, collectibles, patrols, interactive props, combat arenas, checkpoints, and navigation landmarks.

## Campaign outline

| Mission | Region | Main objective |
|---|---|---|
| 1. First Contact | Training Facility | Learn movement, combat, and equipment |
| 2. Jungle Trouble | Jungle Rush | Rescue missing scouts |
| 3. Broken Signal | Jungle Rush | Find the source of interference |
| 4. City Under Attack | Neon City | Protect an evacuation zone |
| 5. Rooftop Chase | Neon City | Stop an escaping drone |
| 6. Dust and Danger | Dust Valley | Find an underground bunker |
| 7. Deep Blue | Deep Blue | Restore research-station power |
| 8. Factory Zero | Robot Factory | Disable robot production |
| 9. Core Breach | Secret Laboratory | Defeat the final boss and resolve the Chaos Core mystery |

Story premise: the defence AI ORDER has taken control of an automated network after the discovery of the Chaos Core. The player investigates several research and recreation areas and discovers that not all robots share the same motives.

## Modes

- Campaign
- Survival with escalating waves and local high scores
- Training range
- Boss Rush
- Free Play in unlocked regions

## Systems to build

- Player movement: walk, run, sprint, crouch, jump, slide, vault, ladders, swimming, falling/landing, damage recovery, and melee.
- Weapon framework: assault rifles, SMGs, shotguns, snipers, LMGs, pistols, special weapons, and explosives; per-weapon firing, recoil, reload, sounds, effects, handling, and tactical role.
- Combat: hit detection, collision layers, head/body/armour/weak-point damage, falloff, ammunition, health/armour, explosives, and feedback.
- Enemy roster: Scout Bot, Rifle Soldier, Heavy Bot, Sniper Unit, Drone, Shield Guard, Explosive Bot, and Commander.
- AI states: Idle, Patrol, Investigate, Alert, Attack, TakeCover, Search, Retreat, and Disabled. Behaviours include sight/sound detection, investigation, cover, repositioning, flanking, retreat, objective defence, and searching after losing sight.
- Gadgets: Bubble Shield, Shock Mine, Decoy Bot, Gravity Grenade, Jump Pad, Mini Drone, Freeze Bomb, and Repair Kit.
- World interactions: curated breakables, pushable props, doors, barrels, metal impacts, swinging objects, debris, water reactions, lifts, platforms, and machinery.
- Progression: XP, levels, weapon/gadget unlocks, cosmetics, mission ratings, achievements, collectibles, and survival records.
- UI: main menu, HUD, mission/objective display, gadget state, settings, and adjustable mobile HUD.
- Saves: versioned local save data, safe writes, settings, progression, and reliable resume.

## Suggested MVP

The source brief defines the first playable version as one character, one detailed map, five weapons, four enemy types, one boss, three missions, three gadgets, one Survival map, three offline modes, and both Android and PC support.

MVP acceptance: launch offline, complete initial missions, fight enemies, use weapons and gadgets, defeat a boss, save progress, close/reopen, and resume without losing data.

## Phased implementation

1. **Core prototype:** test scene, first-person movement/camera, one weapon, shooting, hit detection, reload, one enemy, PC and touchscreen input.
2. **Combat foundation:** weapon data/switching, health/armour/damage/ammo, enemy AI states, impact effects/audio/feedback, balance.
3. **Environment foundation:** representative map slice, modular assets/materials, lighting/shadows/ambience, breakables/interactions, Android/PC profiling.
4. **Gameplay systems:** objectives/checkpoints, gadgets/pickups, enemy variants/waves, boss encounter, progression/local saves.
5. **Cross-platform polish:** touch UI customization, keyboard/mouse/controller, graphics profiles, memory/loading/render/effects optimization, offline/save tests.
6. **Content expansion:** remaining regions, campaign missions, weapons, enemies, gadgets, bosses, modes, cosmetics, collectibles, achievements.
7. **QA/release:** minimum Android and representative PC testing, offline verification, save/load/pause/checkpoint/interruption testing, stability, performance, usability, and balance.

## Current repository state

The current browser build has a first-person combat prototype and an expanded procedural Jungle Rush environment slice: layered tropical vegetation, a winding river and stone bridge, ancient ruins, a cave entrance, a research outpost, a distant waterfall, animated water, mist, drifting ambient particles, and stylized sunlight beams. It still uses placeholder geometry and has not passed a production art or device-performance review. Generated tileable ground, dirt, bark, stone and water surface maps add mottled natural variation without external downloads. The primitive cylinder/cone/icosahedron tree trunks, branches, crowns and palm silhouettes have been removed; Jungle Rush now uses the Poly Haven Island Tree 02 glTF as its tree model (three placements on desktop, one on touch devices). Poly Haven shrub, fern, grass and rock assets remain optional online enhancements, while the shared low-poly fern understory and other authored environment geometry provide the remaining procedural dressing. Water/foam/mist animation updates tracked effects rather than traversing the entire scene each frame. The combat prototype includes five weapon profiles, five robot prototypes (including a boss), simple enemy pursuit/attack, HUD, and mobile touch controls. A web app manifest and service worker shell cache are included as the first offline-install foundation.

Not yet implemented: the full campaign and regions, mission/checkpoint system, local progression saves, armour, complete enemy state machine, gadgets, final art/models/animations, audio, boss phases, controller support, adjustable settings, and comprehensive offline/device validation.

## Quality gate

A feature is not complete solely because it runs. Verify responsive configurable controls, distinct weapons, readable enemy reactions, clear objectives, useful navigation, combat feedback, mobile layout across aspect ratios, stable performance on real target hardware, complete offline play, and persistent local progress.
