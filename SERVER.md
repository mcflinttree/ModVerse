# Server Setup & API Reference

The backend is a single Express process (`server/index.js`) using `better-sqlite3` for storage
and `ws` for the multiplayer relay. No external database server is required.

## Environment variables

| Variable                | Default          | Purpose                                   |
|--------------------------|-------------------|---------------------------------------------|
| `PORT`                   | `8787`            | HTTP/WebSocket listen port                  |
| `MODVERSE_JWT_SECRET`     | dev default       | **Set this in production.** Signs auth tokens |

## Data storage

SQLite database file: `data/modverse.sqlite3` (auto-created). Tables:

- `users` — accounts (bcrypt-hashed passwords)
- `saves` — per-user save slots (`slot` 1..N), JSON payload of player/inventory/time/weather state
- `chunks` — persisted block edits per world seed + chunk coordinate (terrain itself is regenerated
  deterministically from the seed; only diffs from the player are stored, keeping the world "infinite"
  without needing to store every chunk)
- `mods` — reserved for future server-side mod registry/marketplace metadata
- `push_subscriptions` — device tokens for push notifications

## REST API

All `saves` and `chunks` routes require `Authorization: Bearer <token>`.

### Auth

```
POST /api/auth/register   { username, password }         -> { token, user }
POST /api/auth/login      { username, password }         -> { token, user }
```

### Saves

```
GET    /api/saves                  -> { saves: [{ id, slot, world_seed, updated_at }] }
GET    /api/saves/:slot            -> { slot, worldSeed, payload, updatedAt }
PUT    /api/saves/:slot            { worldSeed, payload } -> { ok, slot, updatedAt }
DELETE /api/saves/:slot            -> { ok }
```

### Chunk persistence (server-authoritative block edits)

```
GET /api/chunks/:seed/:cx/:cy         -> { edits: [{x,y,tile,decor}], updatedAt }
PUT /api/chunks/:seed/:cx/:cy  { edits: [...] } -> { ok, count }
```

Edits are merged (keyed by `x,y` within the chunk) rather than overwritten, so concurrent partial
updates from a client don't clobber each other.

### Mods (dev/browser fallback listing)

```
GET /api/mods                 -> { mods: [{ folder, manifest }] }
GET /api/mods/files/:folder/*  -> raw file (manifest, scripts, assets)
```

This mirrors what `ModLoader.js` reads directly from `/storage/emulated/0/ModVerse/` on a packaged
Android build — see `docs/MOD_DEVELOPMENT.md`.

### Health check

```
GET /api/health -> { ok: true, time }
```

## WebSocket multiplayer relay

Connect to `ws://<host>/mp`. Protocol (JSON messages):

```
// client -> server, once per connection
{ "type": "join", "room": "world-1", "playerId": "p_abc123" }

// client -> server, any time after joining (broadcast to all other peers in the room)
{ "type": "state", "x": 12.4, "y": -3.1, "facing": "down" }
{ "type": "chat", "text": "hello" }

// server -> client, sent once after join
{ "type": "joined", "playerId": "p_abc123", "room": "world-1" }

// server -> client, relayed messages from peers (playerId is stamped by the server)
{ "type": "state", "x": ..., "y": ..., "playerId": "p_xyz789" }
```

Rooms are held in memory only — for production-scale multiplayer beyond a LAN/small group,
put a message broker (Redis pub/sub) in front of the relay and run multiple server instances.

## Production notes

- Set `MODVERSE_JWT_SECRET` to a long random value.
- Put the Express app behind HTTPS (reverse proxy such as nginx or Caddy) — Service Worker
  features (background sync, push) require a secure context.
- Back up `data/modverse.sqlite3` regularly; it's a single file so this is a simple `cp`/rsync.
- For push notifications, wire a real Web Push provider (VAPID keys) into a new
  `server/routes/push.js` that reads from the `push_subscriptions` table — the schema is
  already in place, this repo ships the client-side `sw.js` push handler ready to receive them.
