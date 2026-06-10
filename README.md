# HEADLINER — a comedy metroidvania

A homeless open-micer named **RUSTY** hunts the lost relics of comedy to dethrone
**THE BOOKER**, the man who owns every stage in town. 20 rooms, 3 relics, 1 boss.

Pure static site. No build step, no dependencies, no asset files — everything
(sprites, backgrounds, sound) is generated in code.

## Play it locally

ES modules won't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# or: npx serve
```

Then open http://localhost:8000

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework Preset: **Other**. Leave build command and output directory empty.
4. Deploy. That's it — it's just static files.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | ← → / A D | ◀ ▶ |
| Jump / double jump | Z / Space / W / ↑ | A |
| Mic swing (attack / talk) | X / J | B |
| Dash (breaks brick) | C / K / Shift | D |
| Drop through platform | ↓ + Jump | — |

- **CROWD WORK** (cellar) grants double jump.
- **TIGHT FIVE** (green rooms) grants a dash that smashes `B` brick walls.
- **THE LIGHT** (optional, the alley) grants +1 max HP.
- Touch the glowing **SETLIST** notebooks to heal and save (localStorage).

## Testing

```bash
node test/validate.mjs   # world structure + physics gates
node test/smoke.mjs      # boots the real game headless, plays the critical path
```

`validate.mjs` checks all 20 rooms: dimensions, legal tiles, reciprocal door openings
between neighboring rooms, sealed outer walls, grounded markers — plus physics
smoke tests (jump heights, the dash actually breaks the boss-gate wall, etc.).
The smoke test simulates title → relic pickup → save → death → respawn → boss kill → ending. Run both after any change.

## Renaming everything

All names, dialogue, intro/ending text live in `src/game/constants.js`
(`STRINGS`, `RELICS`, `DIALOGUE`, `INTRO_TEXT`, `ENDING_TEXT`). Change freely.

## Swapping in real art later

Procedural drawing is isolated behind three functions in `src/game/sprites.js`:

- `drawActor(ctx, kind, state, frame, x, y, flip, id)` — characters & pickups
- `drawTile(ctx, ch, x, y, theme, broken)` — tiles
- `drawBackdrop(ctx, zone, W, H, t)` — per-zone backgrounds

To use PNG sprite sheets / hand-drawn backgrounds, replace the bodies of those
functions with `ctx.drawImage(...)` calls. Nothing else in the codebase needs
to change.

## Map editing

Rooms are ASCII grids in `src/game/world.js` (30×17 chars). Legend at the top
of the file. Conventions: side doors at rows 12–14 (low) or 4–6 (high),
vertical shafts 3 columns wide. Always re-run the validator after editing.

## Repo layout

```
index.html
src/
  main.js              boot, canvas scaling, game loop
  engine/
    input.js           keyboard + touch
    audio.js           procedural WebAudio SFX
  game/
    constants.js       tuning + all strings (rename things here)
    world.js           20 hand-authored rooms + tile helpers
    physics.js         AABB tile collision
    player.js          Rusty
    enemies.js         hecklers, drunks, joke thieves, The Booker
    sprites.js         all drawing (swap art here)
    ui.js              HUD, minimap, dialogue, screens
    game.js            orchestrator / state machine
    save.js            localStorage
test/
  validate.mjs         world + physics validation (node)
```
