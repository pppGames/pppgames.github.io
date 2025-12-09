/**
 * Miscellaneous Effect Handlers
 * Handles heal, buff, discard, and special effects
 */

/**
 * Factory: Handle heal leader
 */
export function handleHeal(amount) {
    return (gameState, playerId, context) => {
        gameState.healLeader(playerId, amount, "any", context.targetIndex);
    };
}

/**
 * Factory: Handle attack buff
 */
export function handleBuff(amount) {
    return (gameState, playerId) => {
        const p = gameState.players[playerId];
        p.turnBuffs.attack += amount;
    };
}

/**
 * Factory: Handle overkill PP recovery
 */
export function handleOverkillPP(threshold, ppAmount) {
    return (gameState, playerId, context) => {
        if ((context.overkillAmount || 0) >= threshold) {
            gameState.recoverPP(playerId, ppAmount);
        }
    };
}

/**
 * Factory: Handle discard for self (all players)
 */
export function handleDiscardAll(count) {
    return (gameState, playerId) => {
        gameState.setPendingAction(playerId, {
            type: "MSG_SELECT_DISCARD",
            count: count,
            nextEffect: "discard_opp_1"
        });
    };
}

/**
 * Factory: Handle discard for opponent
 */
export function handleDiscardOpp(count) {
    return (gameState, playerId) => {
        const opponentId = gameState.playerIds.find(id => id !== playerId);
        gameState.setPendingAction(opponentId, {
            type: "MSG_SELECT_DISCARD",
            count: count,
            isOpponentAction: true
        });
    };
}

/**
 * Factory: Handle conditional discard (if target downed) - opponent selects
 */
export function handleDiscardOppIfDown(count) {
    return (gameState, playerId, context) => {
        if (context.targetDown) {
            const opponentId = gameState.playerIds.find(id => id !== playerId);
            // Use pending action for opponent selection instead of random
            gameState.setPendingAction(opponentId, {
                type: "SELECT_DISCARD",
                count: count,
                isOpponentAction: true,
                message: `手札を${count}枚選んで捨ててください`
            });
        }
    };
}

/**
 * Factory: Handle play memoria from hand
 */
export function handlePlayMemoria(maxCost) {
    return (gameState, playerId) => {
        const p = gameState.players[playerId];
        const candidates = p.hand.filter(c => c.type === "MEMORIA" && !c.is_ace);
        if (candidates.length > 0) {
            gameState.setPendingAction(playerId, {
                type: "MSG_SELECT_MEMORIA_CASCADE",
                cards: candidates,
                maxCostData: maxCost
            });
        }
    };
}

/**
 * Handle scry and optional trash
 */
export function handleScryTrash(gameState, playerId) {
    const p = gameState.players[playerId];
    if (p.mainDeck.length > 0) {
        const card = p.mainDeck[0];
        gameState.setPendingAction(playerId, {
            type: "MSG_CONFIRM_TRASH",
            card: card
        });
    }
}

/**
 * Handle scry and declare type for draw
 */
export function handleScryDeclare(gameState, playerId) {
    gameState.setPendingAction(playerId, {
        type: "MSG_DECLARE_TYPE"
    });
}

/**
 * Handle generic overkill effects
 */
export function handleOverkill(gameState, playerId, context, card, key) {
    if ((context.overkillAmount || 0) >= 30) {
        if (key.includes("pp_1")) gameState.recoverPP(playerId, 1);
        if (key.includes("dmg_50")) {
            const opponentId = gameState.playerIds.find(id => id !== playerId);
            gameState.dealDamageToLeader(opponentId, 50, "any");
        }
    }
}
