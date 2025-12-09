import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { playerName, setPlayerName, selectedDeck, setSelectedDeck } = useApp();

  const [savedDecks, setSavedDecks] = useState([]);

  // 保存デッキ読み込み
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedDecks") || "[]");
    setSavedDecks(saved);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>XrossStars Online</h1>

      {/* プレイヤー名 */}
      <input
        placeholder="プレイヤー名"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        style={{ padding: 10, width: 200 }}
      />

      {/* デッキ選択関連 */}
      <div style={{ marginTop: 20 }}>
        <p>
          選択中デッキ：{" "}
          {selectedDeck ? selectedDeck.name : "未選択"}
        </p>

        {/* デッキ作成へ（新規） */}
        <button onClick={() => navigate("/deckbuilder")}>
          デッキ作成へ
        </button>

        {/* デッキ編集へ（選択されているときのみ） */}
        <button
          onClick={() =>
            navigate("/deckbuilder", { state: { deck: selectedDeck } })
          }
          style={{ marginLeft: 10 }}
          disabled={!selectedDeck}
        >
          デッキ編集へ
        </button>
      </div>

      {/* 保存デッキ一覧 */}
      <div style={{ marginTop: 30 }}>
        <h3>保存したデッキ一覧</h3>

        {savedDecks.length === 0 ? (
          <p>保存されたデッキはありません。</p>
        ) : (
          <ul>
            {savedDecks.map((deck) => (
              <li key={deck.id} style={{ marginBottom: 10 }}>
                {/* 編集へは遷移しない → ただ選択するだけ */}
                <button
                  onClick={() => setSelectedDeck(deck)}
                  style={{
                    padding: "6px 10px",
                    minWidth: 200,
                    background:
                      selectedDeck && selectedDeck.id === deck.id
                        ? "#ddd"
                        : "#fff",
                  }}
                >
                  {deck.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ロビー */}
      <div style={{ marginTop: 40 }}>
        <button
          onClick={() => navigate("/lobby/create")}
          disabled={!selectedDeck}
        >
          ロビー作成
        </button>

        <button
          onClick={() => navigate("/lobby/search")}
          style={{ marginLeft: 10 }}
        >
          ロビー検索
        </button>
      </div>
    </div>
  );
}
