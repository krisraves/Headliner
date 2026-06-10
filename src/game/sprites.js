// ============================================================
// HEADLINER — procedural sprites (placeholder art pipeline)
//
// SWAP PATH FOR REAL ART: every entity is drawn through
// drawActor(ctx, kind, state, frame, x, y, flip). When PNG sprite
// sheets exist, replace each draw function body with a
// ctx.drawImage(sheet, sx, sy, fw, fh, ...) slice — the call sites
// never change. Frame sizes assumed below: player 16x24,
// enemies 16x16–24x24, boss 32x40.
// ============================================================

const P = {
  // RUSTY — hoodie comic
  hood: "#7a4a8f", hoodDark: "#5a3370", skin: "#e8b78a", pants: "#3b3b46",
  shoe: "#c9c9d4", mic: "#dadada", micHead: "#444",
  // enemies
  heckler: "#b0413e", hecklerDark: "#7d2c2a",
  drunk: "#3e7cb0", bottle: "#7fc97f",
  thief: "#444455", thiefMask: "#222",
  booker: "#1d1d24", bookerShirt: "#e3dccb", cigar: "#a0522d", ember: "#ff7733",
  contract: "#f4ecd8",
};

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }

// flip helper — draws fn() mirrored around x+w/2 when flip is true
function withFlip(ctx, x, w, flip, fn) {
  if (!flip) return fn(x);
  ctx.save();
  ctx.translate(x + w, 0);
  ctx.scale(-1, 1);
  fn(0);
  ctx.restore();
}

// ---------- RUSTY (player) 16x24 ----------
function drawPlayer(ctx, state, frame, x, y, flip) {
  withFlip(ctx, x, 16, flip, (px) => {
    const bob = state === "run" ? (frame % 2) : 0;
    const legA = state === "run" ? [0, 3, 0, -3][frame % 4] : 0;
    // legs
    rect(ctx, px + 4 + legA * 0.6, y + 18 - bob, 3, 6 + bob, P.pants);
    rect(ctx, px + 9 - legA * 0.6, y + 18 - bob, 3, 6 + bob, P.pants);
    rect(ctx, px + 3 + legA * 0.6, y + 22, 4, 2, P.shoe);
    rect(ctx, px + 9 - legA * 0.6, y + 22, 4, 2, P.shoe);
    if (state === "jump") { // tuck
      rect(ctx, px + 4, y + 18, 3, 4, P.pants);
      rect(ctx, px + 9, y + 18, 3, 4, P.pants);
    }
    // torso (hoodie)
    rect(ctx, px + 3, y + 9 - bob, 10, 10, P.hood);
    rect(ctx, px + 3, y + 16 - bob, 10, 2, P.hoodDark); // hem
    // head + hood up
    rect(ctx, px + 4, y + 1 - bob, 9, 8, P.hood);
    rect(ctx, px + 6, y + 3 - bob, 6, 5, P.skin);
    rect(ctx, px + 10, y + 4 - bob, 1, 1, "#222"); // eye
    // mic arm
    if (state === "attack") {
      rect(ctx, px + 12, y + 10 - bob, 8, 2, P.skin);
      rect(ctx, px + 19, y + 8 - bob, 3, 4, P.micHead);
      rect(ctx, px + 17, y + 10 - bob, 3, 2, P.mic);
    } else {
      rect(ctx, px + 11, y + 11 - bob, 3, 5, P.hoodDark);
      rect(ctx, px + 11, y + 15 - bob, 2, 3, P.mic);   // mic in hand
      rect(ctx, px + 10, y + 17 - bob, 3, 2, P.micHead);
    }
    if (state === "dash") { // speed lines
      rect(ctx, px - 6, y + 8, 5, 1, "#ffffff88");
      rect(ctx, px - 9, y + 14, 7, 1, "#ffffff55");
      rect(ctx, px - 5, y + 20, 4, 1, "#ffffff88");
    }
  });
}

