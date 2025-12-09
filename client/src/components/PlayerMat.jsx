import React from 'react';
import LeaderCard from './LeaderCard';

/**
 * PlayerMat Component
 * Displays a player's game board including leaders, PP, tactics, and card areas
 */
function PlayerMat({ player, isOpponent, onLeaderClick, pendingAction, onUseTactics, serverPendingAction }) {
    if (!player) return null;

    return (
        <div className="w-full max-w-4xl mx-auto border border-gray-300 rounded-xl bg-white p-2 grid grid-cols-[100px_1fr_100px] gap-2 text-sm h-full shadow-sm">

            {/* --- ROW 1 (Top) --- */}
            {/* TRASH (Top Left) */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-gray-500">
                <div className="text-xs font-bold tracking-wider">トラッシュ</div>
                <div className="text-lg font-bold text-gray-900">{player.trash.length}</div>
            </div>

            {/* PLAY AREA (Top Center) */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 relative p-2">
                <div className="absolute top-1 left-2 text-gray-400 text-[10px] font-bold tracking-wider">プレイエリア</div>
                <div className="flex justify-center items-center h-full gap-2 overflow-x-auto">
                    {player.field.map((c, i) => (
                        <div key={i} className={`w-12 h-16 bg-white rounded border text-black text-[9px] p-1 truncate shadow-sm ${c.type === "ATTACK" ? "border-red-400 ring-1 ring-red-100" : "border-gray-300"}`}>
                            {c.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* DECK (Top Right) */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-gray-500">
                <div className="text-xs font-bold tracking-wider">デッキ</div>
                <div className="text-lg font-bold text-gray-900">{player.mainDeck.length}</div>
            </div>


            {/* --- ROW 2 (Middle) --- */}

            {/* Left Spacer */}
            <div></div>

            {/* LEADERS (Center) */}
            <div className="flex justify-center items-center gap-2">
                {player.leaders.map((leader, index) => (
                    <LeaderCard
                        key={index}
                        leader={leader}
                        index={index}
                        isOpponent={isOpponent}
                        onLeaderClick={onLeaderClick}
                        pendingAction={pendingAction}
                        serverPendingAction={serverPendingAction}
                    />
                ))}
            </div>

            {/* Right Spacer */}
            <div></div>

            {/* --- ROW 3 (Bottom) --- */}

            {/* TACTICS AREA (Bottom Left) */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center gap-1 overflow-x-auto relative p-1">
                <div className="absolute top-1 left-1 text-[8px] text-gray-400 font-bold z-10">タクティクス</div>
                {player.tacticsArea && player.tacticsArea.map((card, i) => (
                    <div
                        key={i}
                        onClick={() => !isOpponent && onUseTactics && onUseTactics(card, i)}
                        className={`w-12 h-16 rounded flex flex-col items-center justify-center border text-[8px] truncate cursor-pointer hover:scale-105 relative shrink-0 shadow-sm transition-transform ${card.type === 'TICKET' ? 'bg-green-100 border-green-300 text-green-900' : 'bg-blue-100 border-blue-300 text-blue-900'}`}
                    >
                        <div className="text-center leading-tight whitespace-pre-wrap font-bold">{card.name}</div>
                        {!isOpponent && <div className="absolute bottom-0 w-full text-center bg-black/10 text-[7px] text-gray-700 font-bold">使用</div>}
                    </div>
                ))}
                {(!player.tacticsArea || player.tacticsArea.length === 0) && (
                    <div className="text-gray-400 text-xs italic">空</div>
                )}
            </div>

            {/* PP (Bottom Center) */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center relative">
                <div className="absolute bottom-1 text-gray-400 text-[10px] font-bold tracking-wider">プレイポイント</div>
                <div className="flex gap-2 mb-1">
                    {player.ppCards.map((pp, i) => (
                        <div key={i} className={`w-10 h-14 rounded border shadow-sm ${pp.isTapped ? "bg-gray-400 border-gray-300 rotate-90" : "bg-yellow-400 border-yellow-200"} transition-all`}></div>
                    ))}
                </div>
                <div className="text-sm font-bold bg-gray-200 px-3 py-0.5 rounded-full text-gray-700 shadow-inner">
                    {player.ppCards.filter(p => !p.isTapped).length} / {player.ppCards.length}
                </div>
            </div>

            {/* TACTICS DECK (Bottom Right) */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-gray-500">
                <div className="text-[10px] text-center font-bold tracking-wider leading-tight">タクティクス<br />デッキ</div>
                <div className="text-lg font-bold text-gray-900">{player.tacticsDeck.length}</div>
            </div>

        </div>
    );
}

export default PlayerMat;
