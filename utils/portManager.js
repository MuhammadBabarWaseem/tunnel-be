const Tunnel = require('../models/Tunnel');


class PortManager {
  constructor() {
    this.startPort = parseInt(process.env.TUNNEL_START_PORT) || 8000;
    this.endPort = parseInt(process.env.TUNNEL_END_PORT) || 9000;
    this.usedPorts = new Set();
  }

  async initialize() {
    // Load used ports from database
    const activeTunnels = await Tunnel.find({ active: true });
    activeTunnels.forEach(tunnel => {
      this.usedPorts.add(tunnel.port);
    });
  }

  async getAvailablePort() {
    for (let port = this.startPort; port <= this.endPort; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports');
  }

  releasePort(port) {
    this.usedPorts.delete(port);
  }

  isPortAvailable(port) {
    return !this.usedPorts.has(port);
  }
}

module.exports = new PortManager();

