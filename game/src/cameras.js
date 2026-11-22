// The three wall cameras: each sweeps a fixed arc, paints a red cone while
// its light is on, and goes dark for CAMERA.jamSeconds when Wren jams it.
// A jammed camera sees nothing and its cone is gone.

import { CAMERA, CAMERA_SPOTS } from './config.js';
import { lineOfSightClear } from './guards.js';

export function createCameras() {
  return CAMERA_SPOTS.map((spot) => ({
    x: spot.x,
    y: spot.y,
    baseAngle: spot.baseAngle,
    phase: spot.phase,
    angle: spot.baseAngle,
    jammedLeft: 0,
  }));
}

/** Advance the sweep of every live camera one step. */
export function stepCameras(cameras, time) {
  for (const c of cameras) {
    if (c.jammedLeft > 0) c.jammedLeft -= 1 / 60;
    const sweep = Math.sin((time / CAMERA.sweepPeriod) * Math.PI * 2 + c.phase);
    c.angle = c.baseAngle + sweep * CAMERA.sweepHalfAngle;
  }
}

/** True when a live camera can see the point (tx, ty) right now. */
export function cameraSees(camera, tx, ty, tables) {
  if (camera.jammedLeft > 0) return false;
  const dx = tx - camera.x;
  const dy = ty - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA.range) return false;
  let diff = Math.atan2(dy, dx) - camera.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > CAMERA.halfAngle) return false;
  return lineOfSightClear(camera.x, camera.y, tx, ty, tables);
}

/** Jam the nearest live camera within range of (x, y). Returns the camera or null. */
export function jamNearestCamera(cameras, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const c of cameras) {
    if (c.jammedLeft > 0) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (!best || bestDist > 300) return null;
  best.jammedLeft = CAMERA.jamSeconds;
  return best;
}
