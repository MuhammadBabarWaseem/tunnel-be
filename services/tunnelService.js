const Branch = require("../models/Branch");
const Tunnel = require("../models/Tunnel");
const Log = require("../models/Log");

class TunnelService {
  constructor(io) {
    this.io = io;
    this.tunnels = new Map(); // branchId -> { socketId, branchName, publicUrl }
  }

  async createTunnel(branchId, socketId, socket) {
    try {
      const branch = await Branch.findById(branchId);
      if (!branch) {
        throw new Error("Branch not found");
      }

      // Check if tunnel already exists
      if (this.tunnels.has(branchId)) {
        await this.closeTunnel(branchId);
      }

      // Generate path-safe branch name for URL
      let pathSafeName = branch.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // Ensure path is unique by appending a number if needed
      let counter = 1;
      let originalPath = pathSafeName;
      while (await Tunnel.findOne({ path: pathSafeName, active: true })) {
        pathSafeName = `${originalPath}-${counter}`;
        counter++;
      }

      // Create public URL using path-based routing
      const serverHost =
        process.env.PUBLIC_URL ||
        process.env.SERVER_HOST ||
        "connect.sichn.org";
      const publicUrl = `https://${serverHost}/tunnel/${pathSafeName}`;

      // Save tunnel info (no port needed for path-based routing)
      this.tunnels.set(branchId, {
        socketId,
        branchName: branch.name,
        publicUrl,
      });

      // Update branch status
      branch.status = "online";
      branch.assignedPort = null; // No longer using ports
      branch.publicUrl = publicUrl;
      branch.lastConnected = new Date();
      await branch.save();

      // Create tunnel record in database
      await Tunnel.create({
        branch: branchId,
        port: null, // No port for path-based routing
        path: pathSafeName, // Store the path for this tunnel
        socketId,
        active: true,
      });

      // Log connection
      await Log.create({
        branch: branchId,
        type: "connection",
        message: `Tunnel established for branch ${branch.name}`,
        metadata: { branchName: branch.name, publicUrl },
      });

      console.log(`Tunnel created for branch ${branch.name} at ${publicUrl}`);
      return { branchName: branch.name, publicUrl };
    } catch (error) {
      console.error("Error creating tunnel:", error);
      throw error;
    }
  }

  async closeTunnel(branchId) {
    try {
      const tunnelInfo = this.tunnels.get(branchId);
      if (!tunnelInfo) {
        return;
      }

      // Remove from map
      this.tunnels.delete(branchId);

      // Update branch status
      const branch = await Branch.findById(branchId);
      if (branch) {
        branch.status = "offline";
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
        type: "disconnection",
        message: `Tunnel closed for branch ${tunnelInfo.branchName}`,
        metadata: { branchName: tunnelInfo.branchName },
      });

      console.log(`Tunnel closed for branch ${branchId}`);
    } catch (error) {
      console.error("Error closing tunnel:", error);
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

  // New method to handle tunnel requests by path
  handleTunnelRequest(req, res, pathName) {
    // Find tunnel by path name
    let targetTunnel = null;
    let targetBranchId = null;

    for (const [branchId, tunnelInfo] of this.tunnels.entries()) {
      const pathSafeName = tunnelInfo.branchName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (pathSafeName === pathName) {
        targetTunnel = tunnelInfo;
        targetBranchId = branchId;
        break;
      }
    }

    if (!targetTunnel) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Tunnel not found");
      return;
    }

    // Get the socket for this tunnel
    const socket = this.io.sockets.sockets.get(targetTunnel.socketId);
    if (!socket) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("Tunnel offline");
      return;
    }

    // Generate unique ID for this request
    const { v4: uuidv4 } = require("uuid");
    const requestId = uuidv4();

    console.log(`[Tunnel ${pathName}] ${req.method} ${req.url}`);

    // Collect request body
    let body = [];
    req.on("data", (chunk) => {
      body.push(chunk);
    });

    req.on("end", () => {
      const bodyBuffer = Buffer.concat(body);

      // Forward complete request through WebSocket to branch
      socket.emit("proxy-request", {
        id: requestId,
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: bodyBuffer.toString("base64"), // Send as base64 to handle binary data
      });

      // Listen for response from branch
      const responseHandler = (data) => {
        if (data.id === requestId) {
          try {
            // Set response headers
            res.writeHead(data.statusCode, data.headers);

            // Send response body (decode from base64 if needed)
            if (data.bodyEncoding === "base64") {
              res.end(Buffer.from(data.body, "base64"));
            } else {
              res.end(data.body);
            }

            socket.off("proxy-response", responseHandler);
          } catch (err) {
            console.error("Error sending response:", err);
            if (!res.headersSent) {
              res.writeHead(500, { "Content-Type": "text/plain" });
              res.end("Internal Server Error");
            }
          }
        }
      };

      socket.on("proxy-response", responseHandler);

      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          socket.off("proxy-response", responseHandler);
          res.writeHead(504, { "Content-Type": "text/plain" });
          res.end("Gateway Timeout");
        }
      }, 30000);

      // Clean up timeout when response is sent
      res.on("finish", () => {
        clearTimeout(timeout);
      });
    });
  }
}

module.exports = TunnelService;
