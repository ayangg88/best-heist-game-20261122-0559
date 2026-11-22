# The Gilded Cage — a casino-vault heist game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/ayangg88/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/ayangg88/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

One thief. One casino vault. One night.

Wren, a thief in a teal coat, has one night to cross the casino vault, lift
the **Star Sapphire** from its pedestal, and slip out through the air vent.
Three guards patrol the floor with amber vision cones, three wall cameras
sweep red cones across the room, and every second spent in a cone feeds the
alarm meter. At 100% the doors seal for a ten-second lockdown and a spare
guard hurries to the vent.

## How to play

- **WASD / arrows** — move. **Shift** — sneak (slow, silent). Running is noisy.
- **Click** — toss a coin; the nearest guard goes to look (3 coins).
- **Q** — jam a camera for 8 seconds. Each use costs $500 of loot (the fence
  takes a cut). Clicking near a camera jams it too.
- **P** — pause. **R** — restart.
- Grab the sapphire and the side loot (gold bars, ledger), then reach the
  **VENT** on the east wall before the motion sensors arm — 20 seconds after
  the grab, the alarm starts climbing on its own.

## Play it

```sh
node serve.ts --port 8092
# open http://localhost:8092
```

The game is plain static files under `game/` — no build step, no network
requests. `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json`.

Built for the [best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559)
on make.fun. Play code referral: `ye9vf8mj`.
