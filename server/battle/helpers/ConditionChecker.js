/**
 * Condition Checker Module
 * Centralizes all condition checking logic
 */

/**
 * Check if a condition is met
 * @param {Object} gameState - GameState instance
 * @param {string} playerId - Player to check condition for
 * @param {string} condition - Condition string
 * @param {Object} context - Additional context (discardIndex, etc.)
 * @returns {boolean} - True if condition is met
 */
function checkCondition(gameState, playerId, condition, context = {}) {
    const p = gameState.players[playerId];

    // Memoria count conditions
    if (condition === "memoria_count_3") {
        return p.field.filter(c => c.type === "MEMORIA").length >= 3;
    }
    if (condition === "memoria_count_2") {
        return p.field.filter(c => c.type === "MEMORIA").length >= 2;
    }

    // Leader color conditions (e.g., "red_leaders_2")
    if (condition.includes("_leaders_")) {
        const parts = condition.split("_");
        const color = parts[0];
        const count = parseInt(parts[2]);
        const targetColor = color.charAt(0).toUpperCase() + color.slice(1);
        const matchCount = p.leaders.filter(l => l.color === targetColor).length;
        return matchCount >= count;
    }

    // Leaders down count
    if (condition === "leaders_down_3") {
        return p.leaders.filter(l => l.isDown).length >= 3;
    }

    // Hand size conditions
    if (condition === "hand_len_le_2") {
        return p.hand.length <= 2;
    }

    // Discard conditions
    if (condition === "discard_1") {
        if (context.discardIndex !== undefined && context.discardIndex !== null) {
            if (p.hand[context.discardIndex]) {
                p.trash.push(p.hand.splice(context.discardIndex, 1)[0]);
                return true;
            }
            return false;
        }
        return p.hand.length >= 1;
    }

    if (condition === "discard_1_optional") {
        if (context.discardIndex !== undefined && context.discardIndex !== null) {
            if (p.hand[context.discardIndex]) {
                p.trash.push(p.hand.splice(context.discardIndex, 1)[0]);
                return true;
            }
            return false;
        }
        return false;
    }

    if (condition === "discard_0_cost") {
        if (context.discardIndex !== undefined && context.discardIndex !== null) {
            const card = p.hand[context.discardIndex];
            if (card && (card.cost || 0) === 0) {
                p.trash.push(p.hand.splice(context.discardIndex, 1)[0]);
                return true;
            }
            return false;
        }
        return p.hand.some(c => (c.cost || 0) === 0);
    }

    // Team tag conditions
    if (condition === "leaders_all_vspo" || condition === "all_vspo") {
        return p.leaders.every(l => gameState.hasTag(l.name, "VSPO!"));
    }
    if (condition === "leaders_all_cr" || condition === "all_cr") {
        return p.leaders.every(l => gameState.hasTag(l.name, "CR"));
    }

    // Mill enemy condition
    if (condition === "mill_enemy_attack") {
        const opponentId = gameState.playerIds.find(id => id !== playerId);
        const opp = gameState.players[opponentId];
        if (opp.mainDeck.length > 0) {
            const card = opp.mainDeck.shift();
            opp.trash.push(card);
            if (card.type === "ATTACK") return true;
        }
        return false;
    }

    return false;
}

/**
 * Check if a leader has a specific tag
 * @param {Object} leadersMap - Map of leader names to data
 * @param {string} name - Leader name
 * @param {string} tag - Tag to check
 * @returns {boolean} - True if leader has tag
 */
function hasTag(leadersMap, name, tag) {
    const leader = leadersMap[name];
    return leader && (leader.team === tag || (leader.team && leader.team.includes(tag)));
}

/**
 * Get count of leaders with a specific tag
 * @param {Object} gameState - GameState instance
 * @param {string} playerId - Player to check
 * @param {string} tag - Tag to count
 * @returns {number} - Count of leaders with tag
 */
function getLeaderTagCount(gameState, playerId, tag) {
    return gameState.players[playerId].leaders.filter(l => gameState.hasTag(l.name, tag)).length;
}

module.exports = {
    checkCondition,
    hasTag,
    getLeaderTagCount
};
