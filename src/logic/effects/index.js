/**
 * Effects Module Index
 * Exports all effect-related modules
 */

import * as EffectRegistry from './EffectRegistry.js';
import * as damageEffects from './damageEffects.js';
import * as drawEffects from './drawEffects.js';
import * as miscEffects from './miscEffects.js';

export {
    EffectRegistry,
    damageEffects,
    drawEffects,
    miscEffects
};

// Convenience export
export const executeEffect = EffectRegistry.executeEffect;
