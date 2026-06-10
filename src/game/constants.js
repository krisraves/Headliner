// ============================================================
// HEADLINER — constants & strings
// Everything renameable lives here. Change names freely.
// ============================================================

export const TILE = 16;
export const ROOM_W = 30;   // tiles
export const ROOM_H = 17;   // tiles
export const VIEW_W = ROOM_W * TILE;  // 480
export const VIEW_H = ROOM_H * TILE;  // 272

export const GRAVITY = 0.35;
export const MAX_FALL = 7.5;
export const MOVE_SPEED = 2.0;
export const JUMP_VEL = -6.2;
export const COYOTE_FRAMES = 6;
export const JUMP_BUFFER = 6;
export const DASH_SPEED = 6.0;
export const DASH_FRAMES = 12;
export const DASH_COOLDOWN = 30;
export const INVULN_FRAMES = 60;

export const PLAYER_W = 12;
export const PLAYER_H = 22;

export const START_HP = 5;

export const STRINGS = {
  title: "HEADLINER",
  subtitle: "a comedy metroidvania",
  hero: "RUSTY",
  villain: "THE BOOKER",
  pressStart: "PRESS JUMP / TAP TO START",
  saved: "SETLIST UPDATED. PROGRESS SAVED.",
  gameOver: "YOU BOMBED.",
  continueHint: "PRESS JUMP TO TRY THE BIT AGAIN",
};

export const RELICS = {
  crowd_work: {
    name: "CROWD WORK",
    desc: "Ride the laughter. PRESS JUMP AGAIN IN MIDAIR.",
    lore: "You learn to talk to the room. The room lifts you.",
  },
  tight_five: {
    name: "TIGHT FIVE",
    desc: "Five perfect steps. PRESS DASH TO BLOW THROUGH BRICK.",
    lore: "Polished so hard it breaks walls. Every comic's first weapon.",
  },
  the_light: {
    name: "THE LIGHT",
    desc: "Max confidence +1.",
    lore: "The red light in the back of the room. Most fear it. You befriend it.",
  },
};

// Dialogue per NPC id
export const DIALOGUE = {
  mentor: [
    "Old Mickey: Kid. You sleep behind the Chuckle Hut and you still write every day. I respect it.",
    "Old Mickey: The Booker owns every stage in this town. Nobody headlines without his say-so.",
    "Old Mickey: But the old relics are still out there. Find 'em, and no booker alive can stop you.",
    "Old Mickey: Touch your SETLIST notebooks to save. Trust me. This town eats the unprepared.",
  ],
  micer: [
    "Open Micer: I've done 340 open mics down here. The Booker says I'm 'not ready.'",
    "Open Micer: There's an old relic deeper in the cellar. CROWD WORK. Nobody's been able to reach it.",
    "Open Micer: They say with it, the laughs themselves hold you up. Wild, right?",
  ],
  greenroom: [
    "Road Comic: The Green Rooms twist back on themselves. Like a bit that won't end.",
    "Road Comic: TIGHT FIVE is up top. Five steps, perfectly polished. It breaks brick, kid.",
    "Road Comic: Brick walls. In a comedy club. The Booker thinks he's funny.",
  ],
  stage_manager: [
    "Stage Manager: He's in there. Main room. Friday night slot, the one he never gives anyone.",
    "Stage Manager: ...He made me cut your mic once. I'm sorry. Go ruin his night.",
  ],
  light_keeper: [
    "The Regular: I've sat in the back of every show for thirty years. I've seen everyone bomb.",
    "The Regular: Take THE LIGHT. You've earned the extra confidence.",
  ],
};

export const INTRO_TEXT = [
  "NASHVILLE. 3:07 AM.",
  "The alley behind the CHUCKLE HUT.",
  "",
  "RUSTY has no home, no money, and one notebook",
  "full of jokes that could change everything.",
  "",
  "THE BOOKER owns every stage in town.",
  "He decides who gets the light. Who gets paid.",
  "Who gets to be heard.",
  "",
  "Tonight, Rusty goes looking for the old relics.",
  "Tonight, somebody finally headlines.",
];

export const ENDING_TEXT = [
  "The Booker's contract burns on the stage.",
  "",
  "The room is silent for one full second.",
  "Then it ROARS.",
  "",
  "Friday night. Top of the marquee.",
  "",
  "RUSTY — HEADLINER.",
  "",
  "Thanks for playing the demo.",
];
