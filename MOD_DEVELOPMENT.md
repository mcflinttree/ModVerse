# Mod Development Guide

ModVerse mods are plain JavaScript modules loaded from a folder containing a `manifest.json`.
Each mod runs in its **own sandboxed Web Worker** — it has no access to the DOM, `window`,
`localStorage`, or arbitrary `fetch`. It can only interact with the game through the curated
`ModVerse` API object, and only for the permissions it declares in its manifest.

## Where mods live

- **On Android (packaged APK)**: `/storage/emulated/0/ModVerse/<your-mod-folder>/`, auto-discovered
  and loaded on every game launch (and on the `reloadmods` console command).
- **In the browser/PWA dev environment**: the project's `mods/` folder at the repo root, served by
  the dev server's `/api/mods` endpoint (identical manifest/script contract, just a different
  transport — see `server/routes/mods.js`).

## manifest.json schema

```json
{
  "id": "yourname.modname",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "What this mod does.",
  "type": "item | vehicle | map | ui-theme | language | shader | sound | script",
  "main": "main.js",
  "permissions": ["items", "vehicles", "recipes", "console", "spawn", "network"]
}
```

| Field         | Required | Notes                                                                 |
|----------------|----------|-------------------------------------------------------------------------|
| `id`           | yes      | Globally unique, convention `author.modname`                          |
| `main`         | yes      | Relative path to your entry script within the mod folder               |
| `permissions`  | no       | Array of capability strings your mod needs (see table below)          |
| `type`         | no       | Informational/categorization only                                     |

## Permissions

| Permission   | Grants access to                                             |
|---------------|-----------------------------------------------------------------|
| `items`       | `ModVerse.registerItem()`                                       |
| `vehicles`    | `ModVerse.registerVehicle()`                                     |
| `recipes`     | `ModVerse.registerRecipe()`                                      |
| `console`     | `ModVerse.registerCommand()`                                     |
| `spawn`       | `ModVerse.spawnEntity()`                                         |
| `network`     | `ModVerse.chatBroadcast()` (relayed over the multiplayer channel) |

Calling an API method without the matching permission rejects with an error — check your browser/
`adb logcat` console for `[mod:your.id] ...` messages if something silently fails.

## The `ModVerse` API (available inside your mod script)

Your `main.js` must export a default async function; it receives the `ModVerse` API object:

```js
export default async function init(ModVerse) {
  // ... register things, subscribe to events ...
}
```

### Registration methods (all async, all permission-gated)

```js
await ModVerse.registerItem({ id: 'yourmod:gem', name: 'Ruby Gem', icon: '💎', stackSize: 16 });

await ModVerse.registerVehicle({
  id: 'yourmod:speedster', name: 'Speedster', spriteKey: 'vehicle_cart',
  width: 1.2, height: 1.2, maxSpeed: 16, acceleration: 22, turnRate: 4.2,
});

await ModVerse.registerRecipe({
  id: 'yourmod:gem_recipe', name: 'Ruby Gem',
  inputs: [{ itemId: 'core:stone', count: 6 }],
  output: { itemId: 'yourmod:gem', count: 1 },
});

await ModVerse.registerCommand('mycommand', 'Description shown in `help`');
```

### Entity spawning

```js
await ModVerse.spawnEntity('npc', 5, 3, { archetype: 'merchant', spriteKey: 'npc_villager' });
await ModVerse.spawnEntity('vehicle', 0, 0, { id: 'yourmod:speedster' });
```

### Events

Subscribe with `ModVerse.on(eventName, callback)`. Built-in events:

| Event                          | Payload                     | Fired                                  |
|----------------------------------|-------------------------------|-------------------------------------------|
| `tick`                          | `{ dt, hour }`                | every fixed engine update               |
| `command:<modId>:<name>`         | `{ args }`                    | when a player runs a command your mod registered |

```js
ModVerse.on('command:yourname.modname:mycommand', async ({ args }) => {
  await ModVerse.log('mycommand ran with args:', args);
});
```

### Logging

```js
await ModVerse.log('Hello from my mod!', someValue);
```
Appears in the host app's devtools console as `[mod:your.id] ...`.

## Custom textures, sounds, UI themes, languages, and shaders

The core engine ships with a small procedurally-generated texture atlas and synthesized audio so
it runs with **zero binary assets**. Mods that want to ship real art/audio/shaders should:

- **Textures**: place PNGs in your mod folder and load them via `fetch`/`Filesystem.readFile` from
  your `main.js`... however, since mods run in a worker with no `fetch` to arbitrary origins, image/
  texture registration is done by having the mod declare asset paths in its `manifest.json`
  (`"assets": { "textures": { "yourmod:gem": "textures/gem.png" } }`) which the **host** (not the
  worker) loads and hands to `renderer/TextureAtlas.js`'s `addImage()` before the next atlas
  rebuild. This keeps image decoding off the sandboxed worker and out of reach of mod code.
- **Sounds**: same pattern — declare `"assets": { "sounds": { "yourmod:chime": "sounds/chime.mp3" } }`;
  the host decodes and registers them with `AudioManager.registerBuffer()`.
- **UI themes**: declare a `"theme"` block of CSS custom-property overrides in your manifest
  (e.g. `{"--hud-accent": "#ff8844"}`); the host applies them to `:root` — mods cannot inject
  arbitrary DOM/CSS directly, by design.
- **Languages**: ship a `lang/<code>.json` flat key→string map; declare it under
  `"assets": { "languages": ["lang/es.json"] }` and reference keys via `ModVerse.log`/UI text you
  register — a full i18n lookup table is exposed to the host as `manifest.languages`.
- **Shaders**: custom WebGL fragment shader *source strings* can be declared in the manifest under
  `"shaders"` and are compiled by the host renderer (never `eval`'d as JS), letting you customize
  water/weather/lighting visuals without any code-execution risk.

This split (worker = logic only, host = asset loading) is what keeps the sandbox meaningful: a
malicious or buggy mod can register bad data, but it cannot touch the DOM, exfiltrate cookies/tokens,
or make arbitrary network requests.

## Full example: a vehicle mod

See `mods/example-vehicle-mod/` in this repo (`manifest.json` + `main.js`) — registers a faster
cart and a `fastcart` console command that spawns it.

## Full example: an item + recipe mod

See `mods/example-item-mod/` — registers an Iron Sword item and its crafting recipe.

## Testing your mod

**Browser/dev server:**
1. Copy your mod folder into `mods/` at the project root.
2. Restart `npm start`, or run `reloadmods` in the in-game dev console (`` ` `` to open it).

**Android:**
1. `adb push your-mod-folder /storage/emulated/0/ModVerse/your-mod-folder`
2. Run `reloadmods` in the dev console, or relaunch the app.

Check the browser devtools console (or `adb logcat`) for `[ModLoader] loaded "..."` on success, or
`[ModLoader] failed to load ...` with the error if something's wrong with your manifest or script.
