// Staged scenes for the screenshots: deterministic, seeded, and framed so
// every required element — thief, guards with cones, cameras, loot target,
// alarm meter — is visible in one frame.
//
// start: the title over a fresh vault, 5 seconds into the night.
// play:  Wren sneaks toward the sapphire for 26 seconds, freezing whenever a
//         cone covers her, so the frame catches her mid-room with the cones
//         sweeping around her and the alarm meter climbing.
// end:   the win scene — sapphire in hand, Wren at the vent.

import { CAMERA, CAMERA_SPOTS, LOOT, PATROLS, STEP, TABLES, VENT } from './config.js';
import { stepWorld } from './world.js';
import { guardSees } from './guards.js';
import { cameraSees } from './cameras.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN } from './render.js';

function guardTooClose(state, distance) {
  for (const g of state.guards) {
    if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < distance) return g;
  }
  return null;
}

/** The watcher (guard or camera) that can currently see Wren, or null. */
function findWatcher(state) {
  for (const g of state.guards) {
    if (guardSees(g, state.player.x, state.player.y, TABLES)) return g;
  }
  for (const c of state.cameras) {
    if (cameraSees(c, state.player.x, state.player.y, TABLES)) return c;
  }
  return null;
}

/** Slip sideways out of a cone: perpendicular to the watcher's gaze, picking
 *  the side with open floor ahead. */
function evadeMove(state, watcher) {
  const dx = state.player.x - watcher.x;
  const dy = state.player.y - watcher.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular to the line watcher -> Wren.
  const px = -dy / len;
  const py = dx / len;
  const ahead = (sx, sy) => {
    const nx = state.player.x + px * sx * 60;
    const ny = state.player.y + py * sy * 60;
    return nx > 40 && nx < 1240 && ny > 40 && ny < 680;
  };
  const side = ahead(1, 1) ? 1 : -1;
  return { x: px * side, y: py * side };
}

/** Run the autopilot: sneak at the sapphire, slip out of cones when watched. */
function autopilot(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const s = world.state;
    if (s.caught || s.escaped) break;
    const watcher = findWatcher(s);
    const nearGuard = guardTooClose(s, 85);
    let move = { x: 0, y: 0 };
    if (watcher) {
      move = evadeMove(s, watcher);
    } else if (nearGuard) {
      // Back away from the guard that is too close.
      const dx = s.player.x - nearGuard.x;
      const dy = s.player.y - nearGuard.y;
      const len = Math.hypot(dx, dy) || 1;
      move = { x: dx / len, y: dy / len };
    } else if (!s.sapphireTaken) {
      const dx = LOOT.sapphire.x - s.player.x;
      const dy = LOOT.sapphire.y - s.player.y;
      const len = Math.hypot(dx, dy);
      if (len > 60) move = { x: dx / len, y: dy / len };
    }
    stepWorld(world, STEP, move, true, false);
  }
}

/** Static mid-heist frame, used only if the autopilot gets caught: Wren
 *  mid-room below the pedestal, guards mid-patrol, cameras mid-sweep. */
function stagePlayFallback(world) {
  const s = world.state;
  world.reset();
  const t = 24;
  s.time = t;
  s.alarm = 38;
  s.player.x = 500;
  s.player.y = 520;
  s.player.facing = Math.atan2(LOOT.sapphire.y - 520, LOOT.sapphire.x - 500);
  s.player.sneaking = true;
  PATROLS.forEach((waypoints, i) => {
    const a = waypoints[0];
    const b = waypoints[1];
    const g = s.guards[i];
    g.x = a.x + (b.x - a.x) * 0.4;
    g.y = a.y + (b.y - a.y) * 0.4;
    g.facing = Math.atan2(b.y - a.y, b.x - a.x);
    g.waypoint = 1;
    g.state = 'patrol';
  });
  CAMERA_SPOTS.forEach((spot, i) => {
    const c = s.cameras[i];
    const sweep = Math.sin((t / CAMERA.sweepPeriod) * Math.PI * 2 + spot.phase);
    c.angle = spot.baseAngle + sweep * CAMERA.sweepHalfAngle;
  });
}

export function stageShot(name, world) {
  const s = world.state;
  if (name === 'start') {
    // Five seconds of ambient patrol under the title.
    for (let i = 0; i < Math.floor(5 / STEP); i++) {
      stepWorld(world, STEP, { x: 0, y: 0 }, false, false);
    }
    s.alarm = 12;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    autopilot(world, 26);
    if (s.caught) {
      // The autopilot got caught: rebuild a clean mid-heist frame statically.
      stagePlayFallback(world);
    } else {
      // The frame should read as a tense sneak, not a failed run: end any
      // lockdown, send the spare guard home, and cap the meter.
      if (s.guards.length > 3) s.guards.length = 3;
      if (s.lockdownActive) { s.lockdownActive = false; s.lockdownLeft = 0; }
      if (s.alarm > 55) s.alarm = 38 + (s.time % 7);
      if (s.alarm < 28) s.alarm = 28 + (s.time % 9);
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    // The getaway, staged directly: sapphire taken, Wren at the vent.
    s.sapphireTaken = true;
    s.lootValue = LOOT.sapphire.value + LOOT.gold.value;
    s.goldTaken = true;
    s.time = 74;
    s.alarm = 62;
    s.alarmPeak = 62;
    s.player.x = VENT.x - 46;
    s.player.y = VENT.y;
    s.player.facing = 0;
    s.escaped = true;
    return { screen: SCREEN_WIN, best: 0 };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
