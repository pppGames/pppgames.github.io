/**
 * Draw Effect Handlers
 * Handles all draw and deck manipulation effects
 */

/**
 * Factory: Handle draw cards
 */
export function handleDraw(count) {
    return (gameState, playerId) => {
        gameState.drawCards(playerId, count);
    };
}

/**
 * Handle draw for all players
 */
export function handleDrawAll(gameState, playerId) {
    const opponentId = gameState.playerIds.find(id => id !== playerId);
    gameState.drawCards(playerId, 1);
    gameState.drawCards(opponentId, 1);
}

/**
 * Factory: Handle draw then discard (user selects cards to discard)
 */
export function handleDrawDiscard(drawCount, discardCount) {
    return (gameState, playerId) => {
        gameState.drawCards(playerId, drawCount);
        // Use pending action for user selection instead of random
        gameState.setPendingAction(playerId, {
            type: "SELECT_DISCARD",
            count: discardCount,
            message: `手札を${discardCount}枚選んで捨ててください`
        });
    };
}

/**
 * Handle cascade effect (reveal top 3, pick 1 to play)
 */
export function handleCascade(gameState, playerId) {
    const p = gameState.players[playerId];
    const top3 = p.mainDeck.splice(0, 3);
    gameState.setPendingAction(playerId, {
        type: "MSG_SELECT_CASCADE",
        cards: top3
    });
}

/**
 * Handle draw if target was downed
 */
export function handleDrawIfDown(gameState, playerId, context) {
    if (context.targetDown) {
        gameState.drawCards(playerId, 1);
    }
}
