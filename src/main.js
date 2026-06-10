// ============================================================
// HEADLINER — boot
// ============================================================
import { VIEW_W, VIEW_H } from "./game/constants.js";
import { Input } from "./engine/input.js";
import { SFX } from "./engine/audio.js";
import { Game } from "./game/game.js";

const canvas = document.getElementById("game");
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Integer-ish scaling to fit the window, pixels stay crisp
function fit() {
  const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const scale = s >= 1 ? Math.max(1, Math.floor(s)) : s; // allow shrink on tiny screens
  canvas.style.width = VIEW_W * scale + "px";
  canvas.style.height = VIEW_H * scale + "px";
}
window.addEventListener("resize", fit);
fit();

const input = new Input(canvas);
const game = new Game(input);

// Unlock audio on the first user gesture (browser autoplay policy)
const unlock = () => { SFX.unlock(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
window.addEventListener("pointerdown", unlock);
window.addEventListener("keydown", unlock);

// Fixed-step loop @ 60 ticks, render every animation frame
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function loop(now) {
  acc += Math.min(now - last, 100); // clamp huge tab-switch deltas
  last = now;
  while (acc >= STEP) {
    game.update();
    acc -= STEP;
  }
  game.draw(ctx);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
