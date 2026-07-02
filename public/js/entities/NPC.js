import { Entity } from './Entity.js';

const STATES = { IDLE: 'idle', WANDER: 'wander', FOLLOW: 'follow', FLEE: 'flee' };

export class NPC extends Entity {
  constructor(x, y, { archetype = 'villager', spriteKey = 'npc_villager' } = {}) {
    super('npc', x, y);
    this.archetype = archetype;
    this.spriteKey = spriteKey;
    this.speed = 2.4;
    this.state = STATES.IDLE;
    this._stateTimer = 0;
    this._wanderDir = { x: 0, y: 0 };
    this.dialogue = ['Hello, traveler.', 'Nice weather today.', 'Watch out for wolves at night.'];
    this.followTarget = null;
    this.fleeThreshold = 3; // tiles
  }

  say() {
    return this.dialogue[Math.floor(Math.random() * this.dialogue.length)];
  }

  update(dt, world) {
    this._stateTimer -= dt;

    if (this.followTarget) {
      const dx = this.followTarget.x - this.x, dy = this.followTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1.5) {
        this.vx += (dx / dist) * 10 * dt;
        this.vy += (dy / dist) * 10 * dt;
      }
      return;
    }

    if (this._stateTimer <= 0) {
      this._pickNewState();
    }

    if (this.state === STATES.WANDER) {
      this.vx += this._wanderDir.x * 6 * dt;
      this.vy += this._wanderDir.y * 6 * dt;
    }
  }

  _pickNewState() {
    const roll = Math.random();
    if (roll < 0.4) {
      this.state = STATES.IDLE;
      this._stateTimer = 1 + Math.random() * 2;
    } else {
      this.state = STATES.WANDER;
      const angle = Math.random() * Math.PI * 2;
      this._wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
      this._stateTimer = 1.5 + Math.random() * 2.5;
    }
  }
}
