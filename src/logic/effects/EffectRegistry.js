/**
 * Effect Registry - Maps effect keys to handler functions
 * This centralizes effect dispatch logic from the monolithic processEffectString
 */

import * as drawEffects from './drawEffects.js';
import * as damageEffects from './damageEffects.js';
import * as miscEffects from './miscEffects.js';

// Registry mapping effect keys to handler functions
export const effectHandlers = {
    // Draw Effects
    "draw_1": drawEffects.handleDraw(1),
    "draw_2": drawEffects.handleDraw(2),
    "draw_3": drawEffects.handleDraw(3),
    "draw_all_1": drawEffects.handleDrawAll,
    "draw_2_discard_2": drawEffects.handleDrawDiscard(2, 2),
    "draw_1_discard_1": drawEffects.handleDrawDiscard(1, 1),
    "cascade_1_cost": drawEffects.handleCascade,

    // Direct Damage Effects
    "damage_20_enemy": damageEffects.handleDamageEnemy(20),
    "damage_50_all_enemy": damageEffects.handleAOE(50, "all"),
    "damage_10_all_enemy": damageEffects.handleAOE(10, "all"),
    "damage_20_all_enemy": damageEffects.handleAOE(20, "all"),

    // AOE Others
    "aoe_10_others": damageEffects.handleAOE(10, "others"),
    "damage_10_all_others": damageEffects.handleAOE(10, "others"),
    "damage_20_all_others": damageEffects.handleAOE(20, "others"),

    // Conditional AOE
    "aoe_10_if_memoria_2": damageEffects.handleConditionalAOE(10, "memoria_count_2"),
    "damage_10_all_others_if_memoria_2": damageEffects.handleConditionalAOE(10, "memoria_count_2"),

    // Conditional Single Target
    "aoe_20_one_if_down": damageEffects.handleDamageIfDown(20),
    "damage_20_if_hand_low": damageEffects.handleDamageIfHandLow(20),

    // Heal/Buff
    "heal_leader_30": miscEffects.handleHeal(30),
    "buff_leaders_30": miscEffects.handleBuff(30),

    // Overkill
    "overkill_30_pp_1": miscEffects.handleOverkillPP(30, 1),

    // Discard
    "discard_all_1": miscEffects.handleDiscardAll(1),
    "discard_opp_1": miscEffects.handleDiscardOpp(1),
    "discard_opp_1_if_down": miscEffects.handleDiscardOppIfDown(1),

    // Special
    "play_memoria_upto_3": miscEffects.handlePlayMemoria(3),
    "scryt_1_optional_trash": miscEffects.handleScryTrash,
    "scryt_declare_type_draw_4": miscEffects.handleScryDeclare,
    "instant_down": damageEffects.handleInstantDown,
    "draw_if_down": drawEffects.handleDrawIfDown,
};

// Pattern-based handlers for dynamic effect keys
export const patternHandlers = [
    {
        // damage_X_one_other effects
        // include conditional variants like _if_memoria_2
        pattern: /_one_other/,
        handler: damageEffects.handleDamageOneOther
    },
    {
        // damage_X_one_enemy effects  
        pattern: /^damage_\d+_one_enemy$/,
        handler: damageEffects.handleDamageOneEnemy
    },
    {
        // overkill effects
        pattern: /^overkill_/,
        handler: miscEffects.handleOverkill
    }
];

/**
 * Get handler for an effect key
 * @param {string} key - Effect key
 * @returns {Function|null} - Handler function or null
 */
export function getHandler(key) {
    // Check direct registry first
    if (effectHandlers[key]) {
        return effectHandlers[key];
    }

    // Check pattern handlers
    for (const { pattern, handler } of patternHandlers) {
        if (pattern.test(key)) {
            return handler;
        }
    }

    return null;
}

/**
 * Execute effect by key
 * @param {string} key - Effect key
 * @param {Object} gameState - GameState instance
 * @param {string} playerId - Player executing effect
 * @param {Object} context - Effect context (targetIndex, targetDown, etc.)
 * @param {Object} card - Card triggering effect (optional)
 * @returns {boolean} - True if effect was handled
 */
export function executeEffect(key, gameState, playerId, context, card) {
    const handler = getHandler(key);
    if (handler) {
        handler(gameState, playerId, context, card, key);
        return true;
    }
    return false;
}