// ---------- HECKLER 16x18 ----------
function drawHeckler(ctx, frame, x, y, flip) {
  withFlip(ctx, x, 16, flip, (px) => {
    const step = [0, 2, 0, -2][frame % 4];
    rect(ctx, px + 3 + step * 0.5, y + 13, 3, 5, P.hecklerDark);
    rect(ctx, px + 9 - step * 0.5, y + 13, 3, 5, P.hecklerDark);
    rect(ctx, px + 2, y + 5, 11, 9, P.heckler);
    rect(ctx, px + 4, y, 8, 6, P.skin);
    rect(ctx, px + 5, y + 2, 2, 1, "#222");
    rect(ctx, px + 9, y + 2, 2, 1, "#222");
    rect(ctx, px + 6, y + 4, 4, 1, "#7d2c2a"); // open mouth — always yelling
    // raised arm
    rect(ctx, px + 12, y + 3 + (frame % 2), 3, 6, P.heckler);
  });
}

// ---------- DRUNK 18x18 ----------
function drawDrunk(ctx, frame, x, y, flip) {
  withFlip(ctx, x, 18, flip, (px) => {
    const sway = Math.sin(frame * 0.4) * 1.5;
    rect(ctx, px + 4, y + 13, 3, 5, "#2a5a82");
    rect(ctx, px + 10, y + 13, 3, 5, "#2a5a82");
    rect(ctx, px + 3 + sway, y + 4, 12, 10, P.drunk);
    rect(ctx, px + 5 + sway, y - 1, 8, 6, P.skin);
    rect(ctx, px + 6 + sway, y + 1, 1, 1, "#222");
    rect(ctx, px + 10 + sway, y + 1, 1, 1, "#222");
    rect(ctx, px + 14 + sway, y + 2, 2, 6, P.bottle); // bottle in hand
  });
}

// ---------- JOKE THIEF 16x14 (flyer) ----------
function drawThief(ctx, frame, x, y, flip) {
  withFlip(ctx, x, 16, flip, (px) => {
    const flap = (frame % 2) * 3;
    rect(ctx, px + 4, y + 3, 8, 8, P.thief);
    rect(ctx, px + 5, y + 4, 6, 3, P.thiefMask);
    rect(ctx, px + 6, y + 5, 1, 1, "#ffdd55");
    rect(ctx, px + 9, y + 5, 1, 1, "#ffdd55");
    rect(ctx, px - 1, y + 2 + flap, 6, 2, P.thief);  // wings (stolen-notebook pages)
    rect(ctx, px + 11, y + 2 + flap, 6, 2, P.thief);
    rect(ctx, px + 6, y + 11, 4, 3, "#f4ecd8");      // the stolen joke
  });
}

// ---------- THE BOOKER 32x40 ----------
function drawBooker(ctx, state, frame, x, y, flip) {
  withFlip(ctx, x, 32, flip, (px) => {
    const breathe = Math.sin(frame * 0.15) * 1;
    // legs
    rect(ctx, px + 8, y + 30, 6, 10, P.booker);
    rect(ctx, px + 18, y + 30, 6, 10, P.booker);
    rect(ctx, px + 6, y + 38, 8, 2, "#000");
    rect(ctx, px + 18, y + 38, 8, 2, "#000");
    // suit body
    rect(ctx, px + 5, y + 12 + breathe, 22, 20, P.booker);
    rect(ctx, px + 13, y + 13 + breathe, 6, 12, P.bookerShirt);
    rect(ctx, px + 14, y + 13 + breathe, 4, 3, "#8f1d1d"); // power tie
    // head
    rect(ctx, px + 9, y + 1 + breathe, 14, 12, P.skin);
    rect(ctx, px + 8, y - 2 + breathe, 16, 5, "#222");     // slick hair
    rect(ctx, px + 12, y + 5 + breathe, 2, 2, "#111");
    rect(ctx, px + 18, y + 5 + breathe, 2, 2, "#111");
    // cigar
    rect(ctx, px + 22, y + 9 + breathe, 7, 2, P.cigar);
    rect(ctx, px + 29, y + 9 + breathe, 2, 2, frame % 20 < 10 ? P.ember : "#ffaa44");
    if (state === "throw") {
      rect(ctx, px + 26, y + 14, 8, 3, P.booker); // arm out
      rect(ctx, px + 33, y + 11, 5, 6, P.contract);
    }
    if (state === "hurt" && frame % 4 < 2) {
      ctx.fillStyle = "#ffffff66";
      ctx.fillRect(px + 5, y - 2, 24, 42);
    }
  });
}

