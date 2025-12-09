import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../App";

const API_BASE = "http://localhost:3001";

export default function LobbyRoomScreen() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { playerName, selectedDeck } = useApp();
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLobby = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/lobby/${lobbyId}`);
        const j = await res.json();
        if (mounted && j.success) {
          setLobby(j.lobby);
          if (j.lobby.status === "started") {
            navigate(`/battle/${lobbyId}`);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLobby();
    const iv = setInterval(fetchLobby, 2000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [lobbyId]);

  const startBattle = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/startLobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId }),
      });
      const j = await res.json();
      if (j.success) {
        alert("対戦を開始しました（仮）");
      } else {
        alert("開始できません: " + (j.reason || ""));
      }
    } catch (e) {
      console.error(e);
      alert("通信エラー");
    }
  };

  const leaveLobby = async () => {
    try {
      await fetch(`${API_BASE}/api/deleteLobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      navigate("/");
    }
  };

  if (loading) return <div style={{ padding: 24 }}>読み込み中…</div>;
  if (!lobby) return <div style={{ padding: 24 }}>ロビーが見つかりません</div>;

  const isHost = lobby.hostName === playerName;

  return (
    <div style={{ padding: 24 }}>
      <h2>待機ルーム</h2>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginTop: 12 }}>
        <div><b>ロビーID:</b> {lobby.lobbyId}</div>
        <div><b>ホスト:</b> {lobby.hostName}</div>
        <div><b>ゲスト:</b> {lobby.guestName || "未接続"}</div>
        <div><b>状態:</b> {lobby.status}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        {isHost && lobby.status === "ready" && (
          <button onClick={startBattle}>Start Battle</button>
        )}
        <button onClick={leaveLobby} style={{ marginLeft: 8 }}>退出</button>
      </div>
    </div>
  );
}
