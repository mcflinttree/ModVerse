import { Entity } from './Entity.js';

export class Player extends Entity {
  constructor(x, y, name = 'Player') {
    super('player', x, y);
    this.name = name;
    this.width = 0.7;
    this.height = 0.7;
    this.speed = 5.2;
    this.spriteKey = 'player';

    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.sprinting = false;

    this.inventory = null; // set by Inventory system after construction
    this.mountedVehicle = null;

    this.input = { up: false, down: false, left: false, right: false, sprint: false, interact: false };
  }

  applyInput(input) {
    this.input = input;
  }

  update(dt, world) {
    if (this.mountedVehicle) {
      // steering delegated to the vehicle; player position follows it
      this.x = this.mountedVehicle.x;
      this.y = this.mountedVehicle.y;
      return;
    }

    const accel = 22;
    let ix = 0, iy = 0;
    if (this.input.up) iy -= 1;
    if (this.input.down) iy += 1;
    if (this.input.left) ix -= 1;
    if (this.input.right) ix += 1;

    const len = Math.hypot(ix, iy);
    if (len > 0) { ix /= len; iy /= len; }

    this.sprinting = this.input.sprint && this.stamina > 0 && len > 0;
    const speedMul = this.sprinting ? 1.7 : 1;
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - 18 * dt);
    else this.stamina = Math.min(this.maxStamina, this.stamina + 10 * dt);

    this.vx += ix * accel * speedMul * dt;
    this.vy += iy * accel * speedMul * dt;
    this.speed = 5.2 * speedMul;

    if (ix !== 0 || iy !== 0) {
      if (Math.abs(ix) > Math.abs(iy)) this.facing = ix > 0 ? 'right' : 'left';
      else this.facing = iy > 0 ? 'down' : 'up';
    }
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  mount(vehicle) {
    this.mountedVehicle = vehicle;
    vehicle.driver = this;
    this.isSolidCollider = false;
  }

  dismount() {
    if (this.mountedVehicle) {
      this.x = this.mountedVehicle.x + 1;
      this.y = this.mountedVehicle.y;
      this.mountedVehicle.driver = null;
      this.mountedVehicle = null;
      this.isSolidCollider = true;
    }
  }
}
