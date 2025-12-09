const GameState = require("./server/battle/GameState");
const atkData = require("./server/data/atk_data.json");
const memData = require("./server/data/mem_data.json");

const cardsMap = {};
atkData.forEach(c => cardsMap[c.id] = c);
memData.forEach(c => cardsMap[c.id] = c);

// Mock Players with Green leaders (for A1018 condition: green_leaders_1)
const p1Deck = {
    leaders: [
        { id: "L016", name: "nqrse" },      // Green
        { id: "L023", name: "花芽すみれ" }, // Green
        { id: "L024", name: "花芽なずな" }  // Green
    ],
    main: [
        { ...cardsMap["M013"] },  // バトンを繋いで - Green Memoria, cost 1
        { ...cardsMap["M016"] },  // モラルからのハミダシ - Green Memoria, cost 1
        { ...cardsMap["M024"] },  // なずNEWS - Green Memoria, cost 1
        { ...cardsMap["A001"] }   // Attack (should not be playable)
    ],
    tactics: []
};
const p2Deck = {
    leaders: [
        { id: "L022", name: "Ras" },
        { id: "L018", name: "Mondo" },
        { id: "L014", name: "ありさか" }
    ],
    main: [],
    tactics: []
};

const game = new GameState(
    { id: "p1", name: "User", deck: p1Deck },
    { id: "p2", name: "Opponent", deck: p2Deck }
);

game.startGame();
game.startRoundMain();

const p1 = game.players["p1"];
const p2 = game.players["p2"];

// Force deck to have proper memoria cards
p1.mainDeck = [
    { ...cardsMap["M013"], id: "M013" },  // バトンを繋いで - Cost 1 MEMORIA
    { ...cardsMap["M016"], id: "M016" },  // モラルからのハミダシ - Cost 1 MEMORIA
    { ...cardsMap["M024"], id: "M024" }   // なずNEWS - Cost 1 MEMORIA
];

// Force P1 Hand to have A1018 (Link Assault)
p1.hand = [{ ...cardsMap["A1018"] }];
p1.ppCards.forEach(pp => pp.isTapped = false);
game.turnPlayerId = "p1";

console.log("=== リンク・アサルト (A1018) テスト ===\n");
console.log("P1 Leaders:", p1.leaders.map(l => `${l.name}(${l.color})`).join(", "));
console.log("P1 Deck Top 3:", p1.mainDeck.slice(0, 3).map(c => `${c.name}(${c.type},cost${c.cost || 0})`).join(", "));
console.log("P1 Hand:", p1.hand.map(c => c.name));

console.log("\n--- Playing A1018 ---");
const attackerIndex = 0;
const targetIndex = 1;

const result = game.playCard("p1", 0, { attackerIndex, targetIndex });
console.log("Play Result:", result.success ? "Success" : result.reason);

const pending = p1.pendingAction;
console.log("\n--- Pending Action Check ---");
if (pending && pending.type === "MSG_SELECT_CASCADE") {
    console.log("✓ Pending Action Type:", pending.type);
    console.log("✓ Cards revealed:", pending.cards.map(c => `${c.name}(${c.type},cost${c.cost || 0})`).join(", "));

    // Test: Select first playable MEMORIA (cost <= 1)
    const playableIndex = pending.cards.findIndex(c => c.type === "MEMORIA" && (c.cost || 0) <= 1);
    console.log("\n--- Resolving: Selecting card index", playableIndex, "---");

    const resolveResult = game.resolveAction("p1", { index: playableIndex });
    console.log("Resolve Result:", resolveResult.success ? "Success" : resolveResult.reason);

    console.log("\n--- After Cascade ---");
    console.log("P1 Field:", p1.field.map(c => c.name).join(", ") || "(empty)");
    console.log("P1 Trash:", p1.trash.map(c => c.name).join(", ") || "(empty)");

    // Check success
    const fieldHasMemoria = p1.field.some(c => c.type === "MEMORIA");
    console.log("\n=== Result ===");
    console.log("CASCADE TEST:", fieldHasMemoria ? "✓ PASS" : "✗ FAIL");
} else {
    console.log("✗ FAIL - Expected MSG_SELECT_CASCADE, got:", pending?.type || "null");
}
