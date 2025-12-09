/**
 * Damage Effect Handlers
 * Handles all damage-related effects
 */

/**
 * Factory: Handle direct damage to enemy
 */
function handleDamageEnemy(value) {
    return (gameState, playerId, context) => {
        const opponentId = gameState.playerIds.find(id => id !== playerId);
        gameState.dealDamageToLeader(opponentId, value, "any", context.targetIndex);
    };
}

/**
 * Factory: Handle AOE damage
 */
function handleAOE(value, mode) {
    return (gameState, playerId, context) => {
        const opponentId = gameState.playerIds.find(id => id !== playerId);
        gameState.dealAOE(opponentId, value, mode, context.targetIndex);
    };
}

/**
 * Factory: Handle conditional AOE
 */
function handleConditionalAOE(value, condition) {
    return (gameState, playerId, context) => {
        if (gameState.checkCondition(playerId, condition)) {
            const opponentId = gameState.playerIds.find(id => id !== playerId);
            gameState.dealAOE(opponentId, value, "others", context.targetIndex);
        }
    };
}

/**
 * Factory: Handle damage if target was downed
 */
function handleDamageIfDown(value) {
    return (gameState, playerId, context) => {
        if (context.targetDown) {
            const opponentId = gameState.playerIds.find(id => id !== playerId);
            gameState.dealDamageToLeader(opponentId, value, "any", context.targetIndex);
        }
    };
}

/**
 * Factory: Handle damage if hand is low
 */
function handleDamageIfHandLow(value) {
    return (gameState, playerId, context) => {
        const p = gameState.players[playerId];
        if (p.hand.length <= 2) {
            const opponentId = gameState.playerIds.find(id => id !== playerId);
            gameState.dealDamageToLeader(opponentId, value, "any", context.targetIndex);
        }
    };
}

/**
 * Handle damage_X_one_enemy effects (requires target selection)
 */
function handleDamageOneEnemy(gameState, playerId, context, card, key) {
    const val = parseInt(key.split("_")[1]);
    const opponentId = gameState.playerIds.find(id => id !== playerId);

    if (context.targetIndex !== undefined) {
        gameState.dealDamageToLeader(opponentId, val, "any", context.targetIndex);
    } else {
        gameState.setPendingAction(playerId, {
            type: "SELECT_EFFECT_TARGET",
            effectString: key
        });
    }
}

/**
 * Handle damage_X_one_other effects (target selection excluding attack target)
 */
function handleDamageOneOther(gameState, playerId, context, card, key) {
    const opponentId = gameState.playerIds.find(id => id !== playerId);
    const p = gameState.players[playerId];

    // Generic condition check from card data
    if (card && card.condition && !gameState.checkCondition(playerId, card.condition, context)) {
        return;
    }

    // Target validation
    const opponent = gameState.players[opponentId];
    const validTargets = opponent.leaders.filter((l, i) => !l.isDown && i !== context.targetIndex);
    if (validTargets.length === 0) return;

    // Parse damage value from key
    let value = 0;
    if (key.includes("damage_cr_")) {
        value = gameState.getLeaderTagCount(playerId, "CR") * 10;
    } else if (key.includes("damage_vspo_")) {
        value = gameState.getLeaderTagCount(playerId, "VSPO!") * 10;
    } else {
        // Support both damage_X_... and aoe_X_... style keys
        const match = key.match(/(?:damage|aoe)_(\d+)_/);
        if (match) value = parseInt(match[1]);
    }

    // Check conditions in key
    if (key.includes("_if_down") && !context.targetDown) return;
    if (key.includes("_if_memoria_2") && !gameState.checkCondition(playerId, "memoria_count_2")) return;
    if (key.includes("_if_hand_low") && p.hand.length > 2) return;
    if (key.includes("overkill_30") && (context.overkillAmount || 0) < 30) return;

    // Special case for overkill damage
    if (key.startsWith("overkill_")) {
        const parts = key.split("_");
        value = parseInt(parts[3]) || 50;
    }

    gameState.setPendingAction(playerId, {
        type: "SELECT_EFFECT_TARGET",
        effectType: "damage",
        value: value,
        excludeIndex: context.targetIndex,
        attackerIndex: context.attackerIndex
    });
}

/**
 * Handle instant down effect
 */
function handleInstantDown(gameState, playerId, context) {
    if (context.targetIndex !== undefined) {
        const opponentId = gameState.playerIds.find(id => id !== playerId);
        gameState.dealDamageToLeader(opponentId, 999, "any", context.targetIndex);
    }
}

module.exports = {
    handleDamageEnemy,
    handleAOE,
    handleConditionalAOE,
    handleDamageIfDown,
    handleDamageIfHandLow,
    handleDamageOneEnemy,
    handleDamageOneOther,
    handleInstantDown
};
