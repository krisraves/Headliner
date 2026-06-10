// ============================================================
// HEADLINER — physics (pure module, node-testable)
// ============================================================
import { TILE, GRAVITY, MAX_FALL } from "./constants.js";
import { isSolid, isPlatform } from "./world.js";

// Move an entity with velocity (vx, vy) against a room's tiles.
// ent: { x, y, w, h, vx, vy, onGround, dropThrough }
// broken: Set of "tx,ty" brick keys already smashed in this room.
// opts.breakBricks: if true (dashing), solid 'B' tiles hit horizontally
//   are added to `broken` instead of stopping the entity.
export function moveAndCollide(room, ent, broken = null, opts = {}) {
  const result = { hitWall: false, hitCeiling: false, landed: false, brokeBrick: false };

  // ----- horizontal -----
  ent.x += ent.vx;
  if (ent.vx !== 0) {
    const dir = Math.sign(ent.vx);
    const edgeX = dir > 0 ? ent.x + ent.w : ent.x;
    const tx = Math.floor(edgeX / TILE);
    const ty0 = Math.floor(ent.y / TILE);
    const ty1 = Math.floor((ent.y + ent.h - 1) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (isSolid(room, tx, ty, broken)) {
        const ch = room.tiles[ty] && room.tiles[ty][tx];
        if (ch === "B" && opts.breakBricks && broken) {
          // smash the whole contiguous brick column
          broken.add(tx + "," + ty);
          let up = ty - 1, dn = ty + 1;
          while (room.tiles[up] && room.tiles[up][tx] === "B") broken.add(tx + "," + up--);
          while (room.tiles[dn] && room.tiles[dn][tx] === "B") broken.add(tx + "," + dn++);
          result.brokeBrick = true;
          continue;
        }
        ent.x = dir > 0 ? tx * TILE - ent.w : (tx + 1) * TILE;
        ent.vx = 0;
        result.hitWall = true;
        break;
      }
    }
  }

  // ----- vertical -----
  ent.vy = Math.min(ent.vy + GRAVITY, MAX_FALL);
  const prevBottom = ent.y + ent.h;
  ent.y += ent.vy;
  ent.onGround = false;

  const tx0 = Math.floor(ent.x / TILE);
  const tx1 = Math.floor((ent.x + ent.w - 1) / TILE);

  if (ent.vy > 0) {
    const ty = Math.floor((ent.y + ent.h - 1) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      const solid = isSolid(room, tx, ty, broken);
      const plat =
        isPlatform(room, tx, ty) &&
        !ent.dropThrough &&
        prevBottom <= ty * TILE; // was fully above the platform last frame
      if (solid || plat) {
        ent.y = ty * TILE - ent.h;
        ent.vy = 0;
        ent.onGround = true;
        result.landed = true;
        break;
      }
    }
  } else if (ent.vy < 0) {
    const ty = Math.floor(ent.y / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (isSolid(room, tx, ty, broken)) {
        ent.y = (ty + 1) * TILE;
        ent.vy = 0;
        result.hitCeiling = true;
        break;
      }
    }
  }

  return result;
}

// Which tiles does this entity overlap? Used for spikes/pickups.
export function overlappedTiles(ent) {
  const out = [];
  const tx0 = Math.floor(ent.x / TILE);
  const tx1 = Math.floor((ent.x + ent.w - 1) / TILE);
  const ty0 = Math.floor(ent.y / TILE);
  const ty1 = Math.floor((ent.y + ent.h - 1) / TILE);
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) out.push({ tx, ty });
  return out;
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
