// server/index.js - updated
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuid } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;

// const server = require('http').createServer(app); // Needed for WS upgrade
// Actually express app.listen returns the server instance.

app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// --- Battle Imports ---
const WebSocket = require("ws");
const battleManager = require("./battle/BattleManager");

// --- Existing Routes ---
// ... (Lobbies code is here, we keep it)

// In-memory lobby storage
// Structure:
// lobbies[lobbyId] = {
//   lobbyId, hostName, hostDeck, guestName?, guestDeck?, status: "waiting"|"ready"|"started", createdAt, count
// }
const lobbies = {};

// Create Lobby
app.post("/api/createLobby", (req, res) => {
  const { playerName, deckId } = req.body;
  const lobbyId = uuid().slice(0, 8).toUpperCase();

  lobbies[lobbyId] = {
    lobbyId,
    hostName: playerName || "Host",
    hostDeck: deckId || null,
    guestName: null,
    guestDeck: null,
    status: "waiting",
    createdAt: Date.now(),
    count: 1
  };

  res.json({ success: true, lobbyId });
});

// Join Lobby
app.post("/api/joinLobby", (req, res) => {
  const { lobbyId, playerName, deckId } = req.body;
  const lobby = lobbies[lobbyId];
  if (!lobby) return res.json({ success: false, reason: "Lobby not found" });
  if (lobby.status !== "waiting") return res.json({ success: false, reason: "Lobby not available" });

  lobby.guestName = playerName || "Guest";
  lobby.guestDeck = deckId || null;
  lobby.count = 2;
  lobby.status = "ready";

  res.json({ success: true });
});

// List Lobbies
app.get("/api/listLobbies", (req, res) => {
  const list = Object.values(lobbies).map((l) => ({
    lobbyId: l.lobbyId,
    hostName: l.hostName,
    count: l.count || 1,
    status: l.status
  }));
  res.json({ lobbies: list });
});

// Get single lobby (for polling/host view)
app.get("/api/lobby/:id", (req, res) => {
  const id = req.params.id;
  const l = lobbies[id];
  if (!l) return res.status(404).json({ success: false, reason: "not found" });
  res.json({ success: true, lobby: l });
});

// Start Battle (host action)
app.post("/api/startLobby", (req, res) => {
  const { lobbyId } = req.body;
  const l = lobbies[lobbyId];
  if (!l) return res.json({ success: false, reason: "Lobby not found" });
  if (l.status !== "ready") return res.json({ success: false, reason: "Lobby not ready" });

  l.status = "started";

  // Init Battle in Manager using passed Deck IDs (Client will send actual deck content via WS join or we fetch here? 
  // Ideally we need the actual deck content. 
  // For this demo, let's assume the clients will send their deck data when connecting to WS or we accept simplified structure.
  // Actually, let's pass dummy data here and let WS handle full init if needed, 
  // OR better: Clients posted DeckIDs. The server doesn't have the deck DB loaded in memory in this file.
  // We should load deck data or trust the client.
  // Let's modify BattleManager to accept data from WS Join payload, that's easier for "Start".
  // But wait, "Start" is an HTTP trigger.
  // Implementation choice:
  // 1. Host clicks start -> HTTP /start -> Server marks started.
  // 2. Clients navigate to /battle/:id.
  // 3. Clients connect WS with their Deck Data.
  // 4. Once both connected, BattleManager starts the game.

  res.json({ success: true });
});

// Delete Lobby
app.post("/api/deleteLobby", (req, res) => {
  const { lobbyId } = req.body;
  if (lobbies[lobbyId]) delete lobbies[lobbyId];
  res.json({ success: true });
});

const server = app.listen(PORT, () => {
  console.log("XrossStars Server Started:", PORT);
});

// --- WS Setup ---
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  battleManager.handleConnection(ws, req);
});

