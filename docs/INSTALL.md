# Installing & Running ModVerse

## Prerequisites

- Node.js 18+ and npm
- A modern browser with WebGL2 support (Chrome/Edge/Firefox desktop, or Chrome on Android) for local testing
- (Android build only) Android Studio + JDK 17, see `docs/BUILD_ANDROID.md`

## 1. Install dependencies

```bash
git clone <your-fork-url> ModVerse
cd ModVerse
npm install
```

This installs the Express/SQLite backend dependencies and the Capacitor CLI (used later for Android packaging).

## 2. Run the server

```bash
npm start
```

This starts the Express server (default port `8787`), which:

- Serves the PWA client from `public/`
- Exposes the REST API under `/api/*` (auth, saves, chunk persistence, mod listing)
- Runs a WebSocket multiplayer relay at `ws://localhost:8787/mp`
- Initializes a local SQLite database at `data/modverse.sqlite3` (created automatically on first run)

Open **http://localhost:8787** in your browser. You should see the ModVerse boot screen, then a playable world.

For live-reloading the server while you edit backend code:

```bash
npm run dev
```

(the client is static and reloaded by simply refreshing the browser)

## 3. Controls (desktop/browser testing)

| Action            | Key                  |
|--------------------|-----------------------|
| Move               | WASD / Arrow keys     |
| Sprint             | Shift                 |
| Interact / mount    | E                      |
| Hotbar slot 1-8     | 1-8                    |
| Open dev console    | ` (backtick)           |
| Open inventory      | 🎒 button (or tap)     |

On Android/touch devices, an on-screen joystick and buttons appear automatically.

## 4. Creating an account (optional, for cloud saves & multiplayer)

The game works fully offline with local (IndexedDB) autosave without an account.
To sync saves to the server and use persistent chunk edits across devices, register via the API:

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"changeme123"}'
```

Store the returned `token` — the client stores it automatically in `localStorage` once you call
`engine.net.login(...)` / `.register(...)` from the browser console or a UI you add.

## 5. Adding mods locally (for browser/dev testing)

Drop a folder containing `manifest.json` + your script into `mods/` at the project root, then either
restart the server or run the `reloadmods` dev console command in-game. See `docs/MOD_DEVELOPMENT.md`.

## 6. Next steps

- `docs/SERVER.md` — full API reference and environment configuration
- `docs/BUILD_ANDROID.md` — build the installable APK
- `docs/MOD_DEVELOPMENT.md` — write your own mods
