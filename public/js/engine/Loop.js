export class Loop {
  /**
   * @param {(dt:number)=>void} update fixed-step update (seconds)
   * @param {(alpha:number, frameDt:number)=>void} render render callback, alpha = interpolation factor
   */
  constructor(update, render, stepHz = 60) {
    this.update = update;
    this.render = render;
    this.stepMs = 1000 / stepHz;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.rafId = null;
    this.fps = 0;
    this._frameCount = 0;
    this._fpsTimer = 0;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._tick.bind(this));
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _tick(now) {
    if (!this.running) return;
    let frameDt = now - this.lastTime;
    this.lastTime = now;
    if (frameDt > 250) frameDt = 250; // clamp huge gaps (tab backgrounded)

    this.accumulator += frameDt;
    while (this.accumulator >= this.stepMs) {
      this.update(this.stepMs / 1000);
      this.accumulator -= this.stepMs;
    }

    const alpha = this.accumulator / this.stepMs;
    this.render(alpha, frameDt / 1000);

    this._frameCount++;
    this._fpsTimer += frameDt;
    if (this._fpsTimer >= 1000) {
      this.fps = this._frameCount;
      this._frameCount = 0;
      this._fpsTimer = 0;
    }

    this.rafId = requestAnimationFrame(this._tick.bind(this));
  }
}
