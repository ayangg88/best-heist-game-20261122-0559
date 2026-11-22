// "The Gilded Cage" — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, wall: 26 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 105,
  runSpeed: 285,
  noiseRadius: 150, // running is heard this far away
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 88,
  chaseSpeed: 175,
  investigateSpeed: 130,
  visionRange: 235,
  visionHalfAngle: 0.61, // ~35 degrees each side
  catchDistance: 26,
  suspicionPerSecond: 34, // alarm climb while a guard sees Wren
  investigateTime: 3,
};

export const CAMERA = {
  range: 305,
  halfAngle: 0.42, // ~24 degrees each side
  sweepHalfAngle: 0.7,
  sweepPeriod: 4.2, // seconds for a full sweep cycle
  alarmPerSecond: 46, // alarm climb while a live camera sees Wren
  jamSeconds: 8,
  jamCost: 500, // dollars the fence takes per jammer use
  jamUses: 2,
};

export const COINS = { count: 3, throwRange: 460, investigateRadius: 420 };

export const LOOT = {
  sapphire: { x: 640, y: 360, value: 50000, name: 'Star Sapphire' },
  gold: { x: 296, y: 196, value: 8000, name: 'Gold bars' },
  ledger: { x: 992, y: 548, value: 5000, name: 'Ledger' },
};

export const VENT = { x: 1224, y: 118, radius: 30 };

/** Seconds after the sapphire grab before the motion sensors arm. */
export const SENSOR_ARM_DELAY = 20;
export const SENSOR_ALARM_PER_SECOND = 2.2;
export const ALARM_DECAY_PER_SECOND = 6;
export const LOCKDOWN_SECONDS = 10;
export const LOCKDOWN_ALARM_RESET = 55;

/** The vault room: tables are cover — they block movement and line of sight. */
export const TABLES = [
  { x: 150, y: 130, w: 190, h: 84 }, // west roulette table
  { x: 150, y: 500, w: 190, h: 84 }, // west card table
  { x: 940, y: 130, w: 190, h: 84 }, // east roulette table
  { x: 940, y: 500, w: 190, h: 84 }, // east card table
  { x: 470, y: 120, w: 150, h: 70 }, // north chips table
  { x: 660, y: 530, w: 150, h: 70 }, // south chips table
  { x: 470, y: 560, w: 90, h: 56 }, // south-west bar
  { x: 720, y: 104, w: 90, h: 56 }, // north-east bar
];

/** The pedestal in the middle of the room. Blocks movement, not sight. */
export const PEDESTAL = { x: 640, y: 360, radius: 46 };

/** Guard patrol loops, as waypoint lists. */
export const PATROLS = [
  [ { x: 430, y: 250 }, { x: 850, y: 250 }, { x: 850, y: 470 }, { x: 430, y: 470 } ],
  [ { x: 210, y: 360 }, { x: 210, y: 110 }, { x: 380, y: 110 }, { x: 380, y: 610 }, { x: 210, y: 610 } ],
  [ { x: 1070, y: 360 }, { x: 1070, y: 610 }, { x: 900, y: 610 }, { x: 900, y: 110 }, { x: 1070, y: 110 } ],
];

/** Wall cameras: position, the direction they face at rest, and sweep phase. */
export const CAMERA_SPOTS = [
  { x: 40, y: 40, baseAngle: Math.PI / 4, phase: 0 },
  { x: 1240, y: 40, baseAngle: (3 * Math.PI) / 4, phase: 1.4 },
  { x: 640, y: 692, baseAngle: -Math.PI / 2, phase: 2.6 },
];

export const PALETTE = {
  floor: '#1d1420',
  carpet: '#241627',
  carpetEdge: '#3a2333',
  gold: '#d8a94e',
  goldDim: '#8a6a2f',
  felt: '#1f5c46',
  feltEdge: '#2e7d62',
  wall: '#4a2f45',
  wallTop: '#5d3a56',
  pedestal: '#e8e4da',
  pedestalEdge: '#b9b2a4',
  sapphire: '#7fe7ff',
  sapphireGlow: '#35b6e8',
  thief: '#2ec4b6',
  thiefCoat: '#1d8a80',
  thiefDark: '#0f5f58',
  guard: '#e8b64c',
  guardDark: '#9c7422',
  guardCone: 'rgba(232, 182, 76, 0.20)',
  guardConeEdge: 'rgba(232, 182, 76, 0.55)',
  cameraCone: 'rgba(235, 64, 52, 0.22)',
  cameraConeEdge: 'rgba(235, 64, 52, 0.6)',
  cameraBody: '#c94f43',
  vent: '#6b7a86',
  ventDark: '#3d4a54',
  hud: '#f4ead2',
  hudMuted: '#b9a684',
  alarmLow: '#7ec850',
  alarmMid: '#e8b64c',
  alarmHigh: '#e84a3f',
  panel: 'rgba(16, 10, 18, 0.88)',
  panelEdge: '#d8a94e',
  text: '#f4ead2',
  danger: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
