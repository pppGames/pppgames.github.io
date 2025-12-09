/**
 * Damage Helper Module
 * Centralizes damage calculation, delivery, and awakening logic
 */

/**
 * Deal damage to a specific leader
 * @param {Object} gameState - GameState instance
 * @param {string} targetPlayerId - Player receiving damage
 * @param {number} damage - Amount of damage
 * @param {string} targetMode - "any" or specific mode
 * @param {number} specificIndex - Optional specific leader index
 * @returns {Object} - { downed: boolean, target: Object, awakened: boolean }
 */
function dealDamageToLeader(gameState, targetPlayerId, damage, targetMode, specificIndex) {
    const p = gameState.players[targetPlayerId];
    let target;

    if (specificIndex !== undefined && p.leaders[specificIndex] && !p.leaders[specificIndex].isDown) {
        target = p.leaders[specificIndex];
    } else {
        target = p.leaders.find(l => !l.isDown);
    }

    if (target) {
        target.currentHp -= damage;
        if (target.currentHp <= 0) {
            target.currentHp = 0;
            target.isDown = true;

            // Victim Awakening (Survival/Phase 2)
            const awakenResult = triggerAwakening(gameState, targetPlayerId, target);

            // Return 'downed: true' if they HIT 0 HP
            return { downed: true, target, awakened: awakenResult.awakened };
        }
    }
    return { downed: false };
}

/**
 * Deal AOE damage to all leaders of a player
 * @param {Object} gameState - GameState instance
 * @param {string} targetPlayerId - Player receiving damage
 * @param {number} damage - Amount of damage
 * @param {string} mode - "all" or "others"
 * @param {number} excludeIndex - Leader index to exclude (for "others" mode)
 */
function dealAOE(gameState, targetPlayerId, damage, mode, excludeIndex) {
    const p = gameState.players[targetPlayerId];
    p.leaders.forEach((l, i) => {
        if (mode === "others" && i === excludeIndex) return;
        if (l.isDown) return;

        l.currentHp -= damage;
        if (l.currentHp <= 0) {
            l.currentHp = 0;
            l.isDown = true;
            triggerAwakening(gameState, targetPlayerId, l);
        }
    });
}

/**
 * Heal a leader
 * @param {Object} gameState - GameState instance
 * @param {string} playerId - Player to heal
 * @param {number} amount - Heal amount
 * @param {string} mode - Selection mode
 * @param {number} specificIndex - Optional specific leader index
 */
function healLeader(gameState, playerId, amount, mode, specificIndex) {
    const p = gameState.players[playerId];
    let target;

    if (specificIndex !== undefined && p.leaders[specificIndex] && !p.leaders[specificIndex].isDown) {
        target = p.leaders[specificIndex];
    } else {
        target = p.leaders.find(l => !l.isDown && l.currentHp < l.maxHp);
    }

    if (target) {
        target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
    }
}

/**
 * Trigger awakening on a downed leader
 * @param {Object} gameState - GameState instance
 * @param {string} playerId - Player owning the leader
 * @param {Object} leader - Leader object that was downed
 * @returns {Object} - { awakened: boolean }
 */
function triggerAwakening(gameState, playerId, leader) {
    if (!leader.isAwakened) {
        leader.isAwakened = true;
        leader.currentHp = leader.hp_after;
        leader.maxHp = leader.hp_after;
        leader.atk = leader.atk_after;
        leader.isDown = false; // Revive

        if (leader.ability && leader.ability.trigger === "awaken") {
            gameState.processAbility(playerId, leader.ability);
        }
        return { awakened: true };
    }
    return { awakened: false };
}

/**
 * Discard random cards from hand
 * @param {Object} gameState - GameState instance
 * @param {string} playerId - Player to discard from
 * @param {number} count - Number of cards to discard
 */
function discardRandom(gameState, playerId, count) {
    const p = gameState.players[playerId];
    for (let i = 0; i < count; i++) {
        if (p.hand.length > 0) {
            const idx = Math.floor(Math.random() * p.hand.length);
            p.trash.push(p.hand.splice(idx, 1)[0]);
        }
    }
}

module.exports = {
    dealDamageToLeader,
    dealAOE,
    healLeader,
    triggerAwakening,
    discardRandom
};
