// ============================================================
// HEADLINER — player (RUSTY)
// ============================================================
import {
  TILE, MOVE_SPEED, JUMP_VEL, COYOTE_FRAMES, JUMP_BUFFER,
  DASH_SPEED, DASH_FRAMES, DASH_COOLDOWN, INVULN_FRAMES,
  PLAYER_W, PLAYER_H, START_HP,
} from "./constants.js";
import { moveAndCollide, overlappedTiles } from "./physics.js";
import { isSpike } from "./world.js";
import { SFX } from "../engine/audio.js";

export class Player {
  constructor() {
    this.w = PLAYER_W;
    this.h = PLAYER_H;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.maxHp = START_HP;
    this.hp = START_HP;
    this.abilities = { crowd_work: false, tight_five: false };
    this.relics = {};
    // timers
    this.coyote = 0; this.jumpBuf = 0;
    this.jumpsUsed = 0;
    this.dashT = 0; this.dashCd = 0;
    this.attackT = 0;
    this.invuln = 0;
    this.dropThrough = false;
    this.frame = 0;
    this.dead = false;
  }

  placeAtTile(tx, ty) {
    this.x = tx * TILE + (TILE - this.w) / 2;
    this.y = (ty + 1) * TILE - this.h;
    this.vx = 0; this.vy = 0;
  }

  get state() {
    if (this.dashT > 0) return "dash";
    if (this.attackT > 0) return "attack";
    if (!this.onGround) return "jump";
    if (Math.abs(this.vx) > 0.2) return "run";
    return "idle";
  }

  // returns hitbox of active mic swing, or null
  attackBox() {
    if (this.attackT <= 0) return null;
    return {
      x: this.facing > 0 ? this.x + this.w : this.x - 18,
      y: this.y + 4,
      w: 18, h: 14,
    };
  }

  hurt(knockDir) {
    if (this.invuln > 0 || this.dead) return false;
    this.hp -= 1;
    this.invuln = INVULN_FRAMES;
    this.vx = 2.5 * knockDir;
    this.vy = -3;
    SFX.hurt();
    if (this.hp <= 0) { this.dead = true; SFX.death(); }
    return true;
  }

  update(input, room, broken) {
    this.frame++;
    if (this.invuln > 0) this.invuln--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.attackT > 0) this.attackT--;
    if (this.dead) { // limp fall
      moveAndCollide(room, this, broken);
      return {};
    }

    const L = input.down.left, R = input.down.right;

    // ----- dash -----
    if (
      input.pressed.dash && this.abilities.tight_five &&
      this.dashT <= 0 && this.dashCd <= 0
    ) {
      this.dashT = DASH_FRAMES;
      this.dashCd = DASH_COOLDOWN;
      SFX.dash();
    }

    if (this.dashT > 0) {
      this.dashT--;
      this.vx = DASH_SPEED * this.facing;
      this.vy = Math.min(this.vy, 0); // float through the dash
      const res = moveAndCollide(room, this, broken, { breakBricks: true });
      if (res.brokeBrick) SFX.brick();
      if (res.hitWall) this.dashT = 0;
      return this._postMove(room, res);
    }

    // ----- run -----
    if (L && !R) { this.vx = -MOVE_SPEED; this.facing = -1; }
    else if (R && !L) { this.vx = MOVE_SPEED; this.facing = 1; }
    else this.vx = 0;

    // ----- jump (coyote + buffer + double) -----
    if (this.onGround) { this.coyote = COYOTE_FRAMES; this.jumpsUsed = 0; }
    else if (this.coyote > 0) this.coyote--;
    if (input.pressed.jump) this.jumpBuf = JUMP_BUFFER;
    else if (this.jumpBuf > 0) this.jumpBuf--;

    if (this.jumpBuf > 0) {
      const maxJumps = this.abilities.crowd_work ? 2 : 1;
      if (this.coyote > 0) {
        this.vy = JUMP_VEL; this.jumpsUsed = 1; this.coyote = 0; this.jumpBuf = 0;
        SFX.jump();
      } else if (this.jumpsUsed < maxJumps && this.jumpsUsed >= 1) {
        this.vy = JUMP_VEL; this.jumpsUsed++; this.jumpBuf = 0;
        SFX.djump();
        this._burstLaugh = true; // game layer spawns "HA HA" particles
      } else if (this.jumpsUsed === 0 && !this.onGround && maxJumps >= 2) {
        // walked off a ledge past coyote — midair jump counts as the double
        this.vy = JUMP_VEL; this.jumpsUsed = 2; this.jumpBuf = 0;
        SFX.djump();
        this._burstLaugh = true;
      }
    }
    // variable jump height
    if (!input.down.jump && this.vy < -2.5) this.vy = -2.5;

    // drop through platforms
    this.dropThrough = input.down.down && input.pressed.jump ? true : input.down.down && this.dropThroughHold;
    if (input.down.down && input.pressed.jump) { this.dropThroughHold = true; this.jumpBuf = 0; this.vy = Math.max(this.vy, 1); }
    if (!input.down.down) this.dropThroughHold = false;
    this.dropThrough = !!this.dropThroughHold;

    // ----- attack -----
    if (input.pressed.attack && this.attackT <= 0) {
      this.attackT = 14;
      SFX.swing();
    }

    const res = moveAndCollide(room, this, broken);
    return this._postMove(room, res);
  }

  _postMove(room, res) {
    const events = { brokeBrick: res.brokeBrick, burstLaugh: this._burstLaugh };
    this._burstLaugh = false;
    // spikes
    if (this.invuln <= 0) {
      for (const { tx, ty } of overlappedTiles(this)) {
        if (isSpike(room, tx, ty)) {
          this.hurt(this.vx >= 0 ? -1 : 1);
          events.spiked = true;
          break;
        }
      }
    }
    return events;
  }
}
