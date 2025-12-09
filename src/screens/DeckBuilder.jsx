import React, { useState } from "react";
import leaders from "../data/leader_data.json";
import attacks from "../data/atk_data.json";
import mems from "../data/mem_data.json";
import tactics from "../data/tactics_data.json";

export default function DeckBuilderScreen() {
  const [selectedLeaders, setSelectedLeaders] = useState([]);
  const [selectedMain, setSelectedMain] = useState([]);
  const [selectedTactics, setSelectedTactics] = useState([]);
  const [filter, setFilter] = useState("");

  const allMain = [...attacks, ...mems];

  const addCard = (list, setList, card, limit) => {
    const count = list.filter((c) => c.id === card.id).length;
    if (count >= limit) return;
    setList([...list, card]);
  };

  const removeCard = (list, setList, index) => {
    const newList = [...list];
    newList.splice(index, 1);
    setList(newList);
  };

  const validateDeck = () => {
    const errors = [];
    if (selectedLeaders.length !== 4) errors.push("リーダーは4枚必要です");
    if (selectedMain.length !== 50) errors.push("メインデッキは50枚必要です");
    if (selectedTactics.length !== 5) errors.push("タクティクスは5枚必要です");

    const aceCount = selectedMain.filter((c) => c.rarity === "ACE").length;
    if (aceCount > 8) errors.push("ACEカードは8枚までです");

    const nameCount = {};
    [...selectedLeaders, ...selectedMain, ...selectedTactics].forEach((card) => {
      nameCount[card.id] = (nameCount[card.id] || 0) + 1;
    });
    Object.values(nameCount).forEach((v) => {
      if (v > 4) errors.push("同名カードは4枚までです");
    });

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return false;
    }
    alert("デッキが正常です！保存できます。");
    return true;
  };

  const filtered = (cards) => {
    if (!filter) return cards;
    return cards.filter((c) => c.name.includes(filter));
  };

  return (
    <div className="p-4 grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <h1 className="text-2xl font-bold mb-2">デッキビルダー</h1>
        <input
          className="border p-1 w-full mb-3"
          placeholder="カード名で検索"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <h2 className="text-xl font-bold mt-4">リーダー（4枚）</h2>
        <div className="grid grid-cols-4 gap-2">
          {filtered(leaders).map((card) => (
            <button
              key={card.id}
              className="border p-2 rounded"
              onClick={() => addCard(selectedLeaders, setSelectedLeaders, card, 1)}
            >
              {card.name}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold mt-4">メインデッキ（50枚）</h2>
        <div className="grid grid-cols-4 gap-2">
          {filtered(allMain).map((card) => (
            <button
              key={card.id}
              className="border p-2 rounded"
              onClick={() => addCard(selectedMain, setSelectedMain, card, 4)}
            >
              {card.name}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold mt-4">タクティクス（5枚）</h2>
        <div className="grid grid-cols-4 gap-2">
          {filtered(tactics).map((card) => (
            <button
              key={card.id}
              className="border p-2 rounded"
              onClick={() => addCard(selectedTactics, setSelectedTactics, card, 4)}
            >
              {card.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">デッキ内容</h2>

        <h3 className="font-bold">リーダー（{selectedLeaders.length}/4）</h3>
        {selectedLeaders.map((c, i) => (
          <div key={i} className="flex justify-between border p-1 mb-1">
            {c.name}
            <button onClick={() => removeCard(selectedLeaders, setSelectedLeaders, i)}>×</button>
          </div>
        ))}

        <h3 className="font-bold mt-3">メイン（{selectedMain.length}/50）</h3>
        {selectedMain.map((c, i) => (
          <div key={i} className="flex justify-between border p-1 mb-1">
            {c.name}
            <button onClick={() => removeCard(selectedMain, setSelectedMain, i)}>×</button>
          </div>
        ))}

        <h3 className="font-bold mt-3">タクティクス（{selectedTactics.length}/5）</h3>
        {selectedTactics.map((c, i) => (
          <div key={i} className="flex justify-between border p-1 mb-1">
            {c.name}
            <button onClick={() => removeCard(selectedTactics, setSelectedTactics, i)}>×</button>
          </div>
        ))}

        <button
          className="mt-4 w-full bg-blue-500 text-white p-2 rounded"
          onClick={validateDeck}
        >
          デッキを検証
        </button>
      </div>
    </div>
  );
}
