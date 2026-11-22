// Keyboard and mouse: WASD / arrows to move, Shift to sneak, Q for the
// jammer, click to toss a coin, Space / click to confirm, P to pause, R to
// restart. Actions are edge-triggered; movement is read every frame.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_JAMMER = 8;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let click = null; // { x, y } in logical 1280x720 coordinates, or null

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyQ') {
      actions |= ACTION_JAMMER;
    }
    if (event.code in MOVE_KEYS || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousedown', (event) => {
    click = toLogical(event);
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Normalised movement direction from the held keys. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const d = MOVE_KEYS[code];
        if (d) { x += d[0]; y += d[1]; }
      }
      const len = Math.hypot(x, y);
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    },
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    running() {
      const d = this.direction();
      return (d.x !== 0 || d.y !== 0) && !this.sneaking();
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The latest click, consumed once. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
