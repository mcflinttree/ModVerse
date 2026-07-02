export class NetClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('modverse_token') || null;
    this.ws = null;
    this.wsHandlers = new Set();
    this.connected = false;
  }

  async _fetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(this.baseUrl + path, { ...opts, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async register(username, password) {
    const data = await this._fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
    this._storeToken(data.token);
    return data;
  }

  async login(username, password) {
    const data = await this._fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    this._storeToken(data.token);
    return data;
  }

  _storeToken(token) {
    this.token = token;
    localStorage.setItem('modverse_token', token);
  }

  isAuthenticated() { return !!this.token; }

  async listSaves() { return this._fetch('/api/saves'); }
  async loadSave(slot) { return this._fetch(`/api/saves/${slot}`); }
  async writeSave(slot, worldSeed, payload) {
    return this._fetch(`/api/saves/${slot}`, { method: 'PUT', body: JSON.stringify({ worldSeed, payload }) });
  }

  async loadChunkEdits(seed, cx, cy) {
    const data = await this._fetch(`/api/chunks/${seed}/${cx}/${cy}`);
    return data.edits;
  }
  async saveChunkEdits(seed, cx, cy, edits) {
    return this._fetch(`/api/chunks/${seed}/${cx}/${cy}`, { method: 'PUT', body: JSON.stringify({ edits }) });
  }

  async listServerMods() { return this._fetch('/api/mods'); }

  // --- Multiplayer WebSocket channel ---
  connectMultiplayer(room, playerId, wsUrl) {
    const url = wsUrl || `${location.origin.replace(/^http/, 'ws')}/mp`;
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => {
      this.connected = true;
      this.ws.send(JSON.stringify({ type: 'join', room, playerId }));
    });
    this.ws.addEventListener('close', () => { this.connected = false; });
    this.ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this.wsHandlers.forEach((fn) => fn(msg));
    });
  }

  onMessage(fn) { this.wsHandlers.add(fn); return () => this.wsHandlers.delete(fn); }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  broadcastState(playerState) {
    this.send({ type: 'state', ...playerState });
  }
}
