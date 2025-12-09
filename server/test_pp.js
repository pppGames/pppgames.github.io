const GameState = require("./server/battle/GameState");
const uuid = require("uuid");

// Mock Data Loaders (simplified for test)
// We need to ensure paths are correct or mocked.
// Since GameState requires files via require, we must run this in the root context or adjust paths.
// Better: We rely on the fact that we can run `node test_pp.js` in the project root.

// Mock data (since we can't easily mock require in this env without rewiring, we'll try to run it where the requires work, which is server/?)
// Actually, `GameState` requires `../data/...`. So we should run from `server/battle/`.

// Let's create the test script in `server/test_pp.js` and use correct requires.
console.log("Starting PP Test");

// Manually verify logic since I can't easily run complex env.
// But I can create a standalone verify script that copies the class logic I want to test.
// No, I should run the actual GameState.

const mockP1 = { id: "p1", name: "Player 1", deck: { leaders: [{ id: "l1" }], main: [{ id: "c1", cost: 1 }], tactics: [] } };
const mockP2 = { id: "p2", name: "Player 2", deck: { leaders: [{ id: "l2" }], main: [], tactics: [] } };

// We need to mock the requires inside GameState if we run it from here?
// I will place `test_pp.js` in `c:/Users/butsuryu100/Desktop/card/xrossstars_full_project/server/` so the `../data` paths align correctly relative to `battle/GameState.js`.
// Wait `battle/GameState.js` uses `../data`. So from `server/`, it would be `data`.
// `server/battle/GameState.js` requires `../data`.
// If I run `node server/test_pp.js`, and require `./battle/GameState`. Correct.

try {
    const GameState = require("./battle/GameState");
    const game = new GameState(mockP1, mockP2);

    // Setup Round
    game.setupRound();
    // Force Tactics Phase done (since we just implemented it)
    game.players["p1"].tacticsArea.push({ id: "t1" });
    game.players["p1"].tacticsReady = true;
    game.players["p2"].tacticsArea.push({ id: "t2" });
    game.players["p2"].tacticsReady = true;
    game.startRoundMain();

    const p1 = game.players["p1"];
    console.log("Initial PP:", p1.ppCards.length);
    console.log("Initial Tapped:", p1.ppCards.filter(p => p.isTapped).length);

    // Give P1 a cost 1 card
    p1.hand.push({ id: "test_c1", name: "Test Card", cost: 1, type: "MEMORIA" });
    const cardIndex = p1.hand.length - 1;

    // Play Card
    console.log("Playing Cost 1 Card...");
    // Hack turn player if needed
    game.turnPlayerId = "p1";

    game.playCard("p1", cardIndex);

    console.log("Post Play PP:", p1.ppCards.length);
    console.log("Post Play Tapped:", p1.ppCards.filter(p => p.isTapped).length);
    console.log("Remaining Untapped:", p1.ppCards.filter(p => !p.isTapped).length);

} catch (e) {
    console.error(e);
}
