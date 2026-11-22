// The three casino guards: waypoint patrols, amber vision cones, line of
// sight blocked by tables, and three states — patrol, investigate a tossed
// coin, chase a thief they can see.

import { GUARD, PATROLS } from './config.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';

/** True when the straight line from (x1,y1) to (x2,y2) crosses no table. */
export function lineOfSightClear(x1, y1, x2, y2, tables) {
  for (const t of tables) {
    if (segmentHitsRect(x1, y1, x2, y2, t)) return false;
  }
  return true;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let a = (r.x - x1) / dx;
    let b = (r.x + r.w - x1) / dx;
    if (a > b) [a, b] = [b, a];
    tMin = Math.max(tMin, a);
    tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let a = (r.y - y1) / dy;
    let b = (r.y + r.h - y1) / dy;
    if (a > b) [a, b] = [b, a];
    tMin = Math.max(tMin, a);
    tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when the guard can see the point (tx, ty) right now. */
export function guardSees(guard, tx, ty, tables) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.visionRange) return false;
  if (dist < 30) return lineOfSightClear(guard.x, guard.y, tx, ty, tables);
  let diff = Math.atan2(dy, dx) - guard.facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > GUARD.visionHalfAngle) return false;
  return lineOfSightClear(guard.x, guard.y, tx, ty, tables);
}

export function createGuards() {
  return PATROLS.map((waypoints, i) => ({
    x: waypoints[0].x,
    y: waypoints[0].y,
    facing: 0,
    waypoint: 1,
    state: GUARD_PATROL,
    investigateX: 0,
    investigateY: 0,
    investigateLeft: 0,
    stuck: 0,
    index: i,
  }));
}

/** Send the nearest guard to look at a tossed coin. Returns true if one went. */
export function sendGuardToCoin(guards, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const g of guards) {
    if (g.state === GUARD_CHASE) continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bestDist) { bestDist = d; best = g; }
  }
  if (!best || bestDist > 420) return false;
  best.state = GUARD_INVESTIGATE;
  best.investigateX = x;
  best.investigateY = y;
  best.investigateLeft = GUARD.investigateTime;
  return true;
}

function moveToward(guard, tx, ty, speed, dt, tables, isCircleBlocked) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return 0;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  if (!isCircleBlocked(nx, ny, GUARD.radius)) {
    guard.x = nx;
    guard.y = ny;
  } else if (!isCircleBlocked(guard.x, ny, GUARD.radius)) {
    guard.y = ny;
  } else if (!isCircleBlocked(nx, guard.y, GUARD.radius)) {
    guard.x = nx;
  }
  return dist;
}

/** Advance every guard one step. Returns true if any guard sees the thief. */
export function stepGuards(guards, dt, player, tables, isCircleBlocked, lockdown) {
  let anySees = false;
  for (const g of guards) {
    const sees = guardSees(g, player.x, player.y, tables);
    if (sees) anySees = true;

    if (g.index >= PATROLS.length) {
      // The lockdown spare guard: hold by the vent, chase if he sees Wren.
      if (sees) moveToward(g, player.x, player.y, GUARD.chaseSpeed, dt, tables, isCircleBlocked);
      else {
        moveToward(g, 1180, 118, GUARD.patrolSpeed, dt, tables, isCircleBlocked);
        g.facing = Math.PI;
      }
    } else if (g.state === GUARD_CHASE) {
      if (!sees) {
        g.state = GUARD_PATROL;
      } else {
        moveToward(g, player.x, player.y, GUARD.chaseSpeed, dt, tables, isCircleBlocked);
      }
    } else if (g.state === GUARD_INVESTIGATE) {
      const d = moveToward(g, g.investigateX, g.investigateY, GUARD.investigateSpeed, dt, tables, isCircleBlocked);
      if (d < 8) {
        g.investigateLeft -= dt;
        g.facing += dt * 1.4; // look around the spot
        if (g.investigateLeft <= 0) g.state = GUARD_PATROL;
      }
      if (sees) g.state = GUARD_CHASE;
    } else {
      // Patrol: walk the loop; pause a beat at each waypoint and look around.
      const wp = PATROLS[g.index][g.waypoint];
      const d = moveToward(g, wp.x, wp.y, GUARD.patrolSpeed, dt, tables, isCircleBlocked);
      if (d < 6) {
        g.waypoint = (g.waypoint + 1) % PATROLS[g.index].length;
        g.facing += 0.9;
      }
      if (sees) g.state = GUARD_CHASE;
    }
  }
  return anySees;
}

/** Spawn the lockdown spare guard by the vent door. */
export function spawnLockdownGuard(guards) {
  if (guards.length > 3) return;
  guards.push({
    x: 1180, y: 118, facing: Math.PI, waypoint: 0,
    state: GUARD_PATROL, investigateX: 0, investigateY: 0,
    investigateLeft: 0, stuck: 0, index: 3,
  });
}
