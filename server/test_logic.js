// Isolated Logic Test for tapPP

class MockGameState {
    constructor() {
        this.players = {
            p1: {
                id: "p1",
                ppCards: [
                    { id: "1", isTapped: false },
                    { id: "2", isTapped: false },
                    { id: "3", isTapped: false }
                ]
            }
        }
    }

    tapPP(player, cost) {
        let tapped = 0;
        for (let pp of player.ppCards) {
            if (tapped >= cost) break;
            if (!pp.isTapped) {
                pp.isTapped = true;
                tapped++;
            }
        }
    }
}

const game = new MockGameState();
const p1 = game.players.p1;

console.log("Initial:", p1.ppCards);

// Test 1: Cost 1
console.log("--- Tapping Cost 1 ---");
game.tapPP(p1, 1);
console.log("Result:", p1.ppCards);
// check
const tapped = p1.ppCards.filter(p => p.isTapped).length;
console.log("Tapped Count:", tapped, "(Expected: 1)");

// Reset
p1.ppCards.forEach(p => p.isTapped = false);

// Test 2: Cost 1 String
console.log("--- Tapping Cost '1' (String) ---");
game.tapPP(p1, "1");
console.log("Result:", p1.ppCards.filter(p => p.isTapped).length);

// Reset
p1.ppCards.forEach(p => p.isTapped = false);

// Test 3: Cost Undefined
console.log("--- Tapping Cost undefined ---");
game.tapPP(p1, undefined);
console.log("Result:", p1.ppCards.filter(p => p.isTapped).length);

// Reset
p1.ppCards.forEach(p => p.isTapped = false);

// Test 4: Cost 0
console.log("--- Tapping Cost 0 ---");
game.tapPP(p1, 0);
console.log("Result:", p1.ppCards.filter(p => p.isTapped).length);

