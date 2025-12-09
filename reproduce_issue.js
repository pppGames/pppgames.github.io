const GameState = require("./server/battle/GameState");
const atkData = require("./server/data/atk_data.json");
const leaderData = require("./server/data/leader_data.json");
const cardsMap = {};
atkData.forEach(c => cardsMap[c.id] = c);

// Mock Players
const p1Deck = {
    leaders: [
        { id: "L003", name: "橘ひなの" }, // Red
        { id: "L018", name: "Mondo" },   // Red
        { id: "L016", name: "nqrse" }    // Green
    ],
    main: [{ id: "A1016" }, { id: "A1016" }, { id: "A1016" }, { id: "A1016" }], // Proof of Strength (Green)
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
game.startRoundMain(); // Setup hands, etc.

// Force P1 Hand to have A1016
const p1 = game.players["p1"];
p1.hand = [{ ...cardsMap["A1016"], ...{ id: "A1016" } }];
p1.ppCards.forEach(pp => pp.isTapped = false);
// Ensure P1 is turn player
game.turnPlayerId = "p1";

console.log("--- Initial State ---");
console.log("P1 Leaders:", p1.leaders.map(l => `${l.name}(${l.color})`).join(", "));
console.log("P2 Leaders:", game.players["p2"].leaders.map(l => `${l.name}(${l.color})`).join(", "));
console.log("P1 Hand:", p1.hand.map(c => c.name));

console.log("\n--- Playing Card A1016 ---");
// Play A1016, Target Attacker: nqrse (Index 2), Target Enemy: Mondo (Index 1)
const attackerIndex = 2; // nqrse (Green)
const targetIndex = 1;   // Mondo (Opponent)

const result = game.playCard("p1", 0, { attackerIndex, targetIndex });
console.log("Play Result:", result.success ? "Success" : result.reason);

const pending = p1.pendingAction;
console.log("\n--- Pending Action Check ---");
if (pending) {
    console.log("Pending Action Type:", pending.type);
    console.log("Pending Action Value:", pending.value);
    console.log("Pending Action ExcludeIndex:", pending.excludeIndex);
} else {
    console.log("NO PENDING ACTION SET - FAILURE");
}

// Debug Condition
const conditionResult = game.checkCondition("p1", "green_leaders_1");
console.log("\nCondition 'green_leaders_1' Check:", conditionResult);
