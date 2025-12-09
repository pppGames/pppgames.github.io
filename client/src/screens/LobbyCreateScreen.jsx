import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";

const API_BASE = "http://localhost:3001";

export default function LobbyCreateScreen() {
  const navigate = useNavigate();
  const { playerName, selectedDeck } = useApp();
  const [creating, setCreating] = useState(false);

  const createLobby = async () => {
    if (!playerName) return alert("プレイヤー名を入力してください（ホーム）");
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/createLobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          deckId: selectedDeck ? selectedDeck.id : null,
        }),
      });
      const j = await res.json();
      if (j.lobbyId) {
        // go to lobby room (host view)
        navigate(`/lobby/room/${j.lobbyId}`);
      } else {
        alert("ロビー作成に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("通信エラー");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>ロビー作成</h2>
      <p>ホスト: {playerName || "未入力"}</p>
      <p>選択デッキ: {selectedDeck ? selectedDeck.name : "未選択"}</p>

      <div style={{ marginTop: 18 }}>
        <button onClick={createLobby} disabled={creating}>
          {creating ? "作成中..." : "ロビーを作成する"}
        </button>
        <button onClick={() => navigate("/")} style={{ marginLeft: 10 }}>
          戻る
        </button>
      </div>
    </div>
  );
}
