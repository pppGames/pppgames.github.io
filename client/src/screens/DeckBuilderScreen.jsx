import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import leadersJson from "../data/leader_data.json";
import attacksJson from "../data/atk_data.json";
import memsJson from "../data/mem_data.json";
import tacticsJson from "../data/tactics_data.json";

// Data Access
const leaderList = leadersJson.leaders || [];
const attackList = attacksJson || [];
const memList = memsJson;
const tacticsList = tacticsJson;

export default function DeckBuilderScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingDeck = location.state?.deck || null;

  // State
  const [deck, setDeck] = useState({
    leaders: [],
    main: [],
    tactics: []
  });
  const [deckName, setDeckName] = useState("");

  // Layout State
  const [activeTab, setActiveTab] = useState("LEADER"); // LEADER, MAIN_ATTACK, MAIN_MEMORIA, TACTICS
  const [filterColor, setFilterColor] = useState("ALL"); // ALL, Red, Blue, Yellow, Green
  const [searchText, setSearchText] = useState("");

  // Init
  useEffect(() => {
    if (editingDeck) {
      setDeck({
        leaders: editingDeck.leaders || [],
        main: editingDeck.main || [],
        tactics: editingDeck.tactics || []
      });
      setDeckName(editingDeck.name);
    }
  }, [editingDeck]);

  // Logic: Add Card
  const addCard = (card) => {
    const type = card.type;

    if (type === "LEADER") {
      if (deck.leaders.length >= 4) return alert("Leaders max 4");
      if (deck.leaders.some(l => l.name === card.name)) return alert("Unique Leaders only");
      setDeck(prev => ({ ...prev, leaders: [...prev.leaders, card] }));
      return;
    }

    if (type === "TACTICS") {
      if (deck.tactics.length >= 5) return alert("Tactics max 5");
      if (deck.tactics.some(c => c.id === card.id)) return alert("Unique Tactics only");
      setDeck(prev => ({ ...prev, tactics: [...prev.tactics, card] }));
      return;
    }

    // Main Deck (Attack/Memoria)
    const prev = deck.main;
    const sameCount = prev.filter(c => c.id === card.id).length;
    if (sameCount >= 4) return; // Max 4 copies
    if (prev.length >= 50) return alert("Main Deck max 50");

    setDeck(prev => ({ ...prev, main: [...prev.main, card] }));
  };

  // Logic: Remove Card
  const removeCard = (card, deckType) => {
    if (deckType === "main") {
      // Remove one instance
      const idx = deck.main.findIndex(c => c.id === card.id);
      if (idx > -1) {
        const newMain = [...deck.main];
        newMain.splice(idx, 1);
        setDeck(prev => ({ ...prev, main: newMain }));
      }
    } else {
      setDeck(prev => ({
        ...prev,
        [deckType]: prev[deckType].filter(c => c.id !== card.id)
      }));
    }
  };

  // Logic: Build Rules (Inferred from card.leader and card.color)
  // Logic: Build Rules (Inferred from card.leader and card.color)
  function cardMatchesBuildRule(card, selectedLeaders) {
    // If no leaders selected yet, show everything
    if (selectedLeaders.length === 0) return true;

    const leaderNames = selectedLeaders.map(l => l.name);
    const leaderColors = selectedLeaders.map(l => l.color);

    // 1. Signature Rule: If card is dedicated to a leader, you must have that leader.
    if (card.leader) {
      // Handle "Xのリーダー1体以上" (Generic Color Requirement)
      if (card.leader.includes("1体以上")) {
        const colorMap = { "赤": "Red", "青": "Blue", "黄": "Yellow", "緑": "Green" };
        // Example: "赤のリーダー1体以上" -> "赤"
        const requiredColorChar = card.leader.charAt(0);
        const requiredColor = colorMap[requiredColorChar];

        if (requiredColor) {
          // Check if we have at least 1 leader of this color
          const count = leaderColors.filter(c => c === requiredColor).length;
          if (count < 1) return false;
        }
      }
      else {
        // Specific Leader Name
        if (!leaderNames.includes(card.leader)) return false;
      }
    }

    // 2. Color Rule: You must have a leader of the card's color.
    if (card.color && card.color !== "Colorless") {
      if (!leaderColors.includes(card.color)) return false;
    }

    return true;
  }

  // Filter Active List
  const displayCards = useMemo(() => {
    let source = [];
    if (activeTab === "LEADER") source = leaderList;
    else if (activeTab === "TACTICS") source = tacticsList;
    else if (activeTab === "MAIN") source = [...attackList, ...memList];

    return source.filter(c => {
      // Tab specific type filter for MAIN
      // Actually "MAIN" tab shows both? Or separate? 
      // Let's allow filtering by Type inside MAIN?
      // For simplicity: If MAIN tab, show all Attack/Memoria.

      // Build Rule
      if (activeTab !== "LEADER") {
        if (!cardMatchesBuildRule(c, deck.leaders)) return false;
      }

      // Color Filter
      if (filterColor !== "ALL" && c.color !== filterColor) return false;

      // Search
      if (searchText) {
        if (!c.name.includes(searchText) && !c.text?.includes(searchText)) return false;
      }

      return true;
    });
  }, [activeTab, filterColor, searchText, deck.leaders]);

  // Actions
  const saveDeck = () => {
    if (!deckName) return alert("Please enter deck name.");
    if (deck.leaders.length !== 4) return alert("Must have 4 Leaders.");
    if (deck.main.length !== 50) return alert("Main Deck must be 50 cards.");
    if (deck.tactics.length !== 5) return alert("Tactics must be 5.");

    const saved = JSON.parse(localStorage.getItem("savedDecks") || "[]");
    const deckData = {
      id: editingDeck ? editingDeck.id : Date.now(),
      name: deckName,
      leaders: deck.leaders,
      main: deck.main,
      tactics: deck.tactics
    };

    if (editingDeck) {
      const updated = saved.map(d => d.id === editingDeck.id ? deckData : d);
      localStorage.setItem("savedDecks", JSON.stringify(updated));
    } else {
      saved.push(deckData);
      localStorage.setItem("savedDecks", JSON.stringify(saved));
    }
    alert("Deck Saved!");
    navigate("/");
  };

  const deleteDeck = () => {
    if (!editingDeck || !window.confirm("Delete this deck?")) return;
    const saved = JSON.parse(localStorage.getItem("savedDecks") || "[]");
    const updated = saved.filter(d => d.id !== editingDeck.id);
    localStorage.setItem("savedDecks", JSON.stringify(updated));
    navigate("/");
  };

  // Helper Stats
  const mainCount = deck.main.reduce((acc, c) => { acc[c.id] = (acc[c.id] || 0) + 1; return acc; }, {});

  // Render Helpers
  const ColorDot = ({ color }) => {
    const map = { Red: "bg-red-500", Blue: "bg-blue-500", Yellow: "bg-yellow-400", Green: "bg-green-500" };
    return <div className={`w-3 h-3 rounded-full ${map[color] || "bg-gray-500"}`} />;
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden font-sans">

      {/* LEFT COLUMN: COLLECTION */}
      <div className="flex-1 flex flex-col border-r border-slate-700 min-w-0">
        {/* Header / Filters */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 shadow-md z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Card Collection</h2>
            <input
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Search cards..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
            {/* Tabs */}
            {["LEADER", "MAIN", "TACTICS"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === tab ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-slate-700 text-gray-400 hover:bg-slate-600"}`}
              >
                {tab}
              </button>
            ))}
            <div className="w-4 border-r border-slate-600 mx-2"></div>
            {/* Color Filters */}
            {["ALL", "Red", "Blue", "Yellow", "Green"].map(col => (
              <button
                key={col}
                onClick={() => setFilterColor(col)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${filterColor === col ? "bg-white text-black" : "bg-slate-800 border border-slate-600 hover:bg-slate-700"}`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-900/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayCards.map(card => {
              const inDeck = (activeTab === "LEADER" ? deck.leaders : (activeTab === "TACTICS" ? deck.tactics : deck.main)).filter(c => c.id === card.id).length;
              const max = (card.type === "LEADER") ? 1 : (card.type === "TACTICS" ? 1 : 4); // Logic checks
              const isMaxed = inDeck >= max; // Rough check (Leader names check done locally in addCard)

              return (
                <div
                  key={card.id}
                  onClick={() => addCard(card)}
                  className={`
                                    relative aspect-[3/4] rounded-lg border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-xl hover:z-10 bg-slate-800
                                    ${card.color === "Red" ? "border-red-900/50 hover:border-red-500" : ""}
                                    ${card.color === "Blue" ? "border-blue-900/50 hover:border-blue-500" : ""}
                                    ${card.color === "Yellow" ? "border-yellow-900/50 hover:border-yellow-400" : ""}
                                    ${card.color === "Green" ? "border-green-900/50 hover:border-green-500" : ""}
                                    ${isMaxed ? "opacity-50 grayscale" : ""}
                                `}
                >
                  <div className="p-2 h-full flex flex-col">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-black/40 px-1 rounded text-gray-300 font-mono">{card.cost ?? "-"}</span>
                      <ColorDot color={card.color} />
                    </div>
                    <div className="mt-1 font-bold text-xs leading-tight mb-auto">{card.name}</div>
                    <div className="text-[13px] text-gray-400 line-clamp-4 leading-snug">{card.text}</div>
                    <div className="mt-2 text-[15px] text-right font-mono text-gray-500">{card.type}</div>
                  </div>
                  {inDeck > 0 && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white w-6 h-6 rounded-bl-lg flex items-center justify-center font-bold text-xs shadow-md">
                      {inDeck}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {displayCards.length === 0 && (
            <div className="text-center text-gray-500 mt-20">No matching cards found.</div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: CURRENT DECK */}
      <div className="w-80 md:w-96 bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-20">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => navigate("/")} className="text-xs text-gray-400 hover:text-white">← BACK</button>
            <div className="flex gap-2">
              {editingDeck && (
                <button onClick={deleteDeck} className="bg-red-900/50 text-red-200 px-3 py-1 rounded text-xs hover:bg-red-900 transition-colors">Del</button>
              )}
              <button onClick={saveDeck} className="bg-blue-600 text-white px-4 py-1 rounded text-xs font-bold hover:bg-blue-500 shadow-lg transition-transform hover:scale-105">SAVE</button>
            </div>
          </div>
          <input
            className="w-full bg-transparent border-b border-gray-700 text-lg font-bold text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
            placeholder="Deck Name"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
          />
        </div>

        {/* Deck Lists */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">

          {/* Leaders */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 px-2 mb-1">
              <span>LEADERS</span>
              <span className={deck.leaders.length === 4 ? "text-green-400" : "text-red-400"}>{deck.leaders.length}/4</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {deck.leaders.map(l => (
                <div key={l.id} onClick={() => removeCard(l, "leaders")} className="bg-slate-800 border border-slate-700 aspect-[3/4] rounded p-1 cursor-pointer hover:bg-red-900/30">
                  <div className="text-[9px] leading-tight font-bold">{l.name}</div>
                  <div className="mt-1 w-2 h-2 rounded-full" style={{ background: l.color.toLowerCase() }}></div>
                </div>
              ))}
              {[...Array(4 - deck.leaders.length)].map((_, i) => (
                <div key={i} className="bg-slate-900/30 border border-dashed border-slate-700 rounded aspect-[3/4] flex items-center justify-center text-xs text-gray-700">Empty</div>
              ))}
            </div>
          </div>

          {/* Tactics */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 px-2 mb-1">
              <span>TACTICS</span>
              <span className={deck.tactics.length === 5 ? "text-green-400" : "text-red-400"}>{deck.tactics.length}/5</span>
            </div>
            <div className="space-y-1">
              {deck.tactics.map(c => (
                <div key={c.id} onClick={() => removeCard(c, "tactics")} className="flex justify-between items-center bg-slate-800 px-2 py-1 rounded border border-purple-900/50 cursor-pointer hover:border-red-500">
                  <span className="text-xs truncate">{c.name}</span>
                  <span className="text-[10px] text-gray-500">1</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Deck */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 px-2 mb-1">
              <span>MAIN DECK</span>
              <span className={deck.main.length === 50 ? "text-green-400" : "text-red-400"}>{deck.main.length}/50</span>
            </div>
            {/* Visual Curve? Too much work for now. List view by cost */}
            <div className="space-y-0.5">
              {Object.entries(mainCount).sort((a, b) => {
                // Sort logic: Cost -> Type -> Name?
                // Simplified: just id order via entry? No random.
                // Need actual card obj for sort.
                const cardA = deck.main.find(c => c.id === a[0]);
                const cardB = deck.main.find(c => c.id === b[0]);
                return (cardA.cost || 0) - (cardB.cost || 0);
              }).map(([id, count]) => {
                const card = deck.main.find(c => c.id === id);
                return (
                  <div key={id} onClick={() => removeCard(card, "main")} className="group flex justify-between items-center bg-slate-800 px-2 py-1 rounded border border-slate-700 cursor-pointer hover:border-red-500 hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold text-black ${card.color === "Red" ? "bg-red-500" : card.color === "Blue" ? "bg-blue-500" : card.color === "Yellow" ? "bg-yellow-400" : "bg-green-500"}`}>
                        {card.cost ?? 0}
                      </div>
                      <span className="text-xs truncate">{card.name}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-400 group-hover:text-red-400">x{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
