import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../App";

const API_BASE = "http://localhost:3001";

export default function LobbySearchScreen() {
  const navigate = useNavigate();
  const { playerName, selectedDeck } = useApp();
  const [lobbies, setLobbies] = useState([]);

  const fetchLobbies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/listLobbies`);
      const j = await res.json();
      setLobbies(j.lobbies || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLobbies();
    const iv = setInterval(fetchLobbies, 2000);
    return () => clearInterval(iv);
  }, []);

  const joinLobby = async (lobbyId) => {
    if (!playerName) return alert("プレイヤー名を入力してください（ホーム）");
    try {
      const res = await fetch(`${API_BASE}/api/joinLobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lobbyId,
          playerName,
          deckId: selectedDeck ? selectedDeck.id : null,
        }),
      });
      const j = await res.json();
      if (j.success) {
        // go to shared lobby room (guest)
        navigate(`/lobby/room/${lobbyId}`);
      } else {
        alert("入室できません: " + (j.reason || ""));
      }
    } catch (e) {
      console.error(e);
      alert("通信エラー");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>ロビー検索</h2>
      <p>プレイヤー: {playerName || "未入力"}</p>
      <div style={{ marginTop: 12 }}>
        <button onClick={fetchLobbies}>更新</button>
        <button onClick={() => navigate("/")} style={{ marginLeft: 8 }}>
          戻る
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        {lobbies.length === 0 ? (
          <div>ロビーがありません</div>
        ) : (
          lobbies.map((l) => (
            <div
              key={l.lobbyId}
              style={{
                border: "1px solid #ccc",
                padding: 12,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: "bold" }}>{l.lobbyId}</div>
                <div style={{ fontSize: 12, color: "#666" }}>ホスト: {l.hostName}</div>
                <div style={{ fontSize: 12, color: "#666" }}>人数: {l.count}/2</div>
                <div style={{ fontSize: 12, color: l.status === "ready" ? "green" : "#b07200" }}>
                  {l.status}
                </div>
              </div>

              <div>
                <button onClick={() => joinLobby(l.lobbyId)}>入室</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
