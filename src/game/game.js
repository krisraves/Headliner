// ============================================================
// HEADLINER — game orchestrator
// States: title → intro → play ⇄ (dialogue | banner) → gameover / ending
// ============================================================
import { TILE, VIEW_W, VIEW_H, STRINGS, RELICS, DIALOGUE, INTRO_TEXT, ENDING_TEXT } from "./constants.js";
import { roomAt, parseMarkers, findStart } from "./world.js";
import { Player } from "./player.js";
import { makeEnemy, updateEnemy, updateProjectile, makeBooker, updateBooker, enemyTouchesPlayer } from "./enemies.js";
import { aabb } from "./physics.js";
import { saveGame, loadGame } from "./save.js";
import { SFX } from "../engine/audio.js";
import { drawActor, drawTile, drawBackdrop, zoneTheme } from "./sprites.js";
import {
  text, drawHearts, drawMinimap, drawDialogue, drawBanner,
  drawBossBar, drawTouchButtons, drawTextScreen,
} from "./ui.js";

const BOSS_ROOM = "7,2";

export class Game {
  constructor(input) {
    this.input = input;
    this.state = "title";
    this.frame = 0;        // global frame counter
    this.stateFrame = 0;   // frames since entering current state
    this.hasSave = !!loadGame();
  }

  // ---------- state helpers ----------
  setState(s) { this.state = s; this.stateFrame = 0; }

  // ---------- new game / continue ----------
  startNew() {
    const st = findStart();
    this.player = new Player();
    this.collected = new Set();          // relic ids picked up
    this.visited = new Set();
    this.brokenByRoom = new Map();       // roomKey -> Set("tx,ty")
    this.bossDefeated = false;
    this.spawn = { gx: st.gx, gy: st.gy, tx: st.tx, ty: st.ty };
    this.player.placeAtTile(st.tx, st.ty);
    this.enterRoom(st.gx, st.gy);
    this.setState("intro");
  }

  startFromSave() {
    const d = loadGame();
    if (!d) return this.startNew();
    this.player = new Player();
    this.player.abilities = { ...this.player.abilities, ...d.abilities };
    this.player.maxHp = d.maxHp;
    this.player.hp = d.maxHp;
    this.collected = new Set(d.relics || []);
    this.visited = new Set(d.visited || []);
    this.brokenByRoom = new Map();
    this.bossDefeated = !!d.bossDefeated;
    this.spawn = d.spawn;
    this.player.placeAtTile(d.spawn.tx, d.spawn.ty);
    this.enterRoom(d.spawn.gx, d.spawn.gy);
    this.setState("play");
  }

  save() {
    saveGame({
      abilities: this.player.abilities,
      relics: [...this.collected],
      maxHp: this.player.maxHp,
      spawn: this.spawn,
      bossDefeated: this.bossDefeated,
      visited: [...this.visited],
    });
    this.hasSave = true;
  }

  // ---------- room management ----------
  brokenFor(key) {
    if (!this.brokenByRoom.has(key)) this.brokenByRoom.set(key, new Set());
    return this.brokenByRoom.get(key);
  }

  enterRoom(gx, gy) {
    this.gx = gx; this.gy = gy;
    this.roomKey = gx + "," + gy;
    this.room = roomAt(gx, gy);
    this.broken = this.brokenFor(this.roomKey);
    this.visited.add(this.roomKey);

    const m = parseMarkers(this.room);
    this.saves = m.saves;
    this.relic = m.relic && !this.collected.has(m.relic.id) ? m.relic : null;
    this.npc = m.npc;
    this.enemies = m.enemies.map((e) => makeEnemy(e.kind, e.x, e.y));
    this.projectiles = [];
    this.particles = [];
    this.roomBanner = 110; // room name flash

    // boss room
    this.boss = null;
    this.bossActive = false;
    if (this.roomKey === BOSS_ROOM && !this.bossDefeated) this.boss = makeBooker();
  }

