const GameState = require("./GameState");

class BattleManager {
    constructor() {
        this.battles = {}; // { lobbyId: GameState }
        this.connections = {}; // { playerId: WebSocket }
        this.lobbyBuffers = {}; // { lobbyId: { [playerId]: { name, deck } } }
    }

    handleConnection(ws, req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const lobbyId = url.searchParams.get("lobbyId");
        const playerId = url.searchParams.get("playerId"); // Assuming unique UUID from client

        if (!lobbyId || !playerId) {
            ws.close();
            return;
        }

        // Replace old connection
        this.connections[playerId] = ws;

        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message);
                // Special handler for JOIN
                if (data.type === "JOIN_GAME") {
                    this.handleJoin(lobbyId, playerId, data);
                } else {
                    this.handleMessage(lobbyId, playerId, data, ws);
                }
            } catch (e) {
                console.error("Invalid message", e);
            }
        });

        ws.on("close", () => {
            // Cleanup? 
            // In a real match, we might want reconnection window.
        });
    }

    handleJoin(lobbyId, playerId, data) {
        if (!this.lobbyBuffers[lobbyId]) this.lobbyBuffers[lobbyId] = {};

        // Validate deck data exists
        if (!data.deck) return;

        this.lobbyBuffers[lobbyId][playerId] = {
            id: playerId,
            name: data.playerName || "Player",
            deck: data.deck
        };

        const participants = Object.values(this.lobbyBuffers[lobbyId]);
        if (participants.length === 2) {
            // Start Game
            console.log(`Starting battle for lobby ${lobbyId}`);
            this.createBattle(lobbyId, participants[0], participants[1]);
            delete this.lobbyBuffers[lobbyId];
        }
    }

    createBattle(lobbyId, p1, p2) {
        this.battles[lobbyId] = new GameState(p1, p2);
        this.battles[lobbyId].startGame();
        this.broadcastState(lobbyId);
    }

    handleMessage(lobbyId, playerId, data, ws) {
        const battle = this.battles[lobbyId];
        if (!battle) return;

        switch (data.type) {
            case "PLAY_CARD":
                battle.playCard(playerId, data.cardIndex, data.target);
                this.broadcastState(lobbyId);
                break;
            case "SELECT_TACTICS":
                battle.selectTactics(playerId, data.cardIndex);
                this.broadcastState(lobbyId);
                break;
            case "USE_TACTICS":
                battle.useTactics(playerId, data.cardIndex);
                this.broadcastState(lobbyId);
                break;
            case "ATTACK":
                // Expecting attackerLeaderIndex and targetLeaderIndex
                battle.attack(playerId, data.attackerIndex, data.targetIndex);
                this.broadcastState(lobbyId);
                break;
            case "END_TURN":
                battle.endTurn(playerId);
                this.broadcastState(lobbyId);
                break;
            case "RESOLVE_ACTION":
                battle.resolveAction(playerId, data);
                this.broadcastState(lobbyId);
                break;
        }
    }

    broadcastState(lobbyId) {
        const battle = this.battles[lobbyId];
        if (!battle) return;

        battle.playerIds.forEach(pid => {
            const socket = this.connections[pid];
            if (socket && socket.readyState === 1) { // OPEN
                const state = battle.getSecretState(pid);
                // Debug: Log pending action
                if (state.players[pid]?.pendingAction) {
                    console.log("[DEBUG SERVER] Broadcasting pendingAction:", pid, state.players[pid].pendingAction.type);
                }
                socket.send(JSON.stringify({ type: "STATE_UPDATE", state }));
            }
        });
    }
}

module.exports = new BattleManager();
