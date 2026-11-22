// The vault room itself: Wren, the loot, the alarm meter, lockdown, and the
// win / caught rules. One step advances everything by STEP seconds.

import {
  ALARM_DECAY_PER_SECOND, CAMERA, COINS, FIELD, GUARD, LOOT, LOCKDOWN_ALARM_RESET,
  LOCKDOWN_SECONDS, PALETTE, PEDESTAL, PLAYER, SENSOR_ALARM_PER_SECOND,
  SENSOR_ARM_DELAY, TABLES, VENT,
} from './config.js';
import { createCameras, stepCameras, cameraSees, jamNearestCamera } from './cameras.js';
import { createGuards, stepGuards, spawnLockdownGuard, sendGuardToCoin } from './guards.js';

export const EVENT_NONE = 0;
export const EVENT_CAUGHT = 1;
export const EVENT_ESCAPED = 2;
export const EVENT_GRAB = 4;
export const EVENT_JAM = 8;
export const EVENT_COIN = 16;
export const EVENT_LOCKDOWN = 32;

const START = { x: 100, y: 620 };

export function createWorld(random) {
  const state = {
    random,
    time: 0,
    player: { x: START.x, y: START.y, facing: -Math.PI / 2, moving: false, sneaking: false, running: false },
    guards: createGuards(),
    cameras: createCameras(),
    alarm: 0,
    alarmPeak: 0,
    lootValue: 0,
    sapphireTaken: false,
    goldTaken: false,
    ledgerTaken: false,
    grabTime: 0,
    coinsLeft: COINS.count,
    jammersLeft: CAMERA.jamUses,
    lockdownLeft: 0,
    lockdownActive: false,
    caught: false,
    escaped: false,
    coinFx: null, // { x, y, left } — the ring where a coin landed
    jamFx: null, // { x, y, left } — the spark where a camera was jammed
    message: '',
    messageLeft: 0,
  };
  return { state, reset: () => resetWorld(state) };
}

function resetWorld(state) {
  const fresh = createWorld(state.random).state;
  Object.assign(state, fresh);
}

/** True when a circle of radius r at (x, y) overlaps a wall, table or pedestal. */
export function circleBlocked(x, y, r) {
  if (x < FIELD.wall + r || x > FIELD.width - FIELD.wall - r) return true;
  if (y < FIELD.wall + r || y > FIELD.height - FIELD.wall - r) return true;
  for (const t of TABLES) {
    if (x + r > t.x && x - r < t.x + t.w && y + r > t.y && y - r < t.y + t.h) return true;
  }
  if (Math.hypot(x - PEDESTAL.x, y - PEDESTAL.y) < PEDESTAL.radius + r) return true;
  return false;
}

function near(x1, y1, x2, y2, d) {
  return Math.hypot(x1 - x2, y1 - y2) < d;
}

function say(state, text, seconds = 2.5) {
  state.message = text;
  state.messageLeft = seconds;
}

/** One fixed step of the heist. `move` is a normalised direction, `sneak`/`run`
 *  describe how Wren moves. Returns an EVENT_* bitmask. */
