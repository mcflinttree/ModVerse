import { Loop } from './Loop.js';
import { Renderer } from '../renderer/Renderer.js';
import { World } from '../world/World.js';
import { Physics } from '../physics/Physics.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { Vehicle } from '../entities/Vehicle.js';
import { Inventory } from '../ui/Inventory.js';
import { Crafting } from '../ui/Crafting.js';
import { HUD } from '../ui/HUD.js';
import { DevConsole } from '../ui/Console.js';
import { UIManager } from '../ui/UIManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { NetClient } from '../network/NetClient.js';
import { SaveManager } from '../save/SaveManager.js';
import { ModAPI } from '../mods/ModAPI.js';
import { ModLoader } from '../mods/ModLoader.js';
import { DayNightCycle } from '../weather/DayNightCycle.js';
import { WeatherSystem } from '../weather/WeatherSystem.js';

export class Engine {
  constructor({ seed = 'modverse-default', onProgress = () => {} } = {}) {
    this.seed = seed;
    this.onProgress = onProgress;
  }

  async boot() {
    this.onProgress(0.05, 'Creating renderer…');
    const canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(canvas);

    this.onProgress(0.15, 'Connecting to server…');
    this.net = new NetClient();

    this.onProgress(0.25, 'Generating world…');
    const persistence = {
      loadEdits: (seed, cx, cy) => this.net.isAuthenticated() ? this.net.loadChunkEdits(seed, cx, cy) : Promise.resolve([]),
      saveEdits: (seed, cx, cy, edits) => { if (this.net.isAuthenticated()) this.net.saveChunkEdits(seed, cx, cy, edits).catch(() => {}); },
    };
    this.world = new World(this.seed, persistence);
    this.world.weatherSystem = new WeatherSystem(this.world);
    this.dayNight = new DayNightCycle(this.world);
    this.physics = new Physics(this.world);

    this.onProgress(0.4, 'Spawning player…');
    this.player = new Player(0, 0);
    this.world.addEntity(this.player);

    this.modApi = new ModAPI(this);
    this.inventory = new Inventory(this.modApi.itemRegistry);
    this.player.inventory = this.inventory;
    this.crafting = new Crafting(this.modApi.itemRegistry);
    this.inventory.add('core:wood', 4);
    this.inventory.add('core:food', 2);

    this.onProgress(0.55, 'Building UI…');
    this.console = new DevConsole(this);
    this.hud = new HUD({ inventory: this.inventory, player: this.player, dayNight: this.dayNight });
    this.ui = new UIManager(this);
    this.audio = new AudioManager();

    this.onProgress(0.7, 'Loading mods…');
    this.modLoader = new ModLoader(this);
    await this.modLoader.discoverAndLoad().catch((err) => console.warn('Mod discovery failed:', err));

    this.onProgress(0.85, 'Restoring save…');
    this.save = new SaveManager(this.net);
    const local = await this.save.loadLocal(1).catch(() => null);
    if (local?.payload) this.save.applyPayload(this, local.payload);
    this.save.startAutoSave(this);

    this._spawnStarterNpcs();

    this.onProgress(1, 'Ready');
    this.loop = new Loop(this._update.bind(this), this._render.bind(this));
    this.loop.start();
  }

  _spawnStarterNpcs() {
    this.spawnEntity('npc', 3, 1);
    this.spawnEntity('vehicle', -2, 2);
  }

  spawnEntity(kind, x, y, def) {
    let entity;
    if (kind === 'npc') entity = new NPC(x, y, def || {});
    else if (kind === 'vehicle') entity = new Vehicle(x, y, def || this.modApi.vehicleRegistry.get('core:cart'));
    else return null;
    this.world.addEntity(entity);
    return entity;
  }

  tryInteract() {
    const range = 1.6;
    for (const entity of this.world.entities.values()) {
      const dist = Math.hypot(entity.x - this.player.x, entity.y - this.player.y);
      if (dist > range) continue;
      if (entity.type === 'npc') {
        this.console.log(`${entity.archetype}: "${entity.say()}"`);
        this.audio.playSfx('ui');
        return;
      }
      if (entity.type === 'vehicle') {
        if (this.player.mountedVehicle === entity) this.player.dismount();
        else this.player.mount(entity);
        return;
      }
    }
  }

  _update(dt) {
    this.physics.step(this.player, dt);
    if (this.player.mountedVehicle) this.physics.step(this.player.mountedVehicle, dt);

    for (const entity of this.world.entities.values()) {
      if (entity === this.player) continue;
      if (entity.type === 'npc') this.physics.step(entity, dt);
    }

    this.world.update(dt, this.player);
    this.dayNight.update(dt);
    this.world.weatherSystem.update(dt, { width: window.innerWidth, height: window.innerHeight });
    this.hud.tick();

    this.modApi.emit('tick', { dt, hour: this.world.time.hour });
  }

  _render(_alpha, _frameDt) {
    const r = this.renderer;
    r.camera.x = this.player.x;
    r.camera.y = this.player.y;

    const light = this.dayNight.lightLevel();
    const tint = [0.3 + 0.7 * light, 0.3 + 0.7 * light, 0.35 + 0.65 * light];

    r.beginFrame();
    r.drawWorld(this.world.chunkManager, this.player.x, this.player.y, tint);
    r.drawEntities(this.world.entities.values(), tint);
    r.drawWeatherOverlay(this.world.weatherSystem);
    r.endFrame();
  }
}
