/**
 * Effects Module Index
 * Exports all effect-related modules
 */

const EffectRegistry = require('./EffectRegistry');
const damageEffects = require('./damageEffects');
const drawEffects = require('./drawEffects');
const miscEffects = require('./miscEffects');

module.exports = {
    EffectRegistry,
    damageEffects,
    drawEffects,
    miscEffects,
    // Convenience export
    executeEffect: EffectRegistry.executeEffect
};
