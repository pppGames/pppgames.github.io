import React, { useState } from 'react';

/**
 * EffectTargetOverlay Component
 * Allows player to select a target leader for effect damage
 */
function EffectTargetOverlay({ leaders, effectType, value, excludeIndex, socket }) {
    const [selectedIndex, setSelectedIndex] = useState(null);

    const isValidTarget = (leader, index) => {
        if (leader.isDown) return false;
        if (excludeIndex !== undefined && excludeIndex === index) return false;
        return true;
    };

    // const confirmTarget = () => {
    //     if (selectedIndex !== null && socket) {
    //         socket.send(JSON.stringify({
    //             type: "RESOLVE_ACTION",
    //             targetIndex: selectedIndex
    //         }));
    //         setSelectedIndex(null);
    //     }
    // };
    const confirmTarget = () => {
        if (selectedIndex !== null && socket) {
            console.log("[DEBUG CLIENT] Sending RESOLVE_ACTION targetIndex=", selectedIndex, "leaders=", leaders.map(l => l.name));
            socket.send(JSON.stringify({
                type: "RESOLVE_ACTION",
                targetIndex: selectedIndex
            }));
            setSelectedIndex(null);
        }
    };
    return (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <h2 className={`text-xl font-bold mb-2 ${effectType === "heal" ? "text-green-600" : "text-red-500"}`}>
                {effectType === "heal" ? "回復対象選択" : "ターゲット選択"}
            </h2>
            <p className="text-gray-700 mb-2 font-bold">
                {effectType === "heal"
                    ? `${value}回復するリーダーを選択してください`
                    : effectType === "damage"
                        ? `${value}ダメージを与えるリーダーを選択してください`
                        : "効果を与えるリーダーを選択してください"}
            </p>
            <p className="text-sm text-gray-500 mb-4 font-bold">
                {effectType === "heal" ? "自身のリーダーを選択可能" : "攻撃対象以外のリーダーのみ選択可能"}
            </p>

            <div className="flex gap-4 flex-wrap justify-center mb-6">
                {leaders.map((leader, i) => {
                    const valid = isValidTarget(leader, i);
                    const isSelected = selectedIndex === i;

                    return (
                        <div
                            key={i}
                            onClick={() => valid && setSelectedIndex(isSelected ? null : i)}
                            className={`w-28 h-36 rounded-lg border flex flex-col items-center justify-between p-2 transition-all shadow-sm
                                ${!valid
                                    ? "border-gray-200 bg-gray-100 opacity-40 cursor-not-allowed"
                                    : (isSelected
                                        ? `ring-4 ${effectType === "heal" ? "ring-green-100 bg-green-50 border-green-300 scale-105" : "ring-red-100 bg-red-50 border-red-300 scale-105"} cursor-pointer`
                                        : `border-gray-300 bg-white hover:scale-105 hover:border-gray-400 cursor-pointer`)}`}
                        >
                            <div className="text-[11px] text-center leading-tight font-bold text-gray-900">{leader.name}</div>
                            <div className="text-lg font-bold text-gray-900">
                                {leader.currentHp}/{leader.maxHp}
                            </div>
                            <div className="text-[10px] text-gray-500">
                                {leader.isDown ? "DOWN" : (excludeIndex === i ? "攻撃対象" : "")}
                            </div>
                            {isSelected && (
                                <div className={`absolute -bottom-2 ${effectType === "heal" ? "bg-green-500" : "bg-red-500"} text-white text-xs px-2 py-0.5 rounded font-bold shadow-sm`}>
                                    TARGET
                                </div>
                            )}
                            {leader.isAwakened && (
                                <div className="absolute top-1 right-1 text-yellow-500 text-xs shadow-sm">★</div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button
                onClick={confirmTarget}
                disabled={selectedIndex === null}
                className={`px-8 py-3 rounded-full font-bold transition-all shadow-md
                    ${selectedIndex !== null
                        ? `${effectType === "heal" ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400"} text-white cursor-pointer hover:scale-105`
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
                {selectedIndex !== null
                    ? `${leaders[selectedIndex]?.name}に${value}${effectType === "heal" ? "回復" : "ダメージ"}`
                    : "リーダーを選択してください"}
            </button>
        </div>
    );
}

export default EffectTargetOverlay;
