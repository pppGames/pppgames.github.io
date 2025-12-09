import React, { useState } from 'react';

/**
 * DiscardSelectionOverlay Component
 * Allows player to select cards to discard from their hand
 */
function DiscardSelectionOverlay({ hand, count, message, socket }) {
    const [selectedIndices, setSelectedIndices] = useState([]);

    const toggleCard = (index) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else if (selectedIndices.length < count) {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const confirmDiscard = () => {
        if (selectedIndices.length === count && socket) {
            socket.send(JSON.stringify({
                type: "RESOLVE_ACTION",
                cardIndices: selectedIndices
            }));
            setSelectedIndices([]);
        }
    };

    return (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold mb-2 text-gray-800">手札を捨てる</h2>
            <p className="text-gray-600 mb-4 font-medium">{message}</p>
            <p className="text-sm text-gray-500 mb-4">
                選択中: {selectedIndices.length} / {count}
            </p>

            <div className="flex gap-3 flex-wrap justify-center max-w-4xl">
                {hand.map((card, i) => (
                    <div
                        key={i}
                        onClick={() => toggleCard(i)}
                        className={`w-24 h-32 bg-white text-gray-900 p-2 rounded cursor-pointer transition-all flex flex-col justify-between border
                            ${selectedIndices.includes(i)
                                ? "ring-4 ring-red-100 border-red-300 bg-red-50 scale-105"
                                : "hover:scale-105 hover:border-gray-400 border-gray-300"}`}
                    >
                        <div>
                            <div className="font-bold text-xs leading-tight mb-1 truncate">{card.name}</div>
                            <div className="text-[10px] font-bold text-blue-600">{card.type}</div>
                            {card.cost !== undefined && (
                                <div className="text-[10px]">コスト: {card.cost}</div>
                            )}
                        </div>
                        {selectedIndices.includes(i) && (
                            <div className="text-center text-red-600 font-bold text-xs bg-red-100 rounded">捨てる</div>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={confirmDiscard}
                disabled={selectedIndices.length !== count}
                className={`mt-6 px-8 py-3 rounded-full font-bold transition-all shadow-md
                    ${selectedIndices.length === count
                        ? "bg-red-500 hover:bg-red-400 text-white cursor-pointer hover:scale-105"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
                {selectedIndices.length === count ? "捨てる" : `あと${count - selectedIndices.length}枚選択`}
            </button>
        </div>
    );
}

export default DiscardSelectionOverlay;