export function stepWorld(world, dt, move, sneak, run) {
  const s = world.state;
  let events = EVENT_NONE;
  s.time += dt;
  if (s.messageLeft > 0) s.messageLeft -= dt;
  if (s.coinFx) { s.coinFx.left -= dt; if (s.coinFx.left <= 0) s.coinFx = null; }
  if (s.jamFx) { s.jamFx.left -= dt; if (s.jamFx.left <= 0) s.jamFx = null; }

  // --- Wren moves ---
  const speed = sneak ? PLAYER.sneakSpeed : run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const p = s.player;
  p.moving = move.x !== 0 || move.y !== 0;
  p.sneaking = sneak;
  p.running = run && p.moving;
  if (p.moving) {
    p.facing = Math.atan2(move.y, move.x);
    const nx = p.x + move.x * speed * dt;
    const ny = p.y + move.y * speed * dt;
    if (!circleBlocked(nx, p.y, PLAYER.radius)) p.x = nx;
    if (!circleBlocked(p.x, ny, PLAYER.radius)) p.y = ny;
  }

  // --- Cameras sweep; guards patrol, investigate, chase ---
  stepCameras(s.cameras, s.time);
  const seenByGuard = stepGuards(s.guards, dt, p, TABLES, circleBlocked, s.lockdownActive);
  let seenByCamera = false;
  for (const c of s.cameras) {
    if (cameraSees(c, p.x, p.y, TABLES)) { seenByCamera = true; break; }
  }

  // --- The alarm meter ---
  if (seenByGuard) s.alarm += GUARD.suspicionPerSecond * dt;
  if (seenByCamera) s.alarm += CAMERA.alarmPerSecond * dt;
  if (s.sapphireTaken && s.time - s.grabTime > SENSOR_ARM_DELAY) {
    s.alarm += SENSOR_ALARM_PER_SECOND * dt; // motion sensors arm after the grab
  }
  if (!seenByGuard && !seenByCamera) s.alarm -= ALARM_DECAY_PER_SECOND * dt;
  s.alarm = Math.max(0, Math.min(100, s.alarm));
  if (s.alarm > s.alarmPeak) s.alarmPeak = s.alarm;

  // --- Lockdown: the alarm tops out, the doors shut for ten seconds ---
  if (s.alarm >= 100 && !s.lockdownActive) {
    s.lockdownActive = true;
    s.lockdownLeft = LOCKDOWN_SECONDS;
    spawnLockdownGuard(s.guards);
    say(s, 'LOCKDOWN! Doors sealed for 10 seconds — run!', 3);
    events |= EVENT_LOCKDOWN;
  }
  if (s.lockdownActive) {
    s.lockdownLeft -= dt;
    if (s.lockdownLeft <= 0) {
      s.lockdownActive = false;
      s.alarm = LOCKDOWN_ALARM_RESET;
    }
  }

  // --- Loot: walk over it to pocket it ---
  if (!s.sapphireTaken && near(p.x, p.y, LOOT.sapphire.x, LOOT.sapphire.y, 52)) {
    s.sapphireTaken = true;
    s.lootValue += LOOT.sapphire.value;
    s.grabTime = s.time;
    say(s, 'STAR SAPPHIRE secured! Motion sensors arm in 20s — get to the vent!', 3.5);
    events |= EVENT_GRAB;
  }
  if (!s.goldTaken && near(p.x, p.y, LOOT.gold.x, LOOT.gold.y, 40)) {
    s.goldTaken = true;
    s.lootValue += LOOT.gold.value;
    say(s, `Gold bars pocketed (+$${LOOT.gold.value.toLocaleString('en-US')})`, 2);
  }
  if (!s.ledgerTaken && near(p.x, p.y, LOOT.ledger.x, LOOT.ledger.y, 40)) {
    s.ledgerTaken = true;
    s.lootValue += LOOT.ledger.value;
    say(s, `Ledger pocketed (+$${LOOT.ledger.value.toLocaleString('en-US')})`, 2);
  }

  // --- Caught: a guard lays a hand on Wren ---
  for (const g of s.guards) {
    if (near(p.x, p.y, g.x, g.y, GUARD.catchDistance)) {
      s.caught = true;
      events |= EVENT_CAUGHT;
      return events;
    }
  }

  // --- Escape: reach the vent with the sapphire ---
  if (s.sapphireTaken && near(p.x, p.y, VENT.x, VENT.y, VENT.radius + 6)) {
    s.escaped = true;
    events |= EVENT_ESCAPED;
  }
  return events;
}

/** Toss a coin at (x, y): the nearest guard goes to look. */
export function tossCoin(world, x, y) {
  const s = world.state;
  if (s.coinsLeft <= 0) return false;
  const dx = x - s.player.x;
  const dy = y - s.player.y;
  if (Math.hypot(dx, dy) > COINS.throwRange) return false;
  if (!sendGuardToCoin(s.guards, x, y)) return false;
  s.coinsLeft -= 1;
  s.coinFx = { x, y, left: 1.2 };
  return true;
}

/** Jam the nearest live camera to (x, y), or to Wren with Q. Costs loot. */
export function useJammer(world, x, y) {
  const s = world.state;
  if (s.jammersLeft <= 0) return false;
  const camera = jamNearestCamera(s.cameras, x, y);
  if (!camera) return false;
  s.jammersLeft -= 1;
  s.lootValue = Math.max(0, s.lootValue - CAMERA.jamCost);
  s.jamFx = { x: camera.x, y: camera.y, left: 1 };
  say(s, `Camera jammed for ${CAMERA.jamSeconds}s — fence takes $${CAMERA.jamCost}`, 2.5);
  return true;
}

export { PALETTE };
