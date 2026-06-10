// Run: node test/validate.mjs
import { ROOMS, parseMarkers, isSolid, roomAt, findStart } from "../src/game/world.js";
import { moveAndCollide } from "../src/game/physics.js";
import { ROOM_W, ROOM_H, TILE, JUMP_VEL, PLAYER_W, PLAYER_H } from "../src/game/constants.js";

let errors = 0;
const fail = (msg) => { errors++; console.error("  ✗ " + msg); };
const LEGAL = new Set(["#", "=", "B", "^", ".", "P", "S", "R", "N", "E", "F", "T"]);

console.log("— Room structure —");
let startCount = 0;
for (const [key, room] of Object.entries(ROOMS)) {
  if (room.tiles.length !== ROOM_H) fail(`${key} has ${room.tiles.length} rows (want ${ROOM_H})`);
  room.tiles.forEach((row, y) => {
    if (row.length !== ROOM_W) fail(`${key} row ${y} has ${row.length} cols (want ${ROOM_W})`);
    for (const c of row) if (!LEGAL.has(c)) fail(`${key} row ${y} illegal char '${c}'`);
  });
  const m = parseMarkers(room);
  if (m.start) startCount++;
  if (room.relic && !m.relic) fail(`${key} meta has relic but no R marker`);
  if (m.relic && !room.relic) fail(`${key} has R marker but no relic in meta`);
  if (m.npc && !room.npc) fail(`${key} has N marker but no npc in meta`);
  // grounded markers
  const grounded = [...m.saves, ...(m.relic ? [m.relic] : []), ...(m.npc ? [m.npc] : []), ...(m.start ? [m.start] : [])];
  for (const g of grounded)
    if (!isSolid(room, g.x, g.y + 1)) fail(`${key} marker at (${g.x},${g.y}) is floating`);
  for (const e of m.enemies)
    if (e.kind !== "thief" && !isSolid(room, e.x, e.y + 1))
      fail(`${key} ${e.kind} at (${e.x},${e.y}) is floating`);
}
if (startCount !== 1) fail(`expected exactly 1 'P' start, found ${startCount}`);

console.log("— Edge reciprocity —");
const open = (room, tx, ty) => !isSolid(room, tx, ty);
for (const [key, room] of Object.entries(ROOMS)) {
  const [gx, gy] = key.split(",").map(Number);
  const right = roomAt(gx + 1, gy);
  const below = roomAt(gx, gy + 1);
  const left = roomAt(gx - 1, gy);
  const above = roomAt(gx, gy - 1);
  for (let y = 0; y < ROOM_H; y++) {
    const o = open(room, ROOM_W - 1, y);
    if (right) {
      if (o !== open(right, 0, y)) fail(`${key} right edge row ${y} mismatches neighbor`);
    } else if (o) fail(`${key} right edge row ${y} open to nothing`);
    const ol = open(room, 0, y);
    if (!left && ol) fail(`${key} left edge row ${y} open to nothing`);
  }
  for (let x = 0; x < ROOM_W; x++) {
    const o = open(room, x, ROOM_H - 1);
    if (below) {
      if (o !== open(below, x, 0)) fail(`${key} bottom edge col ${x} mismatches neighbor`);
    } else if (o) fail(`${key} bottom edge col ${x} open to nothing`);
    const ot = open(room, x, 0);
    if (!above && ot) fail(`${key} top edge col ${x} open to nothing`);
  }
}

console.log("— Physics smoke tests —");
function makeEnt(x, y) {
  return { x, y, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, onGround: false, dropThrough: false };
}
// 1. Spawn falls onto the floor of the start room
{
  const s = findStart();
  if (!s) fail("no start found");
  else {
    const room = roomAt(s.gx, s.gy);
    const e = makeEnt(s.tx * TILE + 2, s.ty * TILE - PLAYER_H);
    for (let i = 0; i < 120; i++) moveAndCollide(room, e);
    if (!e.onGround) fail("player never lands in start room");
    const feetRow = Math.round((e.y + e.h) / TILE);
    if (feetRow !== 15) fail(`player rests on row ${feetRow}, expected floor top at 15`);
  }
}
// 2. Single jump clears 3 tiles, fails 5; double clears 5
{
  const room = roomAt(0, 2);
  const sim = (jumps) => {
    const e = makeEnt(5 * TILE, 13 * TILE);
    for (let i = 0; i < 60; i++) moveAndCollide(room, e); // settle
    const startY = e.y;
    e.vy = JUMP_VEL;
    let used = 1, peak = 0;
    for (let i = 0; i < 200; i++) {
      if (used < jumps && e.vy > 0.5) { e.vy = JUMP_VEL; used++; }
      moveAndCollide(room, e);
      peak = Math.max(peak, startY - e.y);
      if (e.onGround && i > 5) break;
    }
    return peak / TILE;
  };
  const single = sim(1), dbl = sim(2);
  console.log(`  single jump peak ≈ ${single.toFixed(2)} tiles, double ≈ ${dbl.toFixed(2)} tiles`);
  if (single < 3.0) fail("single jump can't clear 3 tiles");
  if (single >= 4.6) fail("single jump too strong — breaks 5-tile gates");
  if (dbl < 5.2) fail("double jump can't clear 5-tile gates");
}
// 3. The cellar drop in room 1,2 actually swallows a walker
{
  const room = roomAt(1, 2);
  const e = makeEnt(2 * TILE, 14 * TILE - PLAYER_H);
  for (let i = 0; i < 30; i++) moveAndCollide(room, e); // settle on floor
  e.vx = 2;
  let fell = false;
  for (let i = 0; i < 300; i++) {
    moveAndCollide(room, e);
    if (e.y + e.h > 16.5 * TILE) { fell = true; break; }
  }
  if (!fell) fail("walking right in room 1,2 does not fall into the cellar hole");
}
// 4. Dash breaks the brick column in 5,2
{
  const room = roomAt(5, 2);
  const broken = new Set();
  const e = makeEnt(10 * TILE, 14 * TILE - PLAYER_H);
  for (let i = 0; i < 30; i++) moveAndCollide(room, e);
  e.vx = 6;
  let through = false;
  for (let i = 0; i < 60; i++) {
    e.vx = 6;
    moveAndCollide(room, e, broken, { breakBricks: true });
    if (e.x > 18 * TILE) { through = true; break; }
  }
  if (!through) fail("dash does not break through brick wall in 5,2");
  if (broken.size < 5) fail(`expected >=5 broken bricks, got ${broken.size}`);
  // without dash you stay blocked
  const e2 = makeEnt(10 * TILE, 14 * TILE - PLAYER_H);
  const b2 = new Set();
  for (let i = 0; i < 30; i++) moveAndCollide(room, e2);
  for (let i = 0; i < 120; i++) { e2.vx = 2; moveAndCollide(room, e2, b2, {}); }
  if (e2.x > 15 * TILE) fail("brick wall in 5,2 is passable without dashing");
}

console.log(errors === 0 ? "\nALL CHECKS PASSED ✓ (" + Object.keys(ROOMS).length + " rooms)" : `\n${errors} ERROR(S)`);
process.exit(errors === 0 ? 0 : 1);
