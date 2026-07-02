import { Engine } from './engine/Engine.js';

const bootScreen = document.getElementById('boot-screen');
const bootBar = document.getElementById('boot-bar');
const bootStatus = document.getElementById('boot-status');
const hud = document.getElementById('hud');

function setProgress(pct, label) {
  bootBar.style.width = `${Math.round(pct * 100)}%`;
  if (label) bootStatus.textContent = label;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('Service worker registration failed:', err);
  }
}

function readSeedFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get('seed') || localStorage.getItem('modverse_last_seed') || 'modverse-default';
}

async function main() {
  await registerServiceWorker();

  const seed = readSeedFromUrl();
  localStorage.setItem('modverse_last_seed', seed);

  const engine = new Engine({ seed, onProgress: setProgress });
  window.ModVerseGame = engine; // exposed for debugging / console access from devtools

  await engine.boot();

  bootScreen.classList.add('hidden');
  hud.classList.remove('hidden');

  // Flush any autosave queued while offline, once connectivity returns
  window.addEventListener('online', () => engine.save.flushToServer().catch(() => {}));
  window.addEventListener('beforeunload', () => engine.save.saveAll(engine).catch(() => {}));
}

main().catch((err) => {
  console.error('ModVerse failed to boot:', err);
  bootStatus.textContent = `Boot failed: ${err.message}`;
  bootBar.style.background = '#ff5c6c';
});
