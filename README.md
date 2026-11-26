# DROPZONE — Neon Fall

A playable, browser-based third-person battle-royale prototype built with Three.js. Drop into a procedural neon city, scavenge randomized equipment, fight 24 AI operators, and stay ahead of the shrinking storm.

## Run it

Because the game uses JavaScript modules, serve this directory over HTTP (opening `index.html` directly as a `file://` URL is not supported).

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Three.js is loaded from jsDelivr, so an internet connection is required.

## Controls

- **WASD** move · **Mouse** aim camera · **Left click** fire · **Right click** aim
- **Space** jump · **Shift** sprint · **C** crouch/slide · **R** reload · **E** pick up
- **Esc** pause/resume · **1–5** select inventory slot

Click **Deploy** to begin; click the game again if pointer capture is released. The menu's Operators button opens the field roster.

## What's playable

- Over-the-shoulder camera, jump/sprint/crouch/slide, mouse aiming, hitscan rifle fire, recoil, muzzle flashes, ammo and reload.
- 24 AI rivals that roam, pursue, shoot, and eliminate each other; the remaining-player count, kill feed, elimination count, placement, and victory/defeat states update during the match.
- A timed, shrinking storm damages players outside the safe zone.
- 90 randomized ground pickups plus elevated caches, rarity colors, ammo, shields, and health.
- A handcrafted procedural island with a downtown skyline, factories, warehouses, road network, rooftop details, forested hills, atmospheric lighting, shadows, fog, minimap, and island landmarks.
- Responsive game UI, operator selection panel, pause/resume, sound toggle, and results screen.

## Notes

The island, operators, weapons, and effects are generated at runtime. This is a local single-player game with AI opponents, not an online multiplayer service. Rendering uses real-time WebGL and procedural meshes/materials; no external model assets or build step are needed.