// ---------- NPCs 16x22 ----------
function drawNPC(ctx, id, frame, x, y) {
  const colors = {
    mentor: "#6b6b5a", micer: "#3a7d5d", greenroom: "#8a6d3b",
    stage_manager: "#555566", light_keeper: "#7d3a6e",
  };
  const c = colors[id] || "#666";
  const bob = Math.sin(frame * 0.08) * 1;
  rect(ctx, x + 4, y + 16, 3, 6, "#333");
  rect(ctx, x + 9, y + 16, 3, 6, "#333");
  rect(ctx, x + 3, y + 7 + bob, 10, 10, c);
  rect(ctx, x + 5, y + bob, 7, 7, P.skin);
  rect(ctx, x + 6, y + 2 + bob, 1, 1, "#222");
  rect(ctx, x + 9, y + 2 + bob, 1, 1, "#222");
}

// ---------- pickups / props ----------
function drawRelic(ctx, frame, x, y) {
  const fl = Math.sin(frame * 0.1) * 2;
  // golden mic on a tiny pedestal, glowing
  ctx.fillStyle = "#ffe06633";
  ctx.beginPath();
  ctx.arc(x + 8, y + 8 + fl, 11 + Math.sin(frame * 0.2) * 2, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, x + 6, y + 2 + fl, 5, 5, "#ffd700");
  rect(ctx, x + 7, y + 7 + fl, 3, 6, "#caa53d");
  rect(ctx, x + 5, y + 13 + fl, 7, 2, "#8a7430");
}

function drawSave(ctx, frame, x, y) {
  const glow = Math.sin(frame * 0.12) * 0.5 + 0.5;
  rect(ctx, x + 3, y + 4, 10, 12, "#caa53d");           // notebook
  rect(ctx, x + 4, y + 5, 8, 10, "#f4ecd8");
  rect(ctx, x + 5, y + 7, 6, 1, "#999");
  rect(ctx, x + 5, y + 9, 6, 1, "#999");
  rect(ctx, x + 5, y + 11, 4, 1, "#999");
  ctx.fillStyle = `rgba(255,224,102,${0.15 + glow * 0.2})`;
  ctx.fillRect(x - 2, y - 2, 20, 20);
}

function drawBottle(ctx, x, y) {
  rect(ctx, x, y, 4, 7, P.bottle);
  rect(ctx, x + 1, y - 2, 2, 3, "#5da55d");
}

function drawContract(ctx, frame, x, y) {
  rect(ctx, x, y, 8, 10, P.contract);
  rect(ctx, x + 1, y + 2, 6, 1, "#999");
  rect(ctx, x + 1, y + 4, 6, 1, "#999");
  rect(ctx, x + 1, y + 7, 4, 1, "#b03030"); // the signature line
}

export function drawActor(ctx, kind, state, frame, x, y, flip = false, id = null) {
  switch (kind) {
    case "player": return drawPlayer(ctx, state, frame, x, y, flip);
    case "heckler": return drawHeckler(ctx, frame, x, y, flip);
    case "drunk": return drawDrunk(ctx, frame, x, y, flip);
    case "thief": return drawThief(ctx, frame, x, y, flip);
    case "booker": return drawBooker(ctx, state, frame, x, y, flip);
    case "npc": return drawNPC(ctx, id, frame, x, y);
    case "relic": return drawRelic(ctx, frame, x, y);
    case "save": return drawSave(ctx, frame, x, y);
    case "bottle": return drawBottle(ctx, x, y);
    case "contract": return drawContract(ctx, frame, x, y);
  }
}

