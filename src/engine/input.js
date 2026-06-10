// ============================================================
// HEADLINER — input (keyboard + touch)
// Actions: left, right, down, jump, attack, dash, pause
// ============================================================
import { VIEW_W, VIEW_H } from "../game/constants.js";

const KEYMAP = {
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  ArrowDown: "down", s: "down", S: "down",
  " ": "jump", z: "jump", Z: "jump", w: "jump", W: "jump", ArrowUp: "jump",
  x: "attack", X: "attack", j: "attack", J: "attack",
  c: "dash", C: "dash", k: "dash", K: "dash", Shift: "dash",
  Escape: "pause", p: "pause", P: "pause",
};

export class Input {
  constructor(canvas) {
    this.down = {};      // currently held
    this.pressed = {};   // pressed this frame
    this.touch = "ontouchstart" in window;
    this.buttons = [];   // touch button hitboxes (canvas space)
    this._pointers = new Map();

    window.addEventListener("keydown", (e) => {
      const a = KEYMAP[e.key];
      if (!a) return;
      e.preventDefault();
      if (!this.down[a]) this.pressed[a] = true;
      this.down[a] = true;
    });
    window.addEventListener("keyup", (e) => {
      const a = KEYMAP[e.key];
      if (a) this.down[a] = false;
    });

    if (this.touch) this._setupTouch(canvas);
  }

  _setupTouch(canvas) {
    const r = 26, pad = 10;
    this.buttons = [
      { a: "left",   x: pad + r,            y: VIEW_H - pad - r, r, label: "◀" },
      { a: "right",  x: pad + r * 3 + 14,   y: VIEW_H - pad - r, r, label: "▶" },
      { a: "jump",   x: VIEW_W - pad - r,           y: VIEW_H - pad - r, r, label: "A" },
      { a: "attack", x: VIEW_W - pad - r * 3 - 14,  y: VIEW_H - pad - r, r, label: "B" },
      { a: "dash",   x: VIEW_W - pad - r * 2 - 7,   y: VIEW_H - pad - r * 3 - 6, r, label: "D" },
    ];
    const toGame = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
        y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
      };
    };
    const update = () => {
      const held = new Set();
      for (const p of this._pointers.values()) {
        for (const b of this.buttons) {
          const dx = p.x - b.x, dy = p.y - b.y;
          if (dx * dx + dy * dy < (b.r + 10) * (b.r + 10)) held.add(b.a);
        }
      }
      for (const b of this.buttons) {
        const was = this.down[b.a];
        const is = held.has(b.a);
        if (is && !was) this.pressed[b.a] = true;
        this.down[b.a] = is;
      }
    };
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this._pointers.set(e.pointerId, toGame(e));
      this.anyTap = true;
      update();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this._pointers.has(e.pointerId)) {
        this._pointers.set(e.pointerId, toGame(e));
        update();
      }
    });
    const up = (e) => { this._pointers.delete(e.pointerId); update(); };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }

  // call at end of each frame
  flush() {
    this.pressed = {};
    this.anyTap = false;
  }
}
