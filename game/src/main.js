// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, caught and win.
//
// ?seed=N fixes the night's layout. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, stepWorld, tossCoin, useJammer, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_GRAB, EVENT_JAM, EVENT_COIN } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_JAMMER, createInput } from './input.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

// Exposed for the screenshot harness: which screen the shot landed on.
window.__shotScreen = null;
window.__shotState = null;

function runShot(name) {
  const scene = stageShot(name, world);
  window.__shotScreen = scene.screen;
  window.__shotState = {
    caught: world.state.caught,
    escaped: world.state.escaped,
    alarm: Math.round(world.state.alarm),
    loot: world.state.lootValue,
    player: { x: Math.round(world.state.player.x), y: Math.round(world.state.player.y) },
    sapphireTaken: world.state.sapphireTaken,
  };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let stepSoundAt = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
    sound.unlock();
    announce('Playing. Lift the Star Sapphire and reach the vent.');
  }

  function endGame(caught) {
    screen = caught ? SCREEN_CAUGHT : SCREEN_WIN;
    sound.stopHeartbeat();
    if (caught) sound.caught();
    else sound.sting();
    announce(caught
      ? `Caught. Loot ${world.state.lootValue}.`
      : `Clean getaway with ${world.state.lootValue}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      world.reset();
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_WIN)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      sound.stopHeartbeat();
      announce('Paused.');
      return;
    }
    if ((actions & (ACTION_PAUSE | ACTION_CONFIRM)) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_JAMMER) {
      if (useJammer(world, world.state.player.x, world.state.player.y)) sound.jam();
    }
    if (click) {
      const p = world.state.player;
      const d = Math.hypot(click.x - p.x, click.y - p.y);
      if (d < 60) {
        // A click on a nearby camera jams it; anywhere else tosses a coin.
        if (useJammer(world, click.x, click.y)) sound.jam();
      } else if (tossCoin(world, click.x, click.y)) {
        sound.coin();
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      stepWorld(world, STEP, { x: 0, y: 0 }, false, false);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = stepWorld(world, STEP, input.direction(), input.sneaking(), input.running());
    const p = world.state.player;
    if (p.moving && world.state.time - stepSoundAt > (p.sneaking ? 0.55 : 0.34)) {
      stepSoundAt = world.state.time;
      sound.step(p.sneaking);
    }
    sound.heartbeat(world.state.alarm);
    if (events & EVENT_GRAB) sound.chime();
    if (events & EVENT_CAUGHT) endGame(true);
    else if (events & EVENT_ESCAPED) endGame(false);
  }

  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, 0);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      sound.stopHeartbeat();
      announce('Paused.');
    }
  });

  announce('The Gilded Cage. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
