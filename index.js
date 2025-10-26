require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const compression = require("compression");
const connectDB = require("./config/db");
const portManager = require("./utils/portManager");
const TunnelService = require("./services/tunnelService");
const Branch = require("./models/Branch");

// Routes
const authRoutes = require("./routes/auth");
const branchRoutes = require("./routes/branches");
const tunnelRoutes = require("./routes/tunnels");

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 120000, // 2 minutes
  pingInterval: 15000, // 15 seconds
  transports: ["websocket", "polling"],
  perMessageDeflate: true, // Enable compression for WebSocket
  allowUpgrades: true,
  upgradeTimeout: 30000,
});

// Middleware
app.use(compression()); // Enable gzip compression
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize port manager
portManager.initialize().then(() => {
  console.log("Port manager initialized");
});

// Initialize tunnel service
const tunnelService = new TunnelService(io);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/tunnels", tunnelRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Branch agent connection
  socket.on("agent-connect", async (data) => {
    try {
      const { apiKey } = data;

      // Verify API key
      const branch = await Branch.findOne({ apiKey });
      if (!branch) {
        socket.emit("error", { message: "Invalid API key" });
        socket.disconnect();
        return;
      }

      console.log(`Branch agent connected: ${branch.name}`);

      // Create tunnel
      const tunnelInfo = await tunnelService.createTunnel(
        branch._id.toString(),
        socket.id,
        socket
      );

      socket.emit("tunnel-created", {
        branchId: branch._id,
        branchName: branch.name,
        port: tunnelInfo.port,
        publicUrl: tunnelInfo.publicUrl,
      });

      // Broadcast to dashboard clients
      io.emit("branch-status-changed", {
        branchId: branch._id,
        status: "online",
        port: tunnelInfo.port,
        publicUrl: tunnelInfo.publicUrl,
      });
    } catch (error) {
      console.error("Agent connect error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    console.log("Client disconnected:", socket.id);

    const tunnelInfo = tunnelService.getTunnelBySocketId(socket.id);
    if (tunnelInfo) {
      await tunnelService.closeTunnel(tunnelInfo.branchId);

      // Broadcast to dashboard clients
      io.emit("branch-status-changed", {
        branchId: tunnelInfo.branchId,
        status: "offline",
      });
    }
  });

  // Heartbeat
  socket.on("heartbeat", () => {
    socket.emit("heartbeat-ack");
  });
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Tunnel ports available: ${process.env.TUNNEL_START_PORT}-${process.env.TUNNEL_END_PORT}`
  );
});
