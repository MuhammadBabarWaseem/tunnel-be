const http = require('http');
const httpProxy = require('http-proxy');
const { v4: uuidv4 } = require('uuid');
const Branch = require('../models/Branch');
const Tunnel = require('../models/Tunnel');
const Log = require('../models/Log');
const portManager = require('../utils/portManager');

class TunnelService {
  constructor(io) {
    this.io = io;
    this.tunnels = new Map(); // branchId -> { proxy, server, port, socketId }
  }

  async createTunnel(branchId, socketId, socket) {
    try {
      const branch = await Branch.findById(branchId);
      if (!branch) {
        throw new Error('Branch not found');
      }

      // Check if tunnel already exists
      if (this.tunnels.has(branchId)) {
        await this.closeTunnel(branchId);
      }

      // Get available port
      const port = await portManager.getAvailablePort();

      // Create proxy
      const proxy = httpProxy.createProxyServer({
        ws: true,
        changeOrigin: true,
      });

      // Handle proxy errors
      proxy.on('error', async (err, req, res) => {
        console.error('Proxy error:', err);
        if (res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Bad Gateway - Unable to reach branch portal');
        }

        await Log.create({
          branch: branchId,
          type: 'error',
          message: 'Proxy error',
          metadata: { error: err.message },
        });
      });

      // Create HTTP server for this tunnel
      const server = http.createServer((req, res) => {
        // Generate unique ID for this request
        const requestId = uuidv4();
        
        console.log(`[Tunnel ${port}] ${req.method} ${req.url}`);

        // Collect request body
        let body = [];
        req.on('data', chunk => {
          body.push(chunk);
        });

        req.on('end', () => {
          const bodyBuffer = Buffer.concat(body);
          
          // Forward complete request through WebSocket to branch
          socket.emit('proxy-request', {
            id: requestId,
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: bodyBuffer.toString('base64'), // Send as base64 to handle binary data
          });

          // Listen for response from branch
          const responseHandler = (data) => {
            if (data.id === requestId) {
              try {
                // Set response headers
                res.writeHead(data.statusCode, data.headers);
                
                // Send response body (decode from base64 if needed)
                if (data.bodyEncoding === 'base64') {
                  res.end(Buffer.from(data.body, 'base64'));
                } else {
                  res.end(data.body);
                }
                
                socket.off('proxy-response', responseHandler);
              } catch (err) {
                console.error('Error sending response:', err);
                if (!res.headersSent) {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Internal Server Error');
                }
              }
            }
          };

          socket.on('proxy-response', responseHandler);

          // Timeout after 30 seconds
          const timeout = setTimeout(() => {
            if (!res.headersSent) {
              socket.off('proxy-response', responseHandler);
              res.writeHead(504, { 'Content-Type': 'text/plain' });
              res.end('Gateway Timeout');
            }
          }, 30000);

          // Clean up timeout when response is sent
          res.on('finish', () => {
            clearTimeout(timeout);
          });
        });
      });

      // Start server
      await new Promise((resolve, reject) => {
        server.listen(port, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Save tunnel info
      this.tunnels.set(branchId, { proxy, server, port, socketId });

      // Update branch status
      // Get server's public URL from environment or use IP
      const serverHost = process.env.PUBLIC_URL || process.env.SERVER_HOST || 'localhost';
      const publicUrl = `http://${serverHost}:${port}`;
      branch.status = 'online';
      branch.assignedPort = port;
      branch.publicUrl = publicUrl;
      branch.lastConnected = new Date();
      await branch.save();

      // Create tunnel record in database
      await Tunnel.create({
        branch: branchId,
        port,
        socketId,
        active: true,
      });

      // Log connection
      await Log.create({
        branch: branchId,
        type: 'connection',
        message: `Tunnel established on port ${port}`,
        metadata: { port, publicUrl },
      });

      console.log(`Tunnel created for branch ${branch.name} on port ${port}`);
      return { port, publicUrl };

    } catch (error) {
      console.error('Error creating tunnel:', error);
      throw error;
    }
  }

  async closeTunnel(branchId) {
    try {
      const tunnelInfo = this.tunnels.get(branchId);
      if (!tunnelInfo) {
        return;
      }

      const { server, port } = tunnelInfo;

      // Close server
      await new Promise((resolve) => {
        server.close(() => resolve());
      });

      // Release port
      portManager.releasePort(port);

      // Remove from map
      this.tunnels.delete(branchId);

      // Update branch status
      const branch = await Branch.findById(branchId);
      if (branch) {
        branch.status = 'offline';
        branch.assignedPort = null;
        branch.publicUrl = null;
        await branch.save();
      }

      // Deactivate tunnel in database
      await Tunnel.updateMany(
        { branch: branchId, active: true },
        { active: false }
      );

      // Log disconnection
      await Log.create({
        branch: branchId,
        type: 'disconnection',
        message: `Tunnel closed on port ${port}`,
        metadata: { port },
      });

      console.log(`Tunnel closed for branch ${branchId}`);
    } catch (error) {
      console.error('Error closing tunnel:', error);
    }
  }

  getTunnelByBranch(branchId) {
    return this.tunnels.get(branchId);
  }

  getTunnelBySocketId(socketId) {
    for (const [branchId, tunnelInfo] of this.tunnels.entries()) {
      if (tunnelInfo.socketId === socketId) {
        return { branchId, ...tunnelInfo };
      }
    }
    return null;
  }
}

module.exports = TunnelService;

