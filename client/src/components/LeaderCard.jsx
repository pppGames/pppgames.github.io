import React from 'react';

/**
 * LeaderCard Component
 * Displays a single leader with highlighting based on game state
 */
function LeaderCard({ leader, index, isOpponent, onLeaderClick, pendingAction, serverPendingAction }) {
    // Highlight logic
    let highlight = "border-gray-300 bg-white text-gray-900 shadow-sm";
    if (leader.isDown) highlight = "border-red-400 bg-red-50 text-red-900";

    // Check Server Pending Action Exclusion (One Other Leader)
    let isExcluded = false;
    if (isOpponent && serverPendingAction?.type === "SELECT_EFFECT_TARGET" && serverPendingAction.excludeIndex === index) {
        isExcluded = true;
        highlight = "border-gray-200 bg-gray-100 opacity-40 cursor-not-allowed";
    }

    // If my turn and I am selecting attacker
    if (!isOpponent && pendingAction?.type === "PLAY_ATTACK" && pendingAction.attackerIndex === undefined) {
        highlight = "border-yellow-400 bg-yellow-50 cursor-pointer shadow-md";
    }
    // If selected as attacker
    if (!isOpponent && pendingAction?.attackerIndex === index) {
        highlight = "border-orange-500 bg-orange-50 ring-2 ring-orange-200 shadow-md scale-105";
    }
    // If my turn and I am selecting target (Opponent leaders)
    if (isOpponent && pendingAction?.attackerIndex !== undefined) {
        if (!isExcluded) {
            highlight = "border-red-400 bg-red-50 cursor-pointer hover:bg-red-100 shadow-md";
        }
    }

    // Server Pending Action Highlighting (Effect Target)
    if (isOpponent && serverPendingAction?.type === "SELECT_EFFECT_TARGET") {
        if (!isExcluded && !leader.isDown) {
            highlight = "border-pink-400 bg-pink-50 cursor-pointer hover:bg-pink-100 ring-2 ring-pink-200 shadow-md";
        }
    }

    return (
        <div
            onClick={() => !isExcluded && onLeaderClick && onLeaderClick(isOpponent, index)}
            className={`w-20 h-28 border-2 ${highlight} rounded flex flex-col items-center justify-between p-1 relative transition-colors ${leader.isDown ? "transform rotate-90 mx-4" : ""}`}
        >
            <div className="text-[10px] text-center leading-tight">{leader.name}</div>
            <div className="flex flex-col items-center w-full">
                <div className="text-md font-bold">{leader.currentHp}/{leader.maxHp}</div>
                <div className="text-[10px] bg-black/30 px-1 rounded text-yellow-200">ATK:{leader.atk}</div>
            </div>
            {leader.isAwakened && <div className="absolute bottom-1 right-1 text-yellow-400 text-xs">★</div>}
        </div>
    );
}

export default LeaderCard;
