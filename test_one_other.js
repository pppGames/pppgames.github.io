const GameState = require("./server/battle/GameState");
const atkData = require("./server/data/atk_data.json");

const cardsMap = {};
atkData.forEach(c => cardsMap[c.id] = c);

// Test: 強さの証明 (A1016) - should apply 30 to target, THEN prompt for 10 to OTHER
const p1Deck = {
    leaders: [
        { id: "L016", name: "nqrse" },      // Green
        { id: "L023", name: "花芽すみれ" }, // Green
        { id: "L024", name: "花芽なずな" }  // Green
    ],
    main: [{ ...cardsMap["A1016"] }],
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

p1.hand = [{ ...cardsMap["A1016"] }];
p1.ppCards.forEach(pp => pp.isTapped = false);
game.turnPlayerId = "p1";

console.log("=== 強さの証明 (A1016) フルテスト ===\n");
console.log("P1 Leaders:");
p1.leaders.forEach((l, i) => console.log(`  [${i}] ${l.name}: ATK=${l.atk}, HP=${l.currentHp}`));
console.log("\nP2 Leaders Before Attack:");
p2.leaders.forEach((l, i) => console.log(`  [${i}] ${l.name}: ${l.currentHp}HP`));

// Step 1: Play card with attack target = Mondo (index 1)
console.log("\n--- Playing A1016: Attacker=nqrse(0), Target=Mondo(1) ---");
const attackResult = game.playCard("p1", 0, {
    attackerIndex: 0,   // nqrse
    targetIndex: 1      // Mondo
});

console.log("Attack Result:", attackResult.success ? "Success" : attackResult.reason);

// Check HP after attack (before on_hit resolution)
console.log("\nP2 Leaders After Attack (before on_hit resolution):");
p2.leaders.forEach((l, i) => console.log(`  [${i}] ${l.name}: ${l.currentHp}HP`));

// Check pending action
const pending = p1.pendingAction;
console.log("\n--- Pending Action Check ---");
if (pending) {
    console.log("Type:", pending.type);
    console.log("Effect Type:", pending.effectType);
    console.log("Damage Value:", pending.value);
    console.log("Exclude Index:", pending.excludeIndex, "( = attack target, should NOT receive on_hit damage)");

    // Step 2: Resolve by selecting a DIFFERENT target (Ras = index 0)
    console.log("\n--- Resolving: Selecting Ras (index 0) for on_hit damage ---");
    const resolveResult = game.resolveAction("p1", { targetIndex: 0 });
    console.log("Resolve Result:", resolveResult.success ? "Success" : resolveResult.reason);

    console.log("\nP2 Leaders After on_hit Resolution:");
    p2.leaders.forEach((l, i) => console.log(`  [${i}] ${l.name}: ${l.currentHp}HP`));

    // Verify
    const mondoHp = p2.leaders[1].currentHp;  // Should be 100 - 30 = 70
    const rasHp = p2.leaders[0].currentHp;    // Should be 100 - 10 = 90
    console.log("\n=== RESULT ===");
    console.log("Mondo HP:", mondoHp, "(expected: 70 = 100 - 30 attack)");
    console.log("Ras HP:", rasHp, "(expected: 90 = 100 - 10 on_hit)");
    console.log("TEST:", mondoHp === 70 && rasHp === 90 ? "✓ PASS" : "✗ FAIL");
} else {
    console.log("NO PENDING ACTION - BUG!");
}
