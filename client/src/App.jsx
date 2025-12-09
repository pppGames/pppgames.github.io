// ======================================================================
// XROSSSTARS CLIENT — CLEAN ROUTING + DECK SELECT + LOBBY SYSTEM
// ======================================================================

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";

import {
  HashRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";

import HomeScreen from "./screens/HomeScreen";
import DeckSelectScreen from "./screens/DeckSelectScreen";
import DeckBuilderScreen from "./screens/DeckBuilderScreen";
import LobbyCreateScreen from "./screens/LobbyCreateScreen";
import LobbySearchScreen from "./screens/LobbySearchScreen";
import LobbyRoomScreen from "./screens/LobbyRoomScreen";
import BattleScreen from "./screens/BattleScreen"; // Added import

// -----------------------------
// グローバル状態管理
// -----------------------------
const AppContext = createContext();
export const useApp = () => useContext(AppContext);

// -----------------------------
// Provider
// -----------------------------
const AppProvider = ({ children }) => {
  const [playerName, setPlayerName] = useState("Player");
  const [selectedDeck, setSelectedDeck] = useState(null); // Objects { leaders: [], main: [], tactics: [] }

  return (
    <AppContext.Provider
      value={{
        playerName,
        setPlayerName,
        selectedDeck,
        setSelectedDeck,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// -----------------------------
// Main App
// -----------------------------
function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>

          {/* ホーム */}
          <Route path="/" element={<HomeScreen />} />

          {/* デッキ選択 */}
          <Route path="/select-deck" element={<DeckSelectScreen />} />

          {/* デッキビルダー */}
          <Route path="/deckbuilder" element={<DeckBuilderScreen />} />

          {/* ロビー */}
          <Route path="/lobby/create" element={<LobbyCreateScreen />} />
          <Route path="/lobby/search" element={<LobbySearchScreen />} />
          <Route path="/lobby/room/:lobbyId" element={<LobbyRoomScreen />} />

          {/* バトル */}
          <Route path="/battle/:lobbyId" element={<BattleScreen />} />

        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
