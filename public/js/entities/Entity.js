let _nextId = 1;

export class Entity {
  constructor(type, x = 0, y = 0) {
    this.id = `${type}_${_nextId++}`;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 0.8;
    this.height = 0.8;
    this.speed = 5.2;
    this.facing = 'down';
    this.isSolidCollider = true;
    this.ignoresWater = false;
    this.spriteKey = 'entity_default';
    this.alive = true;
  }

  // Overridden by subclasses; base entity just idles
  update(_dt, _world) {}

  serialize() {
    return { id: this.id, type: this.type, x: this.x, y: this.y, facing: this.facing };
  }
}
