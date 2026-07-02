import { Entity } from './Entity.js';

export class Vehicle extends Entity {
  constructor(x, y, def) {
    super('vehicle', x, y);
    // def comes from a mod's manifest-registered vehicle definition, or a built-in default
    this.vehicleId = def?.id ?? 'core:cart';
    this.spriteKey = def?.spriteKey ?? 'vehicle_cart';
    this.width = def?.width ?? 1.4;
    this.height = def?.height ?? 1.4;
    this.maxSpeed = def?.maxSpeed ?? 8;
    this.acceleration = def?.acceleration ?? 14;
    this.turnRate = def?.turnRate ?? 3.2; // radians/sec
    this.fuel = def?.fuel ?? Infinity;
    this.driver = null;
    this.heading = 0; // radians
    this.ignoresWater = def?.amphibious ?? false;
  }

  update(dt, world) {
    if (!this.driver) {
      // idle friction
      this.vx *= Math.max(0, 1 - 4 * dt);
      this.vy *= Math.max(0, 1 - 4 * dt);
      return;
    }

    const input = this.driver.input;
    let turn = 0;
    if (input.left) turn -= 1;
    if (input.right) turn += 1;
    this.heading += turn * this.turnRate * dt;

    let throttle = 0;
    if (input.up) throttle = 1;
    if (input.down) throttle = -0.6;

    if (throttle !== 0 && this.fuel > 0) {
      this.vx += Math.cos(this.heading) * this.acceleration * throttle * dt;
      this.vy += Math.sin(this.heading) * this.acceleration * throttle * dt;
      if (this.fuel !== Infinity) this.fuel = Math.max(0, this.fuel - Math.abs(throttle) * dt);
    }

    this.speed = this.maxSpeed;
  }
}
