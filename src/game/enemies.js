// ============================================================
// HEADLINER — enemies & THE BOOKER
// ============================================================
import { TILE, GRAVITY } from "./constants.js";
import { moveAndCollide, aabb } from "./physics.js";
import { isSolid } from "./world.js";
import { SFX } from "../engine/audio.js";

let nextId = 1;

export function makeEnemy(kind, tx, ty) {
  const base = { id: nextId++, kind, vx: 0, vy: 0, onGround: false, dropThrough: false, hitT: 0, dead: false };
  if (kind === "heckler")
    return { ...base, x: tx * TILE, y: (ty + 1) * TILE - 18, w: 14, h: 18, hp: 2, dir: -1, speed: 0.6, dmgKnock: 1 };
  if (kind === "drunk")
    return { ...base, x: tx * TILE - 1, y: (ty + 1) * TILE - 18, w: 16, h: 18, hp: 3, throwT: 90 + ((tx * 13) % 60) };
  if (kind === "thief")
    return { ...base, x: tx * TILE, y: ty * TILE, w: 14, h: 13, hp: 1, t: tx * 7, baseY: ty * TILE, dir: 1, speed: 0.8 };
}

export function updateEnemy(e, room, broken, player, projectiles) {
  if (e.hitT > 0) e.hitT--;
  if (e.kind === "heckler") {
    // walk; turn at walls and ledges
    e.vx = e.speed * e.dir;
    const res = moveAndCollide(room, e, broken);
    if (res.hitWall) e.dir *= -1;
    if (e.onGround) {
      const aheadX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
      const footTx = Math.floor(aheadX / TILE);
      const footTy = Math.floor((e.y + e.h + 1) / TILE);
      if (!isSolid(room, footTx, footTy, broken)) e.dir *= -1;
    }
  } else if (e.kind === "drunk") {
    moveAndCollide(room, e, broken);
    e.throwT--;
    if (e.throwT <= 0) {
      e.throwT = 150;
      const dx = player.x - e.x;
      if (Math.abs(dx) < 220) {
        const dir = Math.sign(dx) || 1;
        projectiles.push({
          kind: "bottle", x: e.x + 8, y: e.y, w: 5, h: 8,
          vx: dir * (1.4 + Math.abs(dx) / 220), vy: -4.2, fromEnemy: true,
        });
      }
    }
  } else if (e.kind === "thief") {
    e.t++;
    e.x += e.speed * e.dir;
    e.y = e.baseY + Math.sin(e.t * 0.05) * 24;
    const tx = Math.floor((e.dir > 0 ? e.x + e.w + 1 : e.x - 1) / TILE);
    const ty = Math.floor((e.y + e.h / 2) / TILE);
    if (isSolid(room, tx, ty, broken)) e.dir *= -1;
    if (e.x < 4) { e.x = 4; e.dir = 1; }
    if (e.x > 460) { e.x = 460; e.dir = -1; }
  }
}

export function updateProjectile(p, room, broken) {
  if (p.kind === "bottle" || p.kind === "contract") {
    p.vy += GRAVITY * (p.kind === "contract" ? 0.45 : 0.8);
    p.x += p.vx;
    p.y += p.vy;
    const tx = Math.floor((p.x + p.w / 2) / TILE);
    const ty = Math.floor((p.y + p.h / 2) / TILE);
    if (isSolid(room, tx, ty, broken)) return false; // smash
    if (p.y > 300 || p.x < -20 || p.x > 500) return false;
  }
  return true;
}

// ============================================================
// THE BOOKER — 3 patterns: stalk, contract barrage, summon hecklers
// ============================================================
export function makeBooker() {
  return {
    kind: "booker", x: 380, y: 200, w: 30, h: 40,
    vx: 0, vy: 0, onGround: false, dropThrough: false,
    hp: 30, maxHp: 30, hitT: 0, dead: false,
    phase: "intro", t: 0, frame: 0, facing: -1,
    state: "idle",
  };
}

export function updateBooker(b, room, broken, player, projectiles, enemies) {
  b.frame++;
  b.t++;
  if (b.hitT > 0) b.hitT--;
  b.facing = player.x > b.x ? 1 : -1;
  b.state = "idle";

  const enraged = b.hp <= b.maxHp / 2; // phase 2: faster everything
  const rate = enraged ? 0.7 : 1;

  switch (b.phase) {
    case "intro":
      if (b.t > 60) { b.phase = "stalk"; b.t = 0; }
      break;

    case "stalk": { // walk toward player, lunge when close
      b.vx = 0.8 * b.facing * (enraged ? 1.5 : 1);
      if (Math.abs(player.x - b.x) < 60 && b.onGround) {
        b.vy = -5;
        b.vx = 2.5 * b.facing;
      }
      if (b.t > 150 * rate) { b.phase = "barrage"; b.t = 0; }
      break;
    }

    case "barrage": { // stop and hurl contracts in arcs
      b.vx = 0;
      b.state = "throw";
      const interval = enraged ? 22 : 34;
      if (b.t % interval === 0 && b.t < 110) {
        const n = enraged ? 2 : 1;
        for (let i = 0; i < n; i++) {
          projectiles.push({
            kind: "contract", x: b.x + 14, y: b.y + 8, w: 8, h: 10,
            vx: b.facing * (1.2 + Math.random() * 2) + (i ? -b.facing * 0.8 : 0),
            vy: -5 - Math.random() * 1.5, fromEnemy: true,
          });
        }
      }
      if (b.t > 130) { b.phase = enraged ? "summon" : "stalk"; b.t = 0; }
      break;
    }

    case "summon": { // call hecklers from the wings (max 2 alive)
      b.vx = 0;
      if (b.t === 30) {
        const alive = enemies.filter((e) => !e.dead && e.kind === "heckler").length;
        for (let i = alive; i < 2; i++) {
          const spawn = makeEnemy("heckler", i === 0 ? 2 : 27, 14);
          spawn.speed = 0.9;
          enemies.push(spawn);
        }
        SFX.laugh();
      }
      if (b.t > 70) { b.phase = "stalk"; b.t = 0; }
      break;
    }
  }

  moveAndCollide(room, b, broken);
  if (b.hitT > 4) b.state = "hurt";
}

export function enemyTouchesPlayer(e, player) {
  return !e.dead && aabb(e, player);
}
