import React, { useEffect, useState } from "react";
import { useApp } from "../App";
import { useNavigate } from "react-router-dom";

import decksJSON from "../data/decks.json";

export default function DeckSelectScreen() {
  const { setSelectedDeck } = useApp();
  const [decks, setDecks] = useState([]);
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Load from LocalStorage (DeckBuilder saves here)
    const saved = JSON.parse(localStorage.getItem("savedDecks") || "[]");

    // Fallback/Merge with defaults if empty?
    // If user has no saved decks, show defaults from file
    if (saved.length === 0 && decksJSON.decks) {
      setDecks(decksJSON.decks);
    } else {
      setDecks(saved);
    }
  }, []);

  const chooseDeck = () => {
    if (!selected) return alert("デッキを選択してください");
    setSelectedDeck(selected);
    navigate("/");
  };

  const deleteDeck = (e, deckId) => {
    e.stopPropagation(); // Prevent selection
    if (!window.confirm("本当に削除しますか？")) return;

    const newDecks = decks.filter(d => d.id !== deckId);
    setDecks(newDecks);
    localStorage.setItem("savedDecks", JSON.stringify(newDecks));
    if (selected && selected.id === deckId) setSelected(null);
  };

  const editDeck = (e, deck) => {
    e.stopPropagation();
    navigate("/deck", { state: { deck } }); // Go to Builder with data
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>デッキ選択</h1>

      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {decks.map((d) => (
          <div
            key={d.id}
            onClick={() => setSelected(d)}
            style={{
              border: "1px solid #444",
              padding: 10,
              marginTop: 10,
              cursor: "pointer",
              background: selected?.id === d.id ? "#d0f0ff" : "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <b>{d.name}</b>（{d.main?.length || 0}枚）
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={(e) => editDeck(e, d)}
                style={{ background: "#eee", padding: "4px 8px" }}
              >
                編集
              </button>
              <button
                onClick={(e) => deleteDeck(e, d.id)}
                style={{ background: "#ffdddd", padding: "4px 8px" }}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: "10px" }}>
        <button
          style={{ padding: 10, fontWeight: "bold" }}
          onClick={chooseDeck}
        >
          決定してロビーへ
        </button>

        <button
          style={{ padding: 10 }}
          onClick={() => navigate("/deck")}
        >
          新規作成
        </button>

        <button
          style={{ padding: 10, background: "#888", color: "white" }}
          onClick={() => {
            if (!window.confirm("全てのデッキを初期化しますか？")) return;
            localStorage.removeItem("savedDecks");
            setDecks(decksJSON.decks || []);
            alert("初期化しました");
          }}
        >
          初期化（設定リセット）
        </button>
      </div>
    </div>
  );
}
