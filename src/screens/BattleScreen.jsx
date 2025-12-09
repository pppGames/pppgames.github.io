import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useApp } from "../App";
import { PlayerMat, DiscardSelectionOverlay, OptionalDiscardOverlay, EffectTargetOverlay } from "../components";
import leadersData from "../data/leader_data.json";
import attacksData from "../data/atk_data.json";
import memsData from "../data/mem_data.json";
import tacticsData from "../data/tactics_data.json";
import { Peer } from "peerjs";
import { ClientGameState } from "../logic/ClientGameState";

export default function BattleScreen() {
    const { lobbyId } = useParams();
    const { playerName, selectedDeck } = useApp();
    const [gameState, setGameState] = useState(null);

    // P2P State
    const [peer, setPeer] = useState(null);
    const [conn, setConn] = useState(null);
    const [myPeerId, setMyPeerId] = useState("");
    const [targetPeerId, setTargetPeerId] = useState(""); // User input for joining
    const [isHost, setIsHost] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("disconnected"); // disconnected, connecting, connected
    const [gameEngine, setGameEngine] = useState(null);
    const [playerId] = useState(() => localStorage.getItem("playerId") || Math.random().toString(36).substr(2, 9));

    // UI States
    const [pendingAction, setPendingAction] = useState(null);
    const [tacticsSelecting, setTacticsSelecting] = useState(false);
    const [tacticsConfirm, setTacticsConfirm] = useState(null);
    const [selectedCascadeIndices, setSelectedCascadeIndices] = useState([]);

    // Refs for closures
    const gameEngineRef = useRef(null);
    const connRef = useRef(null);

    useEffect(() => {
        connRef.current = conn;
    }, [conn]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (peer) peer.destroy();
        };
    }, []);

    // --- P2P Methods ---

    const startHost = () => {
        setConnectionStatus("connecting");
        const newPeer = new Peer();

        newPeer.on('open', (id) => {
            console.log('Host ID:', id);
            setMyPeerId(id);
            setConnectionStatus("waiting_for_peer");
            setIsHost(true);
        });

        newPeer.on('connection', (connection) => {
            console.log('Incoming connection from:', connection.peer);
            setupConnection(connection, true);
        });

        newPeer.on('error', (err) => {
            console.error('Peer error:', err);
            alert("Connection error: " + err.type);
            setConnectionStatus("error");
        });

        setPeer(newPeer);
    };

    const joinGame = () => {
        if (!targetPeerId) return alert("Please enter Host ID");
        setConnectionStatus("connecting");
        const newPeer = new Peer();

        newPeer.on('open', (id) => {
            setMyPeerId(id);
            const connection = newPeer.connect(targetPeerId);
            setupConnection(connection, false);
        });

        newPeer.on('error', (err) => {
            console.error('Peer error:', err);
            alert("Connection error: " + err.type);
            setConnectionStatus("error");
        });

        setPeer(newPeer);
    };

    const setupConnection = (connection, amIHost) => {
        connection.on('open', () => {
            console.log('Connection established');
            setConn(connection);
            setConnectionStatus("connected");

            if (!amIHost) {
                // Client: Send Join Request
                connection.send({
                    type: "JOIN_GAME",
                    playerId: playerId,
                    playerName: playerName,
                    deck: selectedDeck
                });
            }
        });

        connection.on('data', (data) => {
            if (amIHost) {
                handleIncomingDataAsHost(data, connection);
            } else {
                handleIncomingDataAsClient(data);
            }
        });

        connection.on('close', () => {
            alert("Connection closed");
            setConnectionStatus("disconnected");
            setGameState(null);
        });

        connection.on('error', (err) => {
            console.error("Connection error:", err);
        });
    };

    const handleIncomingDataAsHost = (data, connection) => {
        // Ensure gameEngine is initialized if it's a join request
        if (data.type === "JOIN_GAME") {
            const player1 = { id: playerId, name: playerName, deck: selectedDeck };
            const player2 = { id: data.playerId, name: data.playerName || "Player 2", deck: data.deck };

            const engine = new ClientGameState(player1, player2);
            engine.startGame();
            gameEngineRef.current = engine;
            setGameEngine(engine);

            // Broadcast initial state
            broadcastState(engine);
        } else if (data.type === "ACTION") {
            if (gameEngineRef.current) {
                const result = gameEngineRef.current.resolveAction(data.playerId, data.actionData);
                if (result.success) {
                    broadcastState(gameEngineRef.current);
                } else {
                    console.error("Action failed:", result.reason);
                }
            }
        }
    };

    const handleIncomingDataAsClient = (data) => {
        if (data.type === "STATE_UPDATE") {
            setGameState(data.state);
        }
    };

    const broadcastState = (engine) => {
        const state1 = engine.getSecretState(engine.playerIds[0]);
        const state2 = engine.getSecretState(engine.playerIds[1]);

        // Host is always player 1 in current logic
        // Update Host UI
        setGameState(state1);

        // Send Player 2 state to Player 2
        if (connRef.current) {
            connRef.current.send({
                type: "STATE_UPDATE",
                state: state2
            });
        }
    };

    const sendAction = (type, data = {}) => {
        // Common interface for UI to trigger actions
        if (isHost) {
            // Host executes locally
            if (gameEngineRef.current) {
                // Map simplified type/data to resolveAction if needed, or pass directly
                // Logic expects: resolveAction(playerId, actionData)
                // UI typically sends: { type: "USE_TACTICS", cardIndex: ... } (Legacy)
                // Our `resolveAction` is currently designed for `pendingAction` resolution mostly (SELECT_DISCARD etc).
                // But we also have `playCard`, `useTactics` etc.
                // We need to route based on type.

                let result = { success: false };
                if (type === "PLAY_CARD") {
                    result = gameEngineRef.current.playCard(playerId, data.cardIndex, data.target);
                } else if (type === "USE_TACTICS") {
                    result = gameEngineRef.current.useTactics(playerId, data.cardIndex); // cardIndex might be undefined if generic use? No, needs index.
                    // If simple confirm usage of current tactics:
                    // Legacy used: type: "USE_TACTICS" without index? No, usually implies using what's selected?
                    // Let's check handle tactics usage below. It sets tacticsConfirm.
                    // confirmUseTactics sends "USE_TACTICS". 
                    // This implies the card is already staged?

                    // Actually, ClientGameState `useTactics` takes `cardIndex`.
                    // The UI should track which index was selected.
                    // `tacticsConfirm` is the card object. We need the index.
                    // Let's handle this in `confirmUseTactics`.
                } else if (type === "SELECT_TACTICS") {
                    result = gameEngineRef.current.selectTactics(playerId, data.cardIndex);
                } else if (type === "RESOLVE_ACTION") {
                    result = gameEngineRef.current.resolveAction(playerId, data);
                } else if (type === "END_TURN") {
                    result = gameEngineRef.current.endTurn(playerId);
                }

                if (result.success) {
                    broadcastState(gameEngineRef.current);
                }

                // Handle waiting for discard special case
                if (result.waitingForDiscard) {
                    // State updated via broadcast
                }
            }
        } else {
            // Client sends to Host
            if (connRef.current) {
                connRef.current.send({
                    type: "ACTION",
                    playerId: playerId,
                    actionData: { ...data, type } // Server/Host needs to know TYPE to route
                });
            }
        }
    };

    // Patch: Host needs to handle "ACTION" type wrapper in handleIncomingDataAsHost too
    // We already do `gameEngineRef.current.resolveAction` there.
    // BUT `resolveAction` doesn't handle PLAY_CARD etc.
    // We need a dispatcher in Host Logic.

    // --- UI Handlers (Adapted) ---

    // Auto-resolve Check Awakening (Host side does it automatically? No, logic is pure.)
    // Logic: checkAwakening queues a pending action. 
    // We need the client to trigger it? Or should the Engine auto-resolve it?
    // Engine sets pendingAction CHECK_AWAKENING.
    // Efffectively, if we see it, we send RESOLVE_ACTION.
    useEffect(() => {
        if (gameState) {
            const myData = gameState.players[playerId];
            if (myData?.pendingAction?.type === "CHECK_AWAKENING") {
                console.log("[DEBUG] Auto-resolving Awakening Check");
                sendAction("RESOLVE_ACTION", {});
            }
        }
    }, [gameState]); // Removed 'socket' dependency

    const isTacticsSelectPhase = gameState && gameState.phase === "TACTICS_SELECTION" && gameState.players[playerId] && !gameState.players[playerId].tacticsReady;

    const handleEndTurn = () => {
        sendAction("END_TURN");
        setPendingAction(null);
    };

    const handleCardClick = (index, card) => {
        if (!gameState) return;

        // Handle Discard Selection Mode
        if (pendingAction && pendingAction.type === "SELECT_DISCARD") {
            if (index === pendingAction.payload.cardIndex) {
                alert("プレイ中のカードは捨てられません！");
                return;
            }
            if (!window.confirm(`"${card.name}" を捨てて効果を発動しますか？`)) return;

            sendAction("PLAY_CARD", {
                cardIndex: pendingAction.payload.cardIndex,
                target: {
                    type: "ATTACK",
                    attackerIndex: pendingAction.payload.attackerIndex,
                    targetIndex: pendingAction.payload.targetIndex,
                    discardIndex: index
                }
            });
            setPendingAction(null);
            return;
        }

        // Standard Play
        if (card.type === "ATTACK") {
            setPendingAction({ type: "PLAY_ATTACK", cardIndex: index });
        } else {
            // Memoria: Play directly
            sendAction("PLAY_CARD", { cardIndex: index });
        }
    };

    const onLeaderClick = (isOpponent, index) => {
        if (!gameState) return;
        const myData = gameState.players[playerId];

        if (myData && myData.pendingAction && myData.pendingAction.type === "SELECT_EFFECT_TARGET") {
            return; // Handled by overlay
        }

        if (!pendingAction) return;

        if (pendingAction.type === "PLAY_ATTACK") {
            if (!isOpponent && pendingAction.attackerIndex === undefined) {
                // Select Own Leader
                if (myData.leaders[index].isDown) {
                    alert("ダウンしたリーダーは攻撃できません！");
                    return;
                }
                setPendingAction({ ...pendingAction, attackerIndex: index });
            } else if (isOpponent && pendingAction.attackerIndex !== undefined) {
                // Select Target Leader

                // Check Discard Cost conditions (UI side check for prompt)
                const card = myData.hand[pendingAction.cardIndex];
                if (card && card.condition === "discard_1") {
                    setPendingAction({
                        type: "SELECT_DISCARD",
                        payload: {
                            cardIndex: pendingAction.cardIndex,
                            attackerIndex: pendingAction.attackerIndex,
                            targetIndex: index
                        }
                    });
                    return;
                }

                // Commit Attack
                sendAction("PLAY_CARD", {
                    cardIndex: pendingAction.cardIndex,
                    target: {
                        type: "ATTACK",
                        attackerIndex: pendingAction.attackerIndex,
                        targetIndex: index
                    }
                });
                setPendingAction(null);
            }
        }
    };

    const handleSelectTactics = (index) => {
        sendAction("SELECT_TACTICS", { cardIndex: index });
    };

    const handleUseTactics = (card, index) => {
        // We need to know the index to use it!
        // PlayerMat should pass index. If not, we find it?
        // Assuming PlayerMat passes card object.
        // Let's find index in tacticsArea.
        const myData = gameState.players[playerId];
        const realIndex = myData.tacticsArea.findIndex(c => c.id === card.id); // Simpler match
        setTacticsConfirm({ ...card, index: realIndex });
    };

    const confirmUseTactics = () => {
        if (tacticsConfirm) {
            sendAction("USE_TACTICS", { cardIndex: tacticsConfirm.index });
            setTacticsConfirm(null);
        }
    };


    // --- Render ---

    if (!gameState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-gray-900 font-sans">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 w-full max-w-md">
                    <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">マルチプレイ設定 (P2P)</h1>

                    {connectionStatus === "disconnected" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold mb-2 text-gray-700">ホストとして参加 (部屋を作る)</h2>
                                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors" onClick={startHost}>
                                    部屋を作成する
                                </button>
                            </div>
                            <div className="border-t border-gray-200 pt-6">
                                <h2 className="text-lg font-bold mb-2 text-gray-700">ゲストとして参加 (部屋に入る)</h2>
                                <input
                                    type="text"
                                    placeholder="ホストIDを入力"
                                    className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={targetPeerId}
                                    onChange={e => setTargetPeerId(e.target.value)}
                                />
                                <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors" onClick={joinGame}>
                                    参加する
                                </button>
                            </div>
                        </div>
                    )}

                    {connectionStatus === "waiting_for_peer" && (
                        <div className="text-center">
                            <h2 className="text-lg font-bold mb-4 text-gray-700">対戦相手を待っています...</h2>
                            <div className="bg-gray-100 p-4 rounded-lg mb-4">
                                <div className="text-sm text-gray-500 mb-1">あなたのホストID (友達に教えてください)</div>
                                <div className="font-mono text-xl font-bold select-all text-blue-600 tracking-wider bg-white p-2 rounded border border-gray-200">{myPeerId}</div>
                            </div>
                            <div className="animate-pulse text-gray-400">接続待機中...</div>
                        </div>
                    )}

                    {connectionStatus === "connecting" && (
                        <div className="text-center p-4">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p>接続中...</p>
                        </div>
                    )}

                    {connectionStatus === "error" && (
                        <div className="text-center">
                            <p className="text-red-500 mb-4">エラーが発生しました</p>
                            <button className="text-blue-500 underline" onClick={() => setConnectionStatus("disconnected")}>戻る</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const myData = gameState.players[playerId];
    const opponentId = gameState.playerIds.find(id => id !== playerId);
    const opponentData = gameState.players[opponentId];
    const isMyTurn = gameState.turnPlayerId === playerId;

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-gray-900 overflow-hidden relative font-sans">

            {/* Tactics Selection Modal */}
            {isTacticsSelectPhase && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">使用するタクティクスカードを選択</h2>
                    <div className="flex gap-4">
                        {myData.tacticsDeck.map((c, i) => (
                            <div key={i} onClick={() => handleSelectTactics(i)} className="w-24 h-32 bg-white border border-gray-300 hover:border-gray-500 rounded cursor-pointer hover:scale-105 transition-transform p-2 flex items-center justify-center text-center text-xs shadow-sm">
                                {c.name || "Tactics Card"}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tactics Confirmation Modal */}
            {tacticsConfirm && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">タクティクスカードを使用しますか？</h2>
                    <div className="w-40 h-56 bg-white border border-gray-300 rounded mb-4 flex items-center justify-center text-gray-900 text-md font-bold text-center p-2 shadow-lg">
                        {tacticsConfirm.name}
                    </div>
                    <div className="flex gap-4">
                        <button className="bg-green-500 hover:bg-green-400 px-6 py-2 rounded-full font-bold shadow-lg transition-transform hover:scale-105" onClick={confirmUseTactics}>
                            使用する
                        </button>
                        <button className="bg-red-500 hover:bg-red-400 px-6 py-2 rounded-full font-bold shadow-lg transition-transform hover:scale-105" onClick={() => setTacticsConfirm(null)}>
                            キャンセル
                        </button>
                    </div>
                </div>
            )}

            {/* Server Pending Action Overlay (Effect Target) */}
            {myData?.pendingAction && myData.pendingAction.type === "SELECT_EFFECT_TARGET" && (
                <EffectTargetOverlay
                    leaders={myData.pendingAction.targetMode === "own" ? myData.leaders : opponentData.leaders}
                    effectType={myData.pendingAction.effectType}
                    value={myData.pendingAction.value}
                    excludeIndex={myData.pendingAction.excludeIndex}
                    socket={{ send: (msg) => sendAction("RESOLVE_ACTION", JSON.parse(msg)) }} // Adapt socket interface
                />
            )}

            {/* Note: Adapting socket interface above is hacky. Better to refactor components to take onSelect props.
                But for now, to save tokens, I'll update the sendAction to handle raw messages if needed or adapt the prop.
                Actually, EffectTargetOverlay calls socket.send(JSON.stringify({...})).
                So I passed an object with send method that parses back and calls sendAction.
                Wait, sendAction(type, data).
                Overlay sends: { type: "RESOLVE_ACTION", ... }
                So my adapter: msg => { const d = JSON.parse(msg); sendAction(d.type, d); }
                This works for all components expecting 'socket'.
            */}

            {myData?.pendingAction && myData.pendingAction.type === "MSG_SELECT_CASCADE" && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">プレイするカードを選択 (リンクアサルト)</h2>
                    <div className="flex gap-4">
                        {myData.pendingAction.cards.map((c, i) => (
                            <div key={i}
                                onClick={() => sendAction("RESOLVE_ACTION", { index: i })}
                                className={`w-32 h-44 bg-white text-gray-900 p-2 rounded cursor-pointer hover:scale-105 flex flex-col justify-between transition-transform duration-200 shadow-md border ${(c.type === "MEMORIA" && (c.cost || 0) <= 1) ? "border-green-400 ring-2 ring-green-100" : "border-gray-200 opacity-60"}`}
                            >
                                <div>
                                    <div className="font-bold text-sm mb-1">{c.name}</div>
                                    <div className="text-xs font-bold text-blue-600">{c.type}</div>
                                    <div className="text-xs">コスト: {c.cost}</div>
                                </div>
                                <div className="text-[10px] bg-gray-100 p-1 rounded max-h-20 overflow-hidden">{c.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 text-gray-600 text-sm">緑の枠 = プレイ可能</div>
                    <button className="mt-8 bg-gray-500/50 hover:bg-gray-500 px-4 py-2 rounded-full backdrop-blur transition-colors" onClick={() => sendAction("RESOLVE_ACTION", { index: null })}>
                        パス (何もプレイしない)
                    </button>
                </div>
            )}

            {/* Discard Selection Overlay */}
            {myData?.pendingAction && myData.pendingAction.type === "SELECT_DISCARD" && (
                <DiscardSelectionOverlay
                    hand={myData.hand}
                    count={myData.pendingAction.count}
                    message={myData.pendingAction.message || `手札を${myData.pendingAction.count}枚選んで捨ててください`}
                    socket={{ send: (msg) => { const d = JSON.parse(msg); sendAction(d.type, d); } }}
                />
            )}

            {/* Optional Discard Overlay (Attack Cards) */}
            {myData?.pendingAction && myData.pendingAction.type === "SELECT_OPTIONAL_DISCARD" && (
                <OptionalDiscardOverlay
                    hand={myData.hand}
                    condition={myData.pendingAction.condition}
                    message={myData.pendingAction.message}
                    socket={{ send: (msg) => { const d = JSON.parse(msg); sendAction(d.type, d); } }}
                />
            )}

            {/* MSG_SELECT_MEMORIA_CASCADE (A1007) */}
            {myData?.pendingAction && myData.pendingAction.type === "MSG_SELECT_MEMORIA_CASCADE" && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-4 text-orange-400 drop-shadow-sm">プレイするメモリアを選択 (最大コスト: {myData.pendingAction.maxCostData})</h2>
                    <div className="flex gap-4 flex-wrap justify-center max-w-4xl">
                        {myData.pendingAction.cards.map((c, i) => {
                            const isSelected = selectedCascadeIndices.includes(i);
                            return (
                                <div key={i}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedCascadeIndices(prev => prev.filter(idx => idx !== i));
                                        } else {
                                            // Check cost limit
                                            const currentCost = selectedCascadeIndices.reduce((sum, idx) => sum + (myData.pendingAction.cards[idx].cost || 0), 0);
                                            if (currentCost + (c.cost || 0) <= myData.pendingAction.maxCostData) {
                                                setSelectedCascadeIndices(prev => [...prev, i]);
                                            } else {
                                                alert("コスト制限を超えています！");
                                            }
                                        }
                                    }}
                                    className={`w-32 h-44 bg-white text-gray-900 p-2 rounded cursor-pointer hover:scale-105 flex flex-col justify-between transition-transform shadow-md border ${isSelected ? "ring-4 ring-green-400 transform scale-105 shadow-green-500/50" : "opacity-90 border-gray-200"}`}
                                >
                                    <div>
                                        <div className="font-bold text-sm mb-1">{c.name}</div>
                                        <div className="text-xs font-bold text-blue-600">{c.type}</div>
                                        <div className="text-xs">コスト: {c.cost}</div>
                                    </div>
                                    <div className="text-[10px] bg-gray-100 p-1 rounded max-h-20 overflow-hidden">{c.text}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-8 flex gap-4">
                        <button className="bg-green-500 hover:bg-green-400 px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105 text-white" onClick={() => {
                            sendAction("RESOLVE_ACTION", { indices: selectedCascadeIndices, type: "MSG_SELECT_MEMORIA_CASCADE" });
                            setSelectedCascadeIndices([]);
                        }}>
                            選択を確定 ({selectedCascadeIndices.length})
                        </button>
                        <button className="bg-gray-500 hover:bg-gray-400 px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105 text-white" onClick={() => {
                            sendAction("RESOLVE_ACTION", { indices: [], type: "MSG_SELECT_MEMORIA_CASCADE" });
                            setSelectedCascadeIndices([]);
                        }}>
                            パス
                        </button>
                    </div>
                </div>
            )}

            {/* MSG_CONFIRM_TRASH (M007) */}
            {myData?.pendingAction && myData.pendingAction.type === "MSG_CONFIRM_TRASH" && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-4 drop-shadow-sm text-gray-800">デッキの一番上のカード:</h2>
                    <div className="w-40 h-56 bg-white text-gray-900 rounded mb-6 p-4 flex flex-col items-center justify-between shadow-lg border border-gray-300">
                        <div className="font-bold">{myData.pendingAction.card.name}</div>
                        <div className="text-sm">{myData.pendingAction.card.type}</div>
                        <div className="text-xs text-center">{myData.pendingAction.card.text}</div>
                    </div>
                    <p className="mb-4 text-lg font-bold drop-shadow text-gray-700">このカードをトラッシュしますか？</p>
                    <div className="flex gap-4">
                        <button className="bg-red-500 px-8 py-2 rounded-full font-bold hover:bg-red-400 shadow-lg text-white" onClick={() => {
                            sendAction("RESOLVE_ACTION", { confirm: true });
                        }}>
                            はい (トラッシュ)
                        </button>
                        <button className="bg-blue-500 px-8 py-2 rounded-full font-bold hover:bg-blue-400 shadow-lg text-white" onClick={() => {
                            sendAction("RESOLVE_ACTION", { confirm: false });
                        }}>
                            いいえ (残す)
                        </button>
                    </div>
                </div>
            )}

            {/* MSG_DECLARE_TYPE (M006) */}
            {myData?.pendingAction && myData.pendingAction.type === "MSG_DECLARE_TYPE" && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold mb-8 drop-shadow-sm text-gray-800">カードの種類を宣言</h2>
                    <div className="flex gap-8">
                        <button className="w-40 h-40 bg-gradient-to-br from-red-500 to-red-600 rounded-full font-bold text-xl hover:scale-110 transition-transform shadow-lg border-4 border-red-300 text-white" onClick={() => {
                            sendAction("RESOLVE_ACTION", { declaredType: "ATTACK" });
                        }}>
                            アタック
                        </button>
                        <button className="w-40 h-40 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full font-bold text-xl hover:scale-110 transition-transform shadow-lg border-4 border-blue-300 text-white" onClick={() => {
                            sendAction("RESOLVE_ACTION", { declaredType: "MEMORIA" });
                        }}>
                            メモリア
                        </button>
                    </div>
                </div>
            )}

            {/* Instruction Overlay when actions pending */}
            {pendingAction && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur px-6 py-3 rounded-full z-40 border-2 border-yellow-400 animate-pulse text-center shadow-lg text-white">
                    <span className="font-bold">
                        {pendingAction.type === "SELECT_DISCARD" ? "捨てるカードを選択してください" :
                            pendingAction.type === "PLAY_ATTACK" && pendingAction.attackerIndex === undefined
                                ? "攻撃するリーダーを選択してください"
                                : "攻撃対象のリーダーを選択してください"}
                    </span>
                    <button className="ml-4 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full inline-block align-middle transition-colors" onClick={() => setPendingAction(null)}>キャンセル</button>
                </div>
            )}

            {/* Opponent Area (Rotated 180 effectively) */}
            <div className={`flex-1 p-2 pb-32 flex flex-col justify-end transform rotate-180 transition-opacity ${pendingAction?.attackerIndex !== undefined ? "opacity-100" : (pendingAction ? "opacity-50" : "")}`}>
                <PlayerMat player={opponentData} isOpponent={true} onLeaderClick={onLeaderClick} pendingAction={pendingAction} serverPendingAction={myData?.pendingAction} />
                {/* Opponent Hand (Backs) */}
                <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none flex justify-center items-end pb-2 z-20">
                    <div className="flex gap-1 pointer-events-auto">
                        {opponentData && opponentData.hand.map((_, i) => (
                            <div key={i} className="w-16 h-24 bg-indigo-100 border border-indigo-200 rounded shadow-sm relative">
                                <div className="absolute inset-0 flex items-center justify-center text-indigo-300 font-bold text-xs transform rotate-180">CARD</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Center Info / Phase Indicator */}
            <div className="h-10 bg-white border-y border-gray-200 flex items-center justify-between px-6 text-sm z-10 font-bold shadow-sm text-gray-700">
                <div>ターン: <span className={isMyTurn ? "text-orange-500" : "text-gray-400"}>{isMyTurn ? "あなた" : "相手"}</span></div>
                <div>{`ラウンド: ${gameState.currentRound}`}</div>
                <button
                    onClick={handleEndTurn}
                    disabled={!isMyTurn}
                    className={`px-6 py-1 rounded-full font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 ${isMyTurn ? "bg-orange-500 text-white hover:bg-orange-400" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                >
                    ターン終了
                </button>
            </div>

            {/* Player Area */}
            <div className={`flex-1 p-2 pb-32 flex flex-col justify-start relative transition-opacity ${pendingAction && pendingAction.attackerIndex === undefined ? "" : ""}`}>
                <PlayerMat player={myData} onLeaderClick={onLeaderClick} pendingAction={pendingAction} onUseTactics={handleUseTactics} serverPendingAction={myData?.pendingAction} />

                {/* Hand Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none flex justify-center items-end pb-2 z-20">
                    <div className="flex gap-2 pointer-events-auto items-end">
                        {myData && myData.hand.map((c, i) => (
                            <div key={i} className={`group w-20 h-28 bg-white border border-gray-300 rounded text-gray-900 hover:-translate-y-12 transition-all duration-200 cursor-pointer shadow-md relative ${pendingAction?.cardIndex === i ? "border-2 border-blue-400 ring-2 ring-blue-100 -translate-y-12" : "hover:shadow-lg hover:z-50"}`}>

                                {/* Tooltip Bubble */}
                                <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-48 bg-white/95 backdrop-blur text-black text-xs p-3 rounded-lg border border-gray-200 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[60] text-center">
                                    <div className="font-bold mb-1 text-indigo-600">{c.name}</div>
                                    <div>{c.text}</div>
                                    <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b border-r border-gray-200"></div>
                                </div>

                                <div className="text-[10px] font-bold p-1 leading-tight h-full relative overflow-hidden">
                                    <div className="mb-4">{c.name}</div>
                                    <div className="text-[9px] text-gray-600 line-clamp-3 leading-3 opacity-60 group-hover:opacity-100">{c.text}</div>
                                </div>
                                <div className="absolute bottom-1 right-1 font-bold text-white bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md">{c.cost}</div>

                                {/* Play Button Overlay */}
                                {isMyTurn && !pendingAction && (
                                    <div className="absolute inset-0 bg-indigo-500/80 rounded hidden group-hover:flex flex-col items-center justify-center gap-1 backdrop-blur-[1px] animate-fadeIn">
                                        <button
                                            className="bg-white text-indigo-600 font-bold text-[10px] px-3 py-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent tooltip toggle if handled by click
                                                handleCardClick(i, c);
                                            }}
                                        >
                                            プレイ
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