  // ---------- particles ----------
  burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++)
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5,
        life: 20 + Math.random() * 14, color,
      });
  }
  laughBurst(x, y) {
    for (let i = 0; i < 3; i++)
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18, y: y + 6,
        vx: (Math.random() - 0.5) * 0.8, vy: -0.8 - Math.random() * 0.6,
        life: 36, color: "#ffd700", label: "HA",
      });
  }

  // ---------- update ----------
  update() {
    this.frame++; this.stateFrame++;
    const inp = this.input;
    const confirm = inp.pressed.jump || inp.anyTap;

    switch (this.state) {
      case "title":
        if (this.hasSave && inp.pressed.attack) { SFX.pickup(); this.startNew(); break; }
        if (confirm) { SFX.save(); this.hasSave ? this.startFromSave() : this.startNew(); }
        break;

      case "intro":
        if (this._textDone && confirm) { SFX.save(); this.setState("play"); }
        break;

      case "ending":
        if (this._textDone && confirm) { this.setState("title"); this.hasSave = !!loadGame(); }
        break;

      case "gameover":
        if (this.stateFrame > 45 && confirm) {
          // respawn at last save point with full health
          this.player.dead = false;
          this.player.hp = this.player.maxHp;
          this.player.invuln = 60;
          this.player.placeAtTile(this.spawn.tx, this.spawn.ty);
          this.enterRoom(this.spawn.gx, this.spawn.gy);
          this.setState("play");
        }
        break;

      case "dialogue": {
        if (inp.pressed.jump || inp.pressed.attack || inp.anyTap) {
          this.dlgIndex++;
          if (this.dlgIndex >= this.dlgLines.length) this.setState("play");
          else SFX.swing();
        }
        break;
      }

      case "banner":
        if (this.stateFrame > 20 && confirm) { this.setState("play"); }
        break;

      case "play":
        this.updatePlay();
        break;
    }
    inp.flush();
  }

  updatePlay() {
    const p = this.player;
    const inp = this.input;

    // ----- player -----
    const ev = p.update(inp, this.room, this.broken);
    if (ev.burstLaugh) { this.laughBurst(p.x + p.w / 2, p.y + p.h); SFX.laugh(); }
    if (ev.brokeBrick) this.burst(p.x + p.w / 2 + p.facing * 14, p.y + p.h / 2, "#8a4b3a", 10);

    if (p.dead) { this.setState("gameover"); return; }

    // ----- room transitions -----
    // Out-of-bounds tiles are virtually solid, so the player can only be
    // flush against a screen edge inside a carved opening. Flush = exit.
    if (!this.bossActive) {
      if (p.x <= 0 && roomAt(this.gx - 1, this.gy)) {
        this.enterRoom(this.gx - 1, this.gy);
        p.x = VIEW_W - p.w - 1;
      } else if (p.x + p.w >= VIEW_W && roomAt(this.gx + 1, this.gy)) {
        this.enterRoom(this.gx + 1, this.gy);
        p.x = 1;
      } else if (p.y + p.h >= VIEW_H && roomAt(this.gx, this.gy + 1)) {
        this.enterRoom(this.gx, this.gy + 1);
        p.y = 1; // continue falling into the room below
      } else if (p.y <= 0 && roomAt(this.gx, this.gy - 1)) {
        this.enterRoom(this.gx, this.gy - 1);
        p.y = VIEW_H - p.h - 2;
        p.vy = -6.2; // the ceiling clamp ate the jump — restore the rise
        p.onGround = false;
      }
    } else {
      p.x = Math.max(4, Math.min(VIEW_W - p.w - 4, p.x)); // arena walls
    }

    // ----- boss trigger -----
    if (this.boss && !this.bossActive && !this.boss.dead && p.x > 70) {
      this.bossActive = true;
      SFX.bossHit();
    }

    // ----- enemies -----
    for (const e of this.enemies) {
      if (e.dead) continue;
      updateEnemy(e, this.room, this.broken, p, this.projectiles);
      if (enemyTouchesPlayer(e, p)) p.hurt(p.x < e.x ? -1 : 1);
    }
    // ----- boss -----
    if (this.boss && this.bossActive && !this.boss.dead) {
      updateBooker(this.boss, this.room, this.broken, p, this.projectiles, this.enemies);
      if (aabb(this.boss, p)) p.hurt(p.x < this.boss.x ? -1 : 1);
    }

    // ----- player attack vs enemies / boss -----
    const box = p.attackBox();
    if (box) {
      for (const e of this.enemies) {
        if (!e.dead && e.hitT <= 0 && aabb(box, e)) {
          e.hp -= 1; e.hitT = 20;
          e.vx = p.facing * 2;
          SFX.hitEnemy();
          this.burst(e.x + e.w / 2, e.y + e.h / 2, "#fff", 5);
          if (e.hp <= 0) { e.dead = true; this.burst(e.x + e.w / 2, e.y + e.h / 2, "#e8556d", 12); }
        }
      }
      const b = this.boss;
      if (b && this.bossActive && !b.dead && b.hitT <= 0 && aabb(box, b)) {
        b.hp -= 1; b.hitT = 18;
        SFX.bossHit();
        this.burst(b.x + b.w / 2, b.y + 10, "#ffd700", 8);
        if (b.hp <= 0) {
          b.dead = true;
          this.bossActive = false;
          this.bossDefeated = true;
          this.burst(b.x + b.w / 2, b.y + b.h / 2, "#ffd700", 30);
          SFX.pickup();
          this.save();
          this._endT = this.frame + 90;
        }
      }
    }
    if (this.bossDefeated && this._endT && this.frame >= this._endT) {
      this._endT = null;
      this.setState("ending");
      return;
    }

    // ----- projectiles -----
    this.projectiles = this.projectiles.filter((pr) => {
      const alive = updateProjectile(pr, this.room, this.broken);
      if (!alive) { this.burst(pr.x, pr.y, "#b7c0c8", 4); return false; }
      if (pr.fromEnemy && aabb(pr, p)) {
        if (p.hurt(pr.vx >= 0 ? 1 : -1)) this.burst(pr.x, pr.y, "#b7c0c8", 5);
        return false;
      }
      return true;
    });

    // ----- relic pickup -----
    if (this.relic) {
      const rbox = { x: this.relic.x * TILE, y: this.relic.y * TILE, w: 16, h: 16 };
      if (aabb(rbox, p)) {
        const id = this.relic.id;
        this.collected.add(id);
        if (id === "the_light") { p.maxHp += 1; p.hp = p.maxHp; }
        else p.abilities[id] = true;
        this.relic = null;
        SFX.pickup();
        const r = RELICS[id];
        this.bannerTitle = r.name;
        this.bannerSub = r.desc;
        this.setState("banner");
      }
    }

    // ----- save points -----
    let onSave = false;
    for (const s of this.saves) {
      const sbox = { x: s.x * TILE, y: s.y * TILE - 4, w: 16, h: 20 };
      if (aabb(sbox, p)) {
        onSave = true;
        if (!this._savedHere) {
          this._savedHere = true;
          p.hp = p.maxHp;
          this.spawn = { gx: this.gx, gy: this.gy, tx: s.x, ty: s.y };
          this.save();
          SFX.save();
          this.toast = STRINGS.saved;
          this.toastT = 120;
        }
      }
    }
    if (!onSave) this._savedHere = false;

    // ----- NPC dialogue -----
    if (this.npc) {
      const nbox = { x: this.npc.x * TILE - 6, y: this.npc.y * TILE - 8, w: 28, h: 30 };
      this.npcNear = aabb(nbox, p);
      if (this.npcNear && this.input.pressed.attack) {
        this.dlgLines = DIALOGUE[this.npc.id] || ["..."];
        this.dlgIndex = 0;
        this.setState("dialogue");
      }
    }

    // ----- particles -----
    this.particles = this.particles.filter((pt) => {
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.label ? -0.01 : 0.12; pt.life--;
      return pt.life > 0;
    });

    if (this.toastT > 0) this.toastT--;
    if (this.roomBanner > 0) this.roomBanner--;
  }

  // ---------- draw ----------
  draw(ctx) {
    switch (this.state) {
      case "title": return this.drawTitle(ctx);
      case "intro":
        this._textDone = drawTextScreen(ctx, INTRO_TEXT, this.stateFrame, STRINGS.pressStart);
        return;
      case "ending":
        this._textDone = drawTextScreen(ctx, ENDING_TEXT, this.stateFrame, "PRESS JUMP / TAP");
        return;
    }
    // world states share the play renderer
    this.drawWorld(ctx);
    if (this.state === "dialogue")
      drawDialogue(ctx, this.dlgLines[this.dlgIndex], this.dlgIndex < this.dlgLines.length - 1);
    if (this.state === "banner")
      drawBanner(ctx, this.bannerTitle, this.bannerSub, this.stateFrame);
    if (this.state === "gameover") {
      ctx.fillStyle = "rgba(10,4,8,0.78)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, STRINGS.gameOver, VIEW_W / 2, 100, "#e8556d", "16px 'Press Start 2P', monospace", "center");
      if (this.stateFrame > 45 && this.stateFrame % 60 < 40)
        text(ctx, STRINGS.continueHint, VIEW_W / 2, 140, "#aaa", "8px 'Press Start 2P', monospace", "center");
    }
    drawTouchButtons(ctx, this.input);
  }

  drawTitle(ctx) {
    drawBackdrop(ctx, "mainroom", VIEW_W, VIEW_H, this.frame);
    // marquee
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(60, 60, VIEW_W - 120, 86);
    ctx.strokeStyle = "#ffd700";
    ctx.strokeRect(60.5, 60.5, VIEW_W - 121, 85);
    // chasing marquee bulbs
    for (let i = 0; i < 34; i++) {
      const t = i / 34;
      const on = (i + (this.frame >> 3)) % 4 === 0;
      ctx.fillStyle = on ? "#ffe066" : "#5a4a20";
      const px = 60 + t * (VIEW_W - 120);
      ctx.fillRect(px, 56, 3, 3);
      ctx.fillRect(px, 148, 3, 3);
    }
    text(ctx, STRINGS.title, VIEW_W / 2, 80, "#ffd700", "24px 'Press Start 2P', monospace", "center");
    text(ctx, STRINGS.subtitle, VIEW_W / 2, 114, "#ccc", "8px 'Press Start 2P', monospace", "center");
    if (this.frame % 60 < 40) {
      const main = this.hasSave ? "PRESS JUMP / TAP — CONTINUE" : STRINGS.pressStart;
      text(ctx, main, VIEW_W / 2, 180, "#fff", "8px 'Press Start 2P', monospace", "center");
    }
    if (this.hasSave)
      text(ctx, "PRESS ATTACK (X) — NEW GAME", VIEW_W / 2, 200, "#777", "8px 'Press Start 2P', monospace", "center");
    drawActor(ctx, "player", "idle", this.frame, VIEW_W / 2 - 8, 218, false);
    drawTouchButtons(ctx, this.input);
  }

  drawWorld(ctx) {
    const room = this.room;
    const theme = zoneTheme(room.zone);
    drawBackdrop(ctx, room.zone, VIEW_W, VIEW_H, this.frame);

    // tiles
    for (let y = 0; y < room.tiles.length; y++)
      for (let x = 0; x < room.tiles[y].length; x++) {
        const ch = room.tiles[y][x];
        if (ch === "." ) continue;
        drawTile(ctx, ch, x * TILE, y * TILE, theme, ch === "B" && this.broken.has(x + "," + y));
      }

    // props
    for (const s of this.saves) drawActor(ctx, "save", null, this.frame, s.x * TILE, s.y * TILE);
    if (this.relic) drawActor(ctx, "relic", null, this.frame, this.relic.x * TILE, this.relic.y * TILE);
    if (this.npc) {
      drawActor(ctx, "npc", null, this.frame, this.npc.x * TILE, this.npc.y * TILE - 6, false, this.npc.id);
      if (this.npcNear && this.state === "play")
        text(ctx, "X", this.npc.x * TILE + 5, this.npc.y * TILE - 18, "#ffd700");
    }

    // actors
    for (const e of this.enemies)
      if (!e.dead) drawActor(ctx, e.kind, e.hitT > 14 ? "hurt" : "walk", this.frame, e.x, e.y, e.dir ? e.dir < 0 : e.vx < 0);
    if (this.boss && !this.boss.dead)
      drawActor(ctx, "booker", this.boss.state, this.frame, this.boss.x, this.boss.y, this.boss.facing < 0);

    // player (blink during i-frames)
    const p = this.player;
    if (!(p.invuln > 0 && (this.frame >> 2) % 2))
      drawActor(ctx, "player", p.state, this.frame, p.x - 2, p.y - 2, p.facing < 0);
    // mic swing arc
    const box = p.attackBox();
    if (box) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(box.x, box.y + 2, box.w, 3);
      ctx.fillStyle = "#ddd";
      ctx.fillRect(p.facing > 0 ? box.x + box.w - 4 : box.x, box.y, 4, 6);
    }

    // projectiles
    for (const pr of this.projectiles)
      drawActor(ctx, pr.kind, null, this.frame, pr.x, pr.y);

    // particles
    for (const pt of this.particles) {
      if (pt.label) text(ctx, pt.label, pt.x, pt.y, pt.color);
      else { ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y, 2, 2); }
    }

    // HUD
    drawHearts(ctx, p.hp, p.maxHp);
    drawMinimap(ctx, this.visited, this.roomKey, this.frame);
    if (this.roomBanner > 0 && this.state === "play")
      text(ctx, room.name, VIEW_W / 2, 30, "#ffd700", "8px 'Press Start 2P', monospace", "center");
    if (this.toastT > 0)
      text(ctx, this.toast, VIEW_W / 2, 44, "#9fe89f", "8px 'Press Start 2P', monospace", "center");
    if (this.boss && this.bossActive && !this.boss.dead)
      drawBossBar(ctx, this.boss.hp, this.boss.maxHp);
  }
}
