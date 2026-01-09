const { PeerServer } = require("peer");

const PORT = process.env.PORT || 9000;

const peerServer = PeerServer({
  port: PORT,
  host: "0.0.0.0",
  path: "/",
  allow_discovery: false,
  concurrent_limit: 5000,
  alive_timeout: 90000,
  expire_timeout: 5000,
  corsOptions: {
    origin: true,
  },
});

peerServer.on("connection", (client) => {
  console.log(`✅ Peer connected: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`❌ Peer disconnected: ${client.getId()}`);
});

console.log(`🚀 PeerJS Server running on port ${PORT}`);