// ---------- tiles & backgrounds ----------
const ZONE_THEMES = {
  alley:     { sky1: "#10101e", sky2: "#22182e", brick: "#3a3242", brickLine: "#2a2433", accent: "#e8556d" },
  cellar:    { sky1: "#120d0a", sky2: "#1e1410", brick: "#46352a", brickLine: "#33271e", accent: "#d9a04a" },
  corridor:  { sky1: "#160d14", sky2: "#241224", brick: "#4a2f44", brickLine: "#36222f", accent: "#c45cff" },
  greenroom: { sky1: "#0a140e", sky2: "#102218", brick: "#2e4636", brickLine: "#223428", accent: "#5dd98a" },
  mainroom:  { sky1: "#140a0a", sky2: "#2a0f14", brick: "#52222a", brickLine: "#3a181e", accent: "#ffd700" },
};

export function zoneTheme(zone) { return ZONE_THEMES[zone] || ZONE_THEMES.alley; }

export function drawTile(ctx, ch, x, y, theme, broken) {
  if (ch === "#") {
    rect(ctx, x, y, 16, 16, theme.brick);
    ctx.fillStyle = theme.brickLine;
    ctx.fillRect(x, y + 7, 16, 1);
    ctx.fillRect(x + ((y / 16) % 2 ? 4 : 11), y, 1, 7);
    ctx.fillRect(x + ((y / 16) % 2 ? 11 : 4), y + 8, 1, 8);
  } else if (ch === "B" && !broken) {
    rect(ctx, x, y, 16, 16, "#8a4b3a");
    ctx.fillStyle = "#6b3527";
    ctx.fillRect(x, y + 7, 16, 1);
    ctx.fillRect(x + 7, y, 1, 16);
    ctx.fillStyle = "#a86;";
    ctx.fillStyle = "#aa6f55";
    ctx.fillRect(x + 1, y + 1, 3, 1); // highlight — reads as "different brick"
  } else if (ch === "=") {
    rect(ctx, x, y, 16, 4, "#6b5a3a");
    rect(ctx, x, y, 16, 1, "#8f7a4f");
  } else if (ch === "^") {
    ctx.fillStyle = "#b7c0c8";
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 8, y + 16);
      ctx.lineTo(x + i * 8 + 4, y + 4);
      ctx.lineTo(x + i * 8 + 8, y + 16);
      ctx.fill();
    }
  }
}

// Layered parallax-ish backdrop per zone, drawn behind tiles.
// Replace with hand-drawn PNGs later: draw them here, same signature.
export function drawBackdrop(ctx, zone, W, H, t) {
  const th = zoneTheme(zone);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky1);
  g.addColorStop(1, th.sky2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // distant city / structure silhouettes (deterministic)
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 0; i < 9; i++) {
    const bw = 40 + ((i * 53) % 50);
    const bh = 60 + ((i * 97) % 110);
    ctx.fillRect(i * 56 - 10, H - bh, bw, bh);
  }
  // lit windows flicker
  ctx.fillStyle = th.accent + "55";
  for (let i = 0; i < 14; i++) {
    const wx = (i * 73) % W;
    const wy = H - 30 - ((i * 41) % 90);
    if (((t / 40) | 0) % 7 !== i % 7) ctx.fillRect(wx, wy, 3, 4);
  }
  // floating dust motes
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < 10; i++) {
    const mx = (i * 97 + t * 0.2) % W;
    const my = (i * 53 + Math.sin(t * 0.01 + i) * 20 + H) % H;
    ctx.fillRect(mx, my, 2, 2);
  }
}
