// ============================================================
// HEADLINER — headless smoke test (node test/smoke.mjs)
// Stubs browser APIs, boots the real Game, and simulates play:
// title → intro → walks, jumps, attacks, takes a hit, dies,
// respawns, picks up a relic, transitions rooms. Throws on any
// runtime error in the orchestrator.
// ============================================================

// ---- browser stubs ----
class FakeNode { connect() { return this; } start() {} stop() {} }
class FakeOsc extends FakeNode {
  constructor() { super(); this.frequency = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
}
class FakeGain extends FakeNode {
  constructor() { super(); this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; this.sampleRate = 44100; }
  resume() {}
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  createBufferSource() { return new FakeNode(); }
}
const store = {};
globalThis.window = {
  AudioContext: FakeAudioContext,
  addEventListener() {},
};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

// no-op 2D context: every method swallows calls, every prop is settable
const ctx = new Proxy({}, {
  get(t, k) {
    if (k === "measureText") return () => ({ width: 50 });
    if (k === "createLinearGradient") return () => ({ addColorStop() {} });
    if (!(k in t)) t[k] = (typeof k === "string") ? () => {} : undefined;
    return t[k];
  },
  set(t, k, v) { t[k] = v; return true; },
});

// fake input the test drives directly
const input = {
  down: {}, pressed: {}, touch: false, buttons: [], anyTap: false,
  flush() { this.pressed = {}; this.anyTap = false; },
};
const press = (a) => { input.pressed[a] = true; input.down[a] = true; };
const release = (a) => { input.down[a] = false; };

// ---- boot the real game ----
const { Game } = await import("../src/game/game.js");
const { TILE } = await import("../src/game/constants.js");

const game = new Game(input);
const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(); game.draw(ctx); } };

let pass = 0;
const check = (cond, label) => {
  if (!cond) { console.error("✗ " + label); process.exit(1); }
  console.log("✓ " + label);
  pass++;
};

// title → new game → intro
step(5);
check(game.state === "title", "boots to title");
press("jump"); step(1);
check(game.state === "intro", "jump on title starts new game (intro)");
step(INTRO_FRAMES()); // let typewriter finish
function INTRO_FRAMES() { return 12 * 22 + 30; }
press("jump"); step(1);
check(game.state === "play", "confirm dismisses intro");
check(game.roomKey === "0,2", "starts in THE ALLEY (0,2)");

// walk right and jump for a while — no crashes, stays in bounds
release("jump");
input.down.right = true;
for (let i = 0; i < 240; i++) {
  if (i % 40 === 0) press("jump");
  step(1);
}
input.down.right = false;
check(game.player.hp > 0 || game.state === "gameover", "survived (or died cleanly) walking the alley");
check(game.visited.size >= 1, "visited tracking works");

// talk to the mentor NPC if still in start room; otherwise skip
if (game.roomKey === "0,2" && game.npc) {
  game.player.placeAtTile(game.npc.x, 14);
  step(2);
  press("attack"); step(1);
  if (game.state === "dialogue") {
    check(true, "NPC dialogue opens");
    while (game.state === "dialogue") { press("jump"); step(1); }
    check(game.state === "play", "dialogue advances and closes");
  }
}

// force a room transition: teleport next to the right edge of 0,2's opening
game.enterRoom(0, 2);
game.player.placeAtTile(28, 13);
input.down.right = true;
step(60);
input.down.right = false;
check(game.roomKey === "1,2", "walking off right edge transitions to 1,2");

// relic pickup: drop the player onto the CROWD WORK relic in 4,3
game.enterRoom(4, 3);
check(game.relic && game.relic.id === "crowd_work", "relic present in 4,3");
game.player.placeAtTile(game.relic.x, game.relic.y);
step(3);
check(game.state === "banner", "relic pickup shows banner");
check(game.player.abilities.crowd_work === true, "CROWD WORK ability granted");
press("jump"); step(25); press("jump"); step(1);
check(game.state === "play", "banner dismisses");

// save point: stand on the save in 0,2
game.enterRoom(0, 2);
const s = game.saves[0];
game.player.placeAtTile(s.x, s.y);
game.player.hp = 1;
step(5);
check(game.player.hp === game.player.maxHp, "save point heals");
check(localStorage.getItem("headliner_save_v1") !== null, "save written to localStorage");

// death + respawn
game.player.hp = 1;
game.player.invuln = 0;
game.player.hurt(1);
step(120);
check(game.state === "gameover", "death reaches gameover");
press("jump"); step(2);
check(game.state === "play" && game.player.hp === game.player.maxHp, "respawn at save with full HP");
check(game.roomKey === game.spawn.gx + "," + game.spawn.gy, "respawn room matches spawn");

// boss room: give abilities, enter, trigger, kill
game.player.abilities.tight_five = true;
game.enterRoom(7, 2);
check(game.boss && !game.bossDefeated, "boss spawns in 7,2");
game.player.placeAtTile(6, 13);
input.down.right = true; step(40); input.down.right = false;
check(game.bossActive, "boss fight triggers");
// hammer the boss with i-frame cheats to reach the kill path quickly
game.player.invuln = 999999;
let guard = 0;
while (game.boss && !game.boss.dead && guard++ < 20000) {
  game.player.x = game.boss.x - 14;
  game.player.y = game.boss.y + 8;
  game.player.facing = 1;
  if (game.player.attackT <= 0) press("attack");
  step(1);
}
check(game.boss && game.boss.dead, "boss can be defeated");
step(120);
check(game.state === "ending", "victory reaches ending screen");
step(ENDING_FRAMES());
function ENDING_FRAMES() { return 10 * 22 + 30; }
press("jump"); step(1);
check(game.state === "title", "ending returns to title");
check(game.hasSave, "post-victory save exists (continue available)");

console.log(`\nSMOKE TEST PASSED ✓ (${pass} checks)`);
