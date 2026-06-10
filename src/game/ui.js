// ============================================================
// HEADLINER — UI: HUD, minimap, dialogue, screens
// ============================================================
import { VIEW_W, VIEW_H, STRINGS } from "./constants.js";
import { ROOMS } from "./world.js";

const FONT = "8px 'Press Start 2P', monospace";
const FONT_BIG = "16px 'Press Start 2P', monospace";

export function text(ctx, str, x, y, color = "#fff", size = FONT, align = "left") {
  ctx.font = size;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";
  ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = "left";
}

export function drawHearts(ctx, hp, maxHp) {
  for (let i = 0; i < maxHp; i++) {
    const x = 8 + i * 13, y = 8;
    ctx.fillStyle = i < hp ? "#e8556d" : "#3a2a30";
    // chunky pixel heart
    ctx.fillRect(x + 1, y, 3, 3);
    ctx.fillRect(x + 6, y, 3, 3);
    ctx.fillRect(x, y + 2, 10, 4);
    ctx.fillRect(x + 2, y + 6, 6, 2);
    ctx.fillRect(x + 4, y + 8, 2, 1);
  }
}

export function drawMinimap(ctx, visited, cur, frame) {
  // bounds of the world grid
  let minX = 99, minY = 99, maxX = -99, maxY = -99;
  for (const key of Object.keys(ROOMS)) {
    const [x, y] = key.split(",").map(Number);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cw = 9, ch = 6;
  const ox = VIEW_W - (maxX - minX + 1) * (cw + 1) - 8;
  const oy = 8;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(ox - 3, oy - 3, (maxX - minX + 1) * (cw + 1) + 5, (maxY - minY + 1) * (ch + 1) + 5);
  for (const key of Object.keys(ROOMS)) {
    if (!visited.has(key)) continue;
    const [x, y] = key.split(",").map(Number);
    const px = ox + (x - minX) * (cw + 1);
    const py = oy + (y - minY) * (ch + 1);
    const isCur = key === cur;
    ctx.fillStyle = isCur && (frame >> 4) % 2 ? "#ffd700" : isCur ? "#fff" : "#5a5a72";
    ctx.fillRect(px, py, cw, ch);
  }
}

export function drawDialogue(ctx, line, more) {
  const h = 56;
  ctx.fillStyle = "rgba(8,8,16,0.92)";
  ctx.fillRect(10, VIEW_H - h - 10, VIEW_W - 20, h);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1;
  ctx.strokeRect(10.5, VIEW_H - h - 9.5, VIEW_W - 21, h - 1);
  wrapText(ctx, line, 20, VIEW_H - h, VIEW_W - 40, "#eee");
  if (more) text(ctx, "▼", VIEW_W - 26, VIEW_H - 22, "#ffd700");
}

export function wrapText(ctx, str, x, y, maxW, color) {
  ctx.font = FONT;
  const words = str.split(" ");
  let line = "", ly = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW) {
      text(ctx, line, x, ly, color);
      line = w;
      ly += 12;
    } else line = test;
  }
  if (line) text(ctx, line, x, ly, color);
  return ly + 12;
}

export function drawBanner(ctx, title, sub, frame) {
  ctx.fillStyle = "rgba(8,8,16,0.85)";
  ctx.fillRect(0, 70, VIEW_W, 70);
  text(ctx, title, VIEW_W / 2, 84, "#ffd700", FONT_BIG, "center");
  if (sub) text(ctx, sub, VIEW_W / 2, 112, "#ddd", FONT, "center");
  if (frame % 60 < 40) text(ctx, "PRESS JUMP / TAP", VIEW_W / 2, 126, "#888", FONT, "center");
}

export function drawBossBar(ctx, hp, maxHp) {
  const w = VIEW_W - 80;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(40, VIEW_H - 18, w, 10);
  ctx.fillStyle = "#8f1d1d";
  ctx.fillRect(41, VIEW_H - 17, (w - 2) * Math.max(hp, 0) / maxHp, 8);
  text(ctx, STRINGS.villain, VIEW_W / 2, VIEW_H - 30, "#e8b0b0", FONT, "center");
}

export function drawTouchButtons(ctx, input) {
  if (!input.touch) return;
  for (const b of input.buttons) {
    ctx.fillStyle = input.down[b.a] ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.13)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.stroke();
    text(ctx, b.label, b.x, b.y - 5, "rgba(255,255,255,0.7)", FONT, "center");
  }
}

export function drawTextScreen(ctx, lines, frame, prompt) {
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const shown = Math.min(lines.length, Math.floor(frame / 22));
  let y = 36;
  for (let i = 0; i < shown; i++) {
    text(ctx, lines[i], VIEW_W / 2, y, i === 0 ? "#ffd700" : "#ccc", FONT, "center");
    y += 16;
  }
  if (shown >= lines.length && frame % 60 < 40)
    text(ctx, prompt, VIEW_W / 2, VIEW_H - 28, "#888", FONT, "center");
  return shown >= lines.length;
}
