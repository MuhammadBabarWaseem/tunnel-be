const Tunnel = require('../models/Tunnel');


class PortManager {
  constructor() {
    this.startPort = parseInt(process.env.TUNNEL_START_PORT) || 8000;
    this.endPort = parseInt(process.env.TUNNEL_END_PORT) || 9000;
    this.usedPorts = new Set();
  }

  async initialize() {
    try {
      // Load used ports from database
      const activeTunnels = await Tunnel.find({ active: true });
      activeTunnels.forEach(tunnel => {
        this.usedPorts.add(tunnel.port);
      });
      console.log(`Port manager loaded ${activeTunnels.length} active tunnels`);
    } catch (error) {
      console.error('Error initializing port manager:', error);
      // Continue with empty port set if database query fails
      this.usedPorts = new Set();
    }
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

