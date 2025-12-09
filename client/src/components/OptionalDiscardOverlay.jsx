import React, { useState } from 'react';

/**
 * OptionalDiscardOverlay Component
 * Allows player to optionally discard a card for attack bonuses
 */
function OptionalDiscardOverlay({ hand, condition, message, socket }) {
    const [selectedIndex, setSelectedIndex] = useState(null);

    // Filter valid cards for discard_0_cost condition
    const isValidCard = (card, index) => {
        if (condition === "discard_0_cost") {
            return (card.cost || 0) === 0;
        }
        return true;
    };

    const confirmDiscard = () => {
        if (selectedIndex !== null && socket) {
            socket.send(JSON.stringify({
                type: "RESOLVE_ACTION",
                cardIndex: selectedIndex
            }));
            setSelectedIndex(null);
        }
    };

    const skipDiscard = () => {
        if (socket) {
            socket.send(JSON.stringify({
                type: "RESOLVE_ACTION",
                skip: true
            }));
        }
    };

    const hasValidCards = hand.some((card, i) => isValidCard(card, i));

    return (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold mb-2 text-gray-800">任意の捨て札</h2>
            <p className="text-gray-600 mb-4 font-medium">{message}</p>
            <p className="text-sm text-gray-500 mb-2">捨てるとダメージボーナスが発動します</p>

            {hasValidCards ? (
                <>
                    <div className="flex gap-3 flex-wrap justify-center max-w-4xl mb-4">
                        {hand.map((card, i) => {
                            const valid = isValidCard(card, i);
                            const isSelected = selectedIndex === i;
                            return (
                                <div
                                    key={i}
                                    onClick={() => valid && setSelectedIndex(isSelected ? null : i)}
                                    className={`w-24 h-32 bg-white text-gray-900 p-2 rounded flex flex-col justify-between transition-all border
                                        ${valid
                                            ? (isSelected
                                                ? "ring-4 ring-red-100 border-red-300 bg-red-50 scale-105 cursor-pointer"
                                                : "hover:scale-105 hover:border-gray-400 border-gray-300 cursor-pointer")
                                            : "opacity-30 border-gray-200 cursor-not-allowed"}`}
                                >
                                    <div>
                                        <div className="font-bold text-xs leading-tight mb-1 truncate">{card.name}</div>
                                        <div className="text-[10px] font-bold text-blue-600">{card.type}</div>
                                        {card.cost !== undefined && (
                                            <div className="text-[10px]">コスト: {card.cost}</div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <div className="text-center text-red-600 font-bold text-xs bg-red-100 rounded">捨てる</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={confirmDiscard}
                            disabled={selectedIndex === null}
                            className={`px-6 py-3 rounded-full font-bold transition-all shadow-md
                                ${selectedIndex !== null
                                    ? "bg-red-500 hover:bg-red-400 text-white cursor-pointer hover:scale-105"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                        >
                            捨てる (+ダメージ)
                        </button>
                        <button
                            onClick={skipDiscard}
                            className="bg-gray-500 hover:bg-gray-400 text-white px-6 py-3 rounded-full font-bold shadow-md hover:scale-105 transition-transform"
                        >
                            捨てない
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-gray-500 mb-4">有効なカードがありません</p>
                    <button
                        onClick={skipDiscard}
                        className="bg-gray-500 hover:bg-gray-400 text-white px-6 py-3 rounded-full font-bold shadow-md hover:scale-105 transition-transform"
                    >
                        続行
                    </button>
                </>
            )}
        </div>
    );
}

export default OptionalDiscardOverlay;
