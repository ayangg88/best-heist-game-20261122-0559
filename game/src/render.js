// Everything the eye sees: the vault room, the cones, Wren, the loot, the
// HUD (loot, alarm meter, tools), and the title / caught / win screens.
// The canvas is a fixed 1280x720 logical field, scaled to the window.

import {
  CAMERA, FIELD, GUARD, LOOT, PALETTE, PEDESTAL, TABLES, VENT, FONT,
} from './config.js';
import { guardSees } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

function conePath(ctx, x, y, angle, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function fmtMoney(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = FIELD.width;
    canvas.height = FIELD.height;
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  fit();
  window.addEventListener('resize', fit);

  function drawRoom(state) {
    // Floor: deep plum carpet with a gold diamond weave.
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = 'rgba(216, 169, 78, 0.10)';
    ctx.lineWidth = 1;
    for (let x = 40; x < FIELD.width; x += 80) {
      for (let y = 40; y < FIELD.height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(x, y - 10); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 10); ctx.lineTo(x - 10, y);
        ctx.closePath(); ctx.stroke();
      }
    }
    // Gold carpet runner down the middle, straight to the sapphire.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(560, FIELD.wall, 160, FIELD.height - 2 * FIELD.wall);
    ctx.strokeStyle = PALETTE.goldDim;
    ctx.lineWidth = 2;
    ctx.strokeRect(560, FIELD.wall, 160, FIELD.height - 2 * FIELD.wall);

    // Walls.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, FIELD.wall);
    ctx.fillRect(0, FIELD.height - FIELD.wall, FIELD.width, FIELD.wall);
    ctx.fillRect(0, 0, FIELD.wall, FIELD.height);
    ctx.fillRect(FIELD.width - FIELD.wall, 0, FIELD.wall, FIELD.height);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, 0, FIELD.width, 6);
    ctx.fillRect(0, FIELD.height - 6, FIELD.width, 6);
    ctx.fillRect(0, 0, 6, FIELD.height);
    ctx.fillRect(FIELD.width - 6, 0, 6, FIELD.height);

    // The vent: a steel grate on the east wall, the way out.
    ctx.fillStyle = PALETTE.ventDark;
    ctx.fillRect(FIELD.width - FIELD.wall - 8, VENT.y - 34, 22, 68);
    ctx.fillStyle = PALETTE.vent;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(FIELD.width - FIELD.wall - 4, VENT.y - 28 + i * 12, 14, 4);
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('VENT', FIELD.width - 62, VENT.y - 42);

    // Tables: green felt, gold trim, a few chips.
    for (const t of TABLES) {
      ctx.fillStyle = PALETTE.goldDim;
      ctx.fillRect(t.x - 4, t.y - 4, t.w + 8, t.h + 8);
      ctx.fillStyle = PALETTE.felt;
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.strokeStyle = PALETTE.feltEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(t.x + 5, t.y + 5, t.w - 10, t.h - 10);
      ctx.fillStyle = '#e8e4da';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(t.x + 22 + i * 18, t.y + t.h / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The pedestal and the Star Sapphire.
    ctx.fillStyle = PALETTE.pedestalEdge;
    ctx.beginPath(); ctx.arc(PEDESTAL.x, PEDESTAL.y, PEDESTAL.radius + 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.pedestal;
    ctx.beginPath(); ctx.arc(PEDESTAL.x, PEDESTAL.y, PEDESTAL.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(PEDESTAL.x, PEDESTAL.y, PEDESTAL.radius - 8, 0, Math.PI * 2); ctx.stroke();
    if (!state.sapphireTaken) {
      const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
      const glow = ctx.createRadialGradient(PEDESTAL.x, PEDESTAL.y, 4, PEDESTAL.x, PEDESTAL.y, 58);
      glow.addColorStop(0, `rgba(127, 231, 255, ${0.55 * pulse})`);
      glow.addColorStop(1, 'rgba(127, 231, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(PEDESTAL.x, PEDESTAL.y, 58, 0, Math.PI * 2); ctx.fill();
      drawGem(PEDESTAL.x, PEDESTAL.y - 4, 17);
      ctx.fillStyle = PALETTE.sapphireGlow;
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText('★ STAR SAPPHIRE ★', PEDESTAL.x, PEDESTAL.y - 62);
    }

    // Side loot.
    if (!state.goldTaken) {
      ctx.fillStyle = '#f2c94c';
      for (let i = 0; i < 3; i++) ctx.fillRect(LOOT.gold.x - 16 + i * 12, LOOT.gold.y - 6 + (i % 2) * 8, 14, 8);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 11px ${FONT}`;
      ctx.fillText('GOLD', LOOT.gold.x, LOOT.gold.y + 28);
    }
    if (!state.ledgerTaken) {
      ctx.fillStyle = '#7a4a2b';
      ctx.fillRect(LOOT.ledger.x - 14, LOOT.ledger.y - 10, 28, 20);
      ctx.fillStyle = '#f4ead2';
      ctx.fillRect(LOOT.ledger.x - 10, LOOT.ledger.y - 6, 20, 3);
      ctx.fillRect(LOOT.ledger.x - 10, LOOT.ledger.y + 1, 20, 3);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 11px ${FONT}`;
      ctx.fillText('LEDGER', LOOT.ledger.x, LOOT.ledger.y + 30);
    }

    // Coin toss ring.
    if (state.coinFx) {
      ctx.strokeStyle = `rgba(242, 201, 76, ${state.coinFx.left})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(state.coinFx.x, state.coinFx.y, 18, 0, Math.PI * 2); ctx.stroke();
    }
    // Jammer spark.
    if (state.jamFx) {
      ctx.strokeStyle = `rgba(127, 231, 255, ${state.jamFx.left})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(state.jamFx.x, state.jamFx.y, 26 * (1.4 - state.jamFx.left * 0.4), 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawGem(x, y, r) {
    ctx.fillStyle = PALETTE.sapphire;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.4, y - r * 0.2); ctx.lineTo(x - r * 0.4, y - r * 0.2);
    ctx.closePath(); ctx.fill();
  }

  function drawCones(state) {
    // Guard cones first (amber), then camera cones (red) on top.
    for (const g of state.guards) {
      const sees = guardSees(g, state.player.x, state.player.y, TABLES);
      ctx.fillStyle = sees ? 'rgba(232, 82, 52, 0.30)' : PALETTE.guardCone;
      conePath(ctx, g.x, g.y, g.facing, GUARD.visionHalfAngle, GUARD.visionRange);
      ctx.fill();
      ctx.strokeStyle = sees ? 'rgba(232, 82, 52, 0.8)' : PALETTE.guardConeEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (const c of state.cameras) {
      if (c.jammedLeft > 0) continue;
      ctx.fillStyle = PALETTE.cameraCone;
      conePath(ctx, c.x, c.y, c.angle, CAMERA.halfAngle, CAMERA.range);
      ctx.fill();
      ctx.strokeStyle = PALETTE.cameraConeEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawActors(state) {
    // Guards: gold uniforms with a white ring so they read at a glance,
    // a facing tick, and "!" when they see Wren.
    for (const g of state.guards) {
      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath(); ctx.arc(g.x, g.y, GUARD.radius + 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath(); ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 248, 220, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#3a2c10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.facing) * (GUARD.radius + 7), g.y + Math.sin(g.facing) * (GUARD.radius + 7));
      ctx.stroke();
      if (guardSees(g, state.player.x, state.player.y, TABLES)) {
        ctx.fillStyle = '#ff5a4e';
        ctx.font = `bold 20px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - GUARD.radius - 8);
      }
    }
    // Cameras: red bodies on the wall with a barrel pointing down their cone,
    // a white ring and a blinking light while live.
    for (const c of state.cameras) {
      const jammed = c.jammedLeft > 0;
      ctx.strokeStyle = jammed ? '#666' : PALETTE.cameraBody;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(c.angle) * 18, c.y + Math.sin(c.angle) * 18);
      ctx.stroke();
      ctx.fillStyle = jammed ? '#5a5a5a' : PALETTE.cameraBody;
      ctx.beginPath(); ctx.arc(c.x, c.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 248, 220, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.x, c.y, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = jammed ? '#333' : (Math.sin(state.time * 6) > 0 ? '#ff2e2e' : '#a00');
      ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
      if (jammed) {
        ctx.fillStyle = '#9fd8e8';
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('JAMMED', c.x, c.y - 16);
      }
    }
    // Wren: teal coat, darker brim, direction tick. Running shows a noise ring.
    const p = state.player;
    if (p.running) {
      ctx.strokeStyle = 'rgba(46, 196, 182, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 42 + 8 * Math.sin(state.time * 10), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = PALETTE.thiefDark;
    ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b3d39';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * 18, p.y + Math.sin(p.facing) * 18);
    ctx.stroke();
    if (p.sneaking) {
      ctx.strokeStyle = 'rgba(244, 234, 210, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('WREN', p.x, p.y - 22);
  }

  function drawHud(state, screen) {
    // Top bar.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, 46);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(FIELD.width, 46); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('THE GILDED CAGE', 18, 30);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText('one thief · one vault · one night', 250, 29);

    // Loot.
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`LOOT ${fmtMoney(state.lootValue)}`, 560, 30);
    ctx.fillStyle = state.sapphireTaken ? PALETTE.sapphire : PALETTE.hudMuted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(state.sapphireTaken ? '◆ SAPPHIRE ✓' : '◆ SAPPHIRE', 700, 29);

    // Alarm meter.
    const ax = 800;
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText('ALARM', ax, 20);
    ctx.fillStyle = '#241a20';
    ctx.fillRect(ax, 24, 140, 12);
    const alarmColour = state.alarm < 40 ? PALETTE.alarmLow : state.alarm < 75 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    ctx.fillStyle = alarmColour;
    ctx.fillRect(ax, 24, 140 * (state.alarm / 100), 12);
    ctx.strokeStyle = PALETTE.hudMuted;
    ctx.lineWidth = 1;
    ctx.strokeRect(ax, 24, 140, 12);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(`${Math.floor(state.alarm)}%`, ax + 146, 35);

    // Tools + clock.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`◉ coins ${state.coinsLeft}   ⚡ jammers ${state.jammersLeft}   ⏱ ${fmtTime(state.time)}`, FIELD.width - 18, 29);
    ctx.textAlign = 'center';

    // Lockdown banner.
    if (state.lockdownActive) {
      ctx.fillStyle = 'rgba(232, 74, 63, 0.9)';
      ctx.fillRect(0, 52, FIELD.width, 30);
      ctx.fillStyle = '#fff';
      ctx.font = `bold 17px ${FONT}`;
      ctx.fillText(`LOCKDOWN — doors sealed, ${Math.ceil(state.lockdownLeft)}s left`, FIELD.width / 2, 73);
    }

    // Sensor countdown after the grab.
    if (state.sapphireTaken && !state.escaped) {
      const left = Math.max(0, 20 - (state.time - state.grabTime));
      if (left > 0) {
        ctx.fillStyle = PALETTE.sapphire;
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillText(`Motion sensors arm in ${Math.ceil(left)}s — reach the VENT!`, FIELD.width / 2, 100);
      }
    }

    // Toast message.
    if (state.messageLeft > 0 && state.message) {
      ctx.fillStyle = 'rgba(16, 10, 18, 0.85)';
      const w = ctx.measureText(state.message).width + 36;
      ctx.fillRect((FIELD.width - w) / 2, FIELD.height - 78, w, 32);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.strokeRect((FIELD.width - w) / 2, FIELD.height - 78, w, 32);
      ctx.fillStyle = PALETTE.hud;
      ctx.font = `15px ${FONT}`;
      ctx.fillText(state.message, FIELD.width / 2, FIELD.height - 56);
    }

    // Bottom hint, only while playing.
    if (screen === SCREEN_PLAY) {
      ctx.fillStyle = PALETTE.hudMuted;
      ctx.font = `12px ${FONT}`;
      ctx.fillText('WASD / arrows move · Shift sneak · click tosses a coin · Q jams a camera · P pause · R restart', FIELD.width / 2, FIELD.height - 12);
    }
  }

  function overlay(title, lines, accent, veil = 0.72) {
    ctx.fillStyle = `rgba(10, 6, 12, ${veil})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent;
    ctx.font = `bold 64px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 310 + i * 34));
  }

  return {
    draw(state, screen, best) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      drawRoom(state);
      drawCones(state);
      drawActors(state);
      drawHud(state, screen);

      if (screen === SCREEN_TITLE) {
        // Title as bands top and bottom: the vault room stays visible between them.
        ctx.fillStyle = 'rgba(10, 6, 12, 0.82)';
        ctx.fillRect(0, 100, FIELD.width, 165);
        ctx.strokeStyle = PALETTE.panelEdge;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(FIELD.width, 100); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 265); ctx.lineTo(FIELD.width, 265); ctx.stroke();
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `bold 60px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('THE GILDED CAGE', FIELD.width / 2, 168);
        ctx.fillStyle = PALETTE.text;
        ctx.font = `20px ${FONT}`;
        ctx.fillText('One thief. One casino vault. One night.', FIELD.width / 2, 208);
        ctx.fillStyle = PALETTE.hudMuted;
        ctx.font = `15px ${FONT}`;
        ctx.fillText('WASD move · Shift sneak · Click toss a coin · Q jam a camera ($500) — lift the Star Sapphire, escape by the VENT', FIELD.width / 2, 242);
        const press = 'Press SPACE or click to begin';
        ctx.font = `bold 18px ${FONT}`;
        const pw = ctx.measureText(press).width + 36;
        ctx.fillStyle = 'rgba(10, 6, 12, 0.85)';
        ctx.fillRect((FIELD.width - pw) / 2, 684, pw, 32);
        ctx.strokeStyle = PALETTE.panelEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect((FIELD.width - pw) / 2, 684, pw, 32);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillText(press, FIELD.width / 2, 706);
      } else if (screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['The vault waits. Press P to keep stealing.'], PALETTE.hud);
      } else if (screen === SCREEN_CAUGHT) {
        overlay('CAUGHT!', [
          'A guard laid a hand on Wren — the night is over.',
          `Loot carried: ${fmtMoney(state.lootValue)}   ·   Alarm peaked at ${Math.floor(state.alarmPeak)}%`,
          '',
          'Press R to try the vault again',
        ], PALETTE.danger);
      } else if (screen === SCREEN_WIN) {
        overlay('CLEAN GETAWAY!', [
          `Wren slipped out the vent with ${fmtMoney(state.lootValue)} in ${fmtTime(state.time)}.`,
          `Alarm peaked at ${Math.floor(state.alarmPeak)}% — the house never knew.`,
          '',
          'Press R to run the vault again',
        ], PALETTE.gold);
      }
      void best;
    },
  };
}
