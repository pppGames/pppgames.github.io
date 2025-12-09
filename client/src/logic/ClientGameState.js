import { v4 as uuid } from "uuid";
import atkDataRaw from "../data/atk_data.json";
import memDataRaw from "../data/mem_data.json";
import leaderDataRaw from "../data/leader_data.json";
import tacticsDataRaw from "../data/tactics_data.json";
import { executeEffect } from './effects/index.js';

// Helper map
const cardsMap = {};
atkDataRaw.forEach(c => cardsMap[c.id] = c);
memDataRaw.forEach(c => cardsMap[c.id] = c);
tacticsDataRaw.forEach(c => cardsMap[c.id] = c);

const leadersMap = {};
leaderDataRaw.leaders.forEach(l => leadersMap[l.id] = l);
// Also map by name if needed, as fallback
leaderDataRaw.leaders.forEach(l => leadersMap[l.name] = l);

export class ClientGameState {
    constructor(player1Data, player2Data) {
        // playerData: { id, name, deck: { leaders, main, tactics }, socket }
        this.players = {
            [player1Data.id]: this.initPlayer(player1Data),
            [player2Data.id]: this.initPlayer(player2Data),
        };

        this.playerIds = [player1Data.id, player2Data.id];
        this.turnPlayerId = null;
        this.roundWinner = null;
        this.gameWinner = null;

        this.currentRound = 1;
        this.maxPP = 3;
        this.firstPlayerIndex = Math.floor(Math.random() * 2);

        this.turnCount = 1;
        this.phase = "TACTICS_SELECTION"; // New Phase
    }

    initPlayer(data) {
        return {
            id: data.id,
            name: data.name,
            leaders: data.deck.leaders.map(l => {
                const id = l.id || l.name;
                const base = leadersMap[id] || leadersMap[l.name];

                // Fallback vals
                const hpBefore = base ? base.hp_before : 100;
                const atkBefore = base ? base.atk_before : 30;

                return {
                    ...base,
                    ...l,
                    currentHp: hpBefore,
                    maxHp: hpBefore,
                    atk: atkBefore,
                    isAwakened: false,
                    isDown: false,
                    equipped: [],
                    hp_after: base ? base.hp_after : 130,
                    atk_after: base ? base.atk_after : 40,
                };
            }),
            mainDeck: this.shuffle([...data.deck.main]),
            tacticsDeck: data.deck.tactics.map(c => {
                const base = cardsMap[c.id] || cardsMap[c.name];
                return base ? { ...base, ...c } : c;
            }),
            hand: [],
            ppCards: [],
            tacticsArea: [], // Changed to Array
            trash: [],
            field: [],
            roundsWon: 0,
            tacticsReady: false,
            nextAttackBoost: 0,
            turnBuffs: { attack: 0 },
            tacticsUsedThisTurn: 0,
        };
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Game Flow ---

    startGame() {
        this.setupRound();
    }

    setupRound() {
        this.phase = "TACTICS_SELECTION";
        this.turnCount = 1;

        if (this.currentRound === 1) this.maxPP = 3;
        else if (this.currentRound === 2) this.maxPP = 4;
        else if (this.currentRound === 3) this.maxPP = 5;

        this.playerIds.forEach(pid => {
            const p = this.players[pid];
            p.tacticsReady = false;

            // Cleanup
            p.field.forEach(c => p.trash.push(c));
            p.field = [];
            p.hand.forEach(c => p.trash.push(c));
            p.hand = [];

            p.leaders.forEach(l => {
                // Base Stats
                let maxHp = l.isAwakened ? l.hp_after : l.hp_before;
                let atk = l.isAwakened ? l.atk_after : l.atk_before;

                // Equipment Stats Persistence
                l.equipped.forEach(eq => {
                    if (eq.id === "T007" || eq.name === "ライトシールド") maxHp += 30;
                    if (eq.id === "T008" || eq.name === "ボディアーマー") maxHp += 40;
                });

                l.maxHp = maxHp;
                l.currentHp = maxHp; // Full Heal / Counter Removed
                l.atk = atk;
                l.isDown = false;
            });

            p.ppCards = Array.from({ length: this.maxPP }, () => ({ id: uuid(), isTapped: false }));
        });

        if (this.currentRound === 1) {
            this.turnPlayerId = this.playerIds[this.firstPlayerIndex];
        } else {
            if (this.roundWinner) {
                const loserId = this.playerIds.find(id => id !== this.roundWinner);
                this.turnPlayerId = loserId;
            }
        }
        this.roundWinner = null;
    }



    setPendingAction(playerId, action) {
        const p = this.players[playerId];
        if (!p.pendingAction) {
            p.pendingAction = action;
        } else {
            // Traverse to end of queue
            let current = p.pendingAction;
            while (current.next) {
                current = current.next;
            }
            current.next = action;
        }
    }

    selectTactics(playerId, cardIndex) {
        if (this.phase !== "TACTICS_SELECTION") return { success: false, reason: "Not in Tactics Selection Phase" };
        const p = this.players[playerId];
        if (p.tacticsReady) return { success: false, reason: "Already selected" };

        const card = p.tacticsDeck[cardIndex];
        if (!card) return { success: false, reason: "Card not found" };

        p.tacticsDeck.splice(cardIndex, 1);
        p.tacticsArea.push(card);
        p.tacticsReady = true;

        const allReady = this.playerIds.every(id => this.players[id].tacticsReady);
        if (allReady) {
            this.startRoundMain();
        }

        return { success: true, state: this.getState() };
    }

    startRoundMain() {
        this.phase = "MAIN";

        // Second Player gets PP Ticket
        const secondPlayerId = this.playerIds.find(id => id !== this.turnPlayerId);
        if (this.players[secondPlayerId]) {
            this.players[secondPlayerId].tacticsArea.push({
                id: "pp_ticket_" + uuid(),
                name: "PP Ticket",
                type: "TICKET",
                cost: 0,
                text: "Recover 1 PP"
            });
        }

        this.playerIds.forEach(pid => {
            this.drawCards(pid, 4);
        });
    }

    drawCards(playerId, count) {
        const p = this.players[playerId];
        for (let i = 0; i < count; i++) {
            if (p.mainDeck.length === 0) {
                this.handleDeckOut(playerId);
                if (this.gameWinner) return;
            }
            if (p.mainDeck.length > 0) {
                let card = p.mainDeck.shift();
                if (card.id && cardsMap[card.id]) {
                    card = { ...cardsMap[card.id], ...card };
                }
                p.hand.push(card);
            }
        }
    }

    handleDeckOut(playerId) {
        const p = this.players[playerId];
        if (p.tacticsDeck.length === 0) {
            const formatWinner = this.playerIds.find(id => id !== playerId);
            this.endGame(formatWinner, "DECK_OUT");
            return;
        }

        // Recycle Trash (Only Main Deck Cards)
        // Design: Trash has keys. Main cards don't have type="TACTICS".
        const mainRecycle = p.trash.filter(c => c.type !== "TACTICS" && c.type !== "TICKET");
        const restTrash = p.trash.filter(c => c.type === "TACTICS" || c.type === "TICKET");

        p.mainDeck = this.shuffle([...mainRecycle]);
        p.trash = restTrash; // Keep tactics/public trash

        const ridx = Math.floor(Math.random() * p.tacticsDeck.length);
        const penaltyCard = p.tacticsDeck.splice(ridx, 1)[0];
        // Penalty goes to Face Up trash (Standard trash for tactics)?
        // Spec says "Face up to trash". 
        p.trash.push(penaltyCard);
    }

    useTactics(playerId, cardIndex) {
        if (this.phase !== "MAIN") return { success: false, reason: "Not Main Phase" };
        if (playerId !== this.turnPlayerId) return { success: false, reason: "Not your turn" };
        const p = this.players[playerId];

        // Access by index (if cardIndex not provided, check if legacy single?)
        // Client sends cardIndex now.
        if (cardIndex === undefined) return { success: false, reason: "Card Index required" };

        const card = p.tacticsArea[cardIndex];
        if (!card) return { success: false, reason: "Tactics card not found" };

        // Handle PP Ticket
        if (card.type === "TICKET") {
            const tappedPP = p.ppCards.find(pp => pp.isTapped);
            if (tappedPP) {
                tappedPP.isTapped = false;
            }
            p.tacticsArea.splice(cardIndex, 1);
            p.trash.push(card);
            return { success: true, state: this.getState() };
        }

        // Normal Tactics
        if (this.currentRound === 1 && this.turnCount === 1) {
            return { success: false, reason: "Cannot use Tactics on the very first turn" };
        }

        // Limit 1 per turn
        if (card.type !== "TICKET" && p.tacticsUsedThisTurn >= 1) {
            return { success: false, reason: "Already used Tactics this turn" };
        }

        // Cost Check
        const cost = card.cost || 0;
        const availablePP = p.ppCards.filter(pp => !pp.isTapped).length;
        if (availablePP < cost) return { success: false, reason: "Not enough PP for Tactics" };

        // Tap PP
        this.tapPP(p, cost);

        // Move to Field
        p.field.push({ ...card, isTapped: true });
        p.tacticsArea.splice(cardIndex, 1);

        if (card.type !== "TICKET") {
            p.tacticsUsedThisTurn++;
        }

        return { success: true, state: this.getState() };
    }

    playCard(playerId, cardIndex, targetInfo) {
        if (this.phase !== "MAIN") return { success: false, reason: "Not Main Phase" };
        if (playerId !== this.turnPlayerId) return { success: false, reason: "Not your turn" };
        const p = this.players[playerId];
        const card = p.hand[cardIndex];
        if (!card) return { success: false, reason: "Card not found" };

        // Cost Check
        let cost = card.cost || 0;

        // Special Cost Reduction (A017 Wall Jump)
        // Special Cost Reduction (A017 Wall Jump, M014/M1014 Tug of War)
        // Special Cost Reduction (A017 Wall Jump, M014 Tug of War)
        if (card.special === "cost_reduction" || card.id === "A017" || card.id === "M014" || card.id === "M1014") {
            const isWallJump = (card.id === "A017" || card.name === "壁ジャンプ");
            const isTugOfWar = (card.id === "M014" || card.name === "引っ張り合い"); // Fixed ID M014

            if (isWallJump) {
                const count = p.field.filter(c => c.id === "A017" || c.name === "壁ジャンプ").length;
                if (count === 1) cost = 0;
            }
            if (isTugOfWar) {
                const count = p.field.filter(c => c.id === "M014" || c.name === "引っ張り合い").length;
                if (count === 1) cost = 0;
            }
        }

        const availablePP = p.ppCards.filter(pp => !pp.isTapped).length;
        if (availablePP < cost) return { success: false, reason: "Not enough PP" };

        // If Attack, need target
        if (card.type === "ATTACK") {
            if (!targetInfo || targetInfo.attackerIndex === undefined || targetInfo.targetIndex === undefined) {
                return { success: false, reason: "Missing target info for Attack" };
            }

            // Check if card has optional discard condition and hasn't been resolved yet
            if ((card.condition === "discard_1_optional" || card.condition === "discard_0_cost")
                && targetInfo.discardResolved === undefined) {
                // Set pending action for discard choice
                this.setPendingAction(playerId, {
                    type: "SELECT_OPTIONAL_DISCARD",
                    cardIndex: cardIndex,
                    card: card,
                    targetInfo: targetInfo,
                    condition: card.condition,
                    message: card.condition === "discard_0_cost"
                        ? "コスト0のカードを1枚捨てますか？"
                        : "手札を1枚捨てますか？"
                });
                return { success: true, state: this.getState(), waitingForDiscard: true };
            }

            // Execute Attack
            const result = this.executeAttack(playerId, card, targetInfo);
            if (result.roundEnded) {
                return { success: true, state: this.getState() };
            }
            if (!result.success) return result;
        }

        // Tap PP and Move to Field
        this.tapPP(p, cost);
        p.hand.splice(cardIndex, 1);
        p.field.push({ ...card, isTapped: false });

        // Memoria Effects (Draw etc)
        if (card.type === "MEMORIA") {
            this.applyMemoriaOnPlay(playerId, card, targetInfo);
        }

        return { success: true, state: this.getState() };
    }

    executeAttack(playerId, card, targetInfo) {
        const p = this.players[playerId];
        const opponentId = this.playerIds.find(id => id !== playerId);
        const opponent = this.players[opponentId];

        const attacker = p.leaders[targetInfo.attackerIndex];
        const target = opponent.leaders[targetInfo.targetIndex];

        if (!attacker || !target) return { success: false, reason: "Invalid targets" };
        if (attacker.isDown) return { success: false, reason: "Attacker is down" };
        if (target.isDown) return { success: false, reason: "Target is already down" };

        let damage = (attacker.atk !== undefined ? attacker.atk : 30);

        // Base Buffs
        damage += (p.nextAttackBoost || 0);
        damage += (p.turnBuffs.attack || 0);

        // Card Condition / Add
        // Card Condition / Add
        if (card.damage_add) {
            // Pass targetInfo (context) to checkCondition for Manual Discard
            if (!card.condition || this.checkCondition(playerId, card.condition, targetInfo)) {
                damage += card.damage_add;
            }
        }

        // A005 Spec: Reveal top of enemy deck. If Attack -> Damage +20.
        // This is a Pre-Attack Effect that modifies damage.
        if (card.effect === "mill_enemy_attack_damage_20") {
            const milliResult = this.checkCondition(playerId, "mill_enemy_attack"); // Reusing condition logic which performs the mill
            if (milliResult) {
                damage += 20;
            }
        }

        // Instant Down Checks (A1010 VSPO, A1014 CR)
        let instantDown = false;
        if (card.effect === "instant_down_if_vspo") {
            if (this.checkCondition(playerId, "all_vspo")) instantDown = true;
        }
        if (card.effect === "instant_down_if_cr") {
            if (this.checkCondition(playerId, "all_cr")) instantDown = true;
        }

        // Apply instant down damage
        if (instantDown) {
            damage = 999;
        }

        // Memoria Modifiers
        p.field.forEach(fCard => {
            if (fCard.type === "MEMORIA") {
                if (fCard.damage_boost) damage += fCard.damage_boost;
                if (fCard.conditional_boost) {
                    if (this.checkCondition(playerId, fCard.condition)) {
                        damage += fCard.conditional_boost;
                    }
                }
            }
        });

        // Apply
        // Apply
        const hpBefore = target.currentHp;
        const opponentDownStateBefore = opponent.leaders.map(l => l.isDown);

        target.currentHp -= damage;
        let targetDown = false;
        let overkillAmount = 0;

        if (target.currentHp <= 0) {
            overkillAmount = Math.abs(target.currentHp);
            target.currentHp = 0;
            target.isDown = true;
            targetDown = true;
        }

        // Post Attack Context
        const context = { targetDown, overkillAmount, targetIndex: targetInfo.targetIndex, attackerIndex: targetInfo.attackerIndex };

        // Card Effects
        if (card.on_hit) {
            this.processEffectString(playerId, card.on_hit, context, card);
        }

        // Memoria Post-Attack
        p.field.forEach(fCard => {
            if (fCard.type === "MEMORIA" && fCard.on_attack_end) {
                this.processEffectString(playerId, fCard.on_attack_end, context, fCard);
            }
        });

        // Awakening Check (Spec: After Effect)
        // Condition: Any enemy leader newly downed
        const opponentDownStateAfter = opponent.leaders.map(l => l.isDown);
        const anyNewlyDowned = opponentDownStateAfter.some((isDown, i) => isDown && !opponentDownStateBefore[i]);

        if (anyNewlyDowned) {
            this.checkAwakening(playerId, targetInfo.attackerIndex);
        }

        // Reset Attack Boost (Tactics)
        p.nextAttackBoost = 0;

        // Check Round End
        if (opponent.leaders.every(l => l.isDown)) {
            this.handleRoundWin(playerId);
            return { success: true, roundEnded: true };
        }

        return { success: true };
    }

    handleRoundWin(winnerId) {
        this.players[winnerId].roundsWon++;
        this.roundWinner = winnerId;

        if (this.players[winnerId].roundsWon >= 2) {
            this.endGame(winnerId, "2_ROUNDS_WON");
        } else {
            this.currentRound++;
            this.setupRound();
        }
    }

    applyMemoriaOnPlay(playerId, card, targetInfo = {}) {
        if (card.on_play) {
            const context = targetInfo ? { targetIndex: targetInfo.targetIndex } : {};
            this.processEffectString(playerId, card.on_play, context);
        }
    }

    processAbility(playerId, ability) {
        if (!ability || !ability.effect) return;
        const p = this.players[playerId];
        const opponentId = this.playerIds.find(id => id !== playerId);

        ability.effect.forEach(eff => {
            if (eff.type === "damage") {
                if (eff.target === "opponent_all_leaders") {
                    this.dealAOE(opponentId, eff.value, "all");
                } else if (eff.target === "opponent_one_leader") {
                    this.setPendingAction(playerId, {
                        type: "SELECT_EFFECT_TARGET",
                        effectType: "damage",
                        value: eff.value,
                        targetMode: "enemy"
                    });
                }
            } else if (eff.type === "draw") {
                this.drawCards(playerId, eff.value);
            } else if (eff.type === "discard") {
                this.setPendingAction(playerId, {
                    type: "SELECT_DISCARD",
                    count: eff.value
                });
            } else if (eff.type === "heal") {
                if (eff.target === "own_leader_one") {
                    this.setPendingAction(playerId, {
                        type: "SELECT_EFFECT_TARGET",
                        effectType: "heal",
                        value: eff.value,
                        targetMode: "own"
                    });
                }
            }
        });
    }

    processEffectString(playerId, key, context = {}, card = null) {
        if (!key) return;

        // Use EffectRegistry for centralized effect handling
        const handled = executeEffect(key, this, playerId, context, card);

        if (handled) return;

        // Fallback for any unhandled effects (legacy support)
        console.warn(`Unhandled effect: ${key}`);
    }

    checkAwakening(playerId, leaderIndex) {
        const p = this.players[playerId];
        const leader = p.leaders[leaderIndex];
        if (leader && !leader.isAwakened && !leader.isDown) {
            // Instead of executing immediately, queue it to ensure it happens AFTER effects
            this.setPendingAction(playerId, {
                type: "CHECK_AWAKENING",
                leaderIndex: leaderIndex
            });
            return true;
        }
        return false;
    }

    checkCondition(playerId, condition, context = {}) {
        const p = this.players[playerId];
        if (!condition) return false;
        if (condition === "memoria_count_3") return p.field.filter(c => c.type === "MEMORIA").length >= 3;
        if (condition === "memoria_count_2") return p.field.filter(c => c.type === "MEMORIA").length >= 2;

        if (condition.includes("_leaders_")) {
            const parts = condition.split("_");
            const color = parts[0]; // red, blue, yellow, green
            const count = parseInt(parts[2]);
            const targetColor = color.charAt(0).toUpperCase() + color.slice(1); // Red, Blue...
            const matchCount = p.leaders.filter(l => l.color === targetColor).length;
            return matchCount >= count;
        }

        if (condition === "leaders_down_3") {
            return p.leaders.filter(l => l.isDown).length >= 3;
        }

        if (condition === "hand_len_le_2") {
            return p.hand.length <= 2;
        }

        if (condition === "discard_1") {
            if (context.discardIndex !== undefined && context.discardIndex !== null) {
                if (p.hand[context.discardIndex]) {
                    p.trash.push(p.hand.splice(context.discardIndex, 1)[0]);
                    return true;
                }
                return false;
            }
            return p.hand.length >= 1;
        }

        if (condition === "discard_1_optional") {
            if (context.discardIndex !== undefined && context.discardIndex !== null) {
                if (p.hand[context.discardIndex]) {
                    p.trash.push(p.hand.splice(context.discardIndex, 1)[0]);
                    return true;
                }
                return false;
            }
            return false;
        }

        if (condition === "discard_0_cost") {
            if (context.discardIndex !== undefined && context.discardIndex !== null) {
                const card = p.hand[context.discardIndex];
                if (card && (card.cost || 0) === 0) {
                    p.trash.push(p.hand.splice(context.discardIndex, 1)[0]);
                    return true;
                }
                return false;
            }
            return p.hand.some(c => (c.cost || 0) === 0);
        }

        if (condition === "leaders_all_vspo" || condition === "all_vspo") {
            return p.leaders.every(l => this.hasTag(l.name, "VSPO!"));
        }
        if (condition === "leaders_all_cr" || condition === "all_cr") {
            return p.leaders.every(l => this.hasTag(l.name, "CR"));
        }

        if (condition === "mill_enemy_attack") {
            const opponentId = this.playerIds.find(id => id !== playerId);
            const opp = this.players[opponentId];
            if (opp.mainDeck.length > 0) {
                const card = opp.mainDeck.shift();
                opp.trash.push(card);
                if (card.type === "ATTACK") return true;
            }
            return false;
        }

        return false;
    }


    resolveAction(playerId, actionData) {

        const p = this.players[playerId];
        if (!p.pendingAction) return { success: false, reason: "No pending action" };

        const pending = p.pendingAction;
        const opponentId = this.playerIds.find(id => id !== playerId);
        console.log(`[DEBUG] resolveAction called. player=${playerId}, pendingType=${pending.type}, actionData=`, actionData, "pending=", pending);
        if (pending.type === "SELECT_EFFECT_TARGET") {
            const targetIndex = actionData.targetIndex;
            const opponentLeaders = this.players[opponentId].leaders;

            // Validate target is not excluded
            if (pending.excludeIndex !== undefined && targetIndex === pending.excludeIndex) {
                return { success: false, reason: "Invalid target (Excluded)" };
            }
            // Validate target is not downed
            if (opponentLeaders[targetIndex] && opponentLeaders[targetIndex].isDown) {
                return { success: false, reason: "Invalid target (Downed)" };
            }

            const context = { targetIndex, attackerIndex: pending.attackerIndex };
            if (pending.effectString) {
                this.processEffectString(playerId, pending.effectString, context);
            } else if (pending.effectType === "damage") {
                const result = this.dealDamageToLeader(opponentId, pending.value, "any", targetIndex);
                if (result.downed && pending.attackerIndex !== undefined) {
                    this.checkAwakening(playerId, pending.attackerIndex);
                }
            } else if (pending.effectType === "heal") {
                const targetP = pending.targetMode === "own" ? p : this.players[opponentId];
                const leader = targetP.leaders[targetIndex];
                if (leader && !leader.isDown) {
                    leader.currentHp = Math.min(leader.currentHp + pending.value, leader.maxHp);
                }
            }
        }
        else if (pending.type === "CHECK_AWAKENING") {
            const leaderIndex = actionData?.leaderIndex !== undefined ? actionData.leaderIndex : pending.leaderIndex;
            // Ensure we target the player who owns the pending action (Awakening is self)
            // Note: resolveAction uses 'p' from playerId arg, which matches pendingAction owner.

            const leader = p.leaders[leaderIndex];
            if (leader && !leader.isAwakened && !leader.isDown) {
                // Correct HP Calculation: Maintain damage taken
                // NewHP = CurrentHP + (NewMax - OldMax)
                const hpDiff = leader.hp_after - leader.hp_before;

                leader.isAwakened = true;
                leader.maxHp = leader.hp_after;
                leader.currentHp = leader.currentHp + hpDiff;
                leader.atk = leader.atk_after;

                if (leader.ability && leader.ability.trigger === "awaken") {
                    this.processAbility(playerId, leader.ability);
                }
            }
        } else if (pending.type === "SELECT_DISCARD") {
            // Player-selected discard (one or more cards)
            const targetP = pending.isOpponentAction ? this.players[opponentId] : p;
            const cardIndices = Array.isArray(actionData.cardIndices) ? actionData.cardIndices : [actionData.cardIndex];

            // Validate count
            if (cardIndices.length !== pending.count) {
                return { success: false, reason: `Must discard exactly ${pending.count} card(s)` };
            }

            // Sort indices in descending order to avoid index shifting issues
            cardIndices.sort((a, b) => b - a);

            for (const idx of cardIndices) {
                if (targetP.hand[idx]) {
                    targetP.trash.push(targetP.hand.splice(idx, 1)[0]);
                }
            }

            if (pending.nextEffect) {
                this.processEffectString(playerId, pending.nextEffect);
            }

            // If this was hand limit discard, continue with turn end
            if (pending.isHandLimit) {
                p.pendingAction = pending.next || null;
                return this.continueEndTurn(playerId);
            }
        }
        else if (pending.type === "SELECT_OPTIONAL_DISCARD") {
            // Handle optional discard for attack cards (A001, A021, A1011)
            const card = pending.card;
            const targetInfo = { ...pending.targetInfo };

            if (actionData.skip) {
                // Player chose not to discard
                targetInfo.discardResolved = true;
                targetInfo.discardIndex = null;
            } else if (actionData.cardIndex !== undefined) {
                // Player chose to discard
                const discardCard = p.hand[actionData.cardIndex];

                // Validate for discard_0_cost
                if (pending.condition === "discard_0_cost") {
                    if (!discardCard || (discardCard.cost || 0) !== 0) {
                        return { success: false, reason: "Must discard a cost 0 card" };
                    }
                }

                // Perform discard
                if (discardCard) {
                    p.trash.push(p.hand.splice(actionData.cardIndex, 1)[0]);
                    targetInfo.discardResolved = true;
                    targetInfo.discardIndex = actionData.cardIndex; // Mark as discarded
                }
            } else {
                return { success: false, reason: "Invalid action data" };
            }

            // Continue with the attack
            p.pendingAction = pending.next || null;
            return this.playCard(playerId, pending.cardIndex, targetInfo);
        }
        else if (pending.type === "MSG_SELECT_DISCARD") {
            const targetP = pending.isOpponentAction ? this.players[opponentId] : p;
            if (actionData.cardIndex !== undefined && targetP.hand[actionData.cardIndex]) {
                targetP.trash.push(targetP.hand.splice(actionData.cardIndex, 1)[0]);
                if (pending.nextEffect) {
                    this.processEffectString(playerId, pending.nextEffect);
                }
            }
        }
        else if (pending.type === "MSG_SELECT_MEMORIA_CASCADE") {
            if (actionData.selectedCardIds) {
                actionData.selectedCardIds.forEach(cid => {
                    const cIndex = p.hand.findIndex(c => c.id === cid);
                    if (cIndex !== -1) {
                        const card = p.hand.splice(cIndex, 1)[0];
                        p.field.push(card);
                        this.applyMemoriaOnPlay(playerId, card);
                    }
                });
            }
        }
        else if (pending.type === "MSG_CONFIRM_TRASH") {
            if (actionData.confirm) {
                const c = p.mainDeck.shift();
                p.trash.push(c);
            }
        }
        else if (pending.type === "MSG_SELECT_CASCADE") {
            // Link Assault cascade effect - pick one card from top 3 to play
            const selectedIndex = actionData.index;

            if (selectedIndex !== null && selectedIndex !== undefined && pending.cards[selectedIndex]) {
                const selectedCard = pending.cards[selectedIndex];

                // Check if card is playable (MEMORIA and cost <= 1)
                if (selectedCard.type === "MEMORIA" && (selectedCard.cost || 0) <= 1) {
                    // Place on field
                    p.field.push(selectedCard);

                    // Apply on_play effects
                    if (selectedCard.on_play) {
                        this.processEffectString(playerId, selectedCard.on_play, {});
                    }

                    // Remove from pending cards and trash the rest
                    pending.cards.forEach((c, i) => {
                        if (i !== selectedIndex) {
                            p.trash.push(c);
                        }
                    });
                } else {
                    // Invalid selection - trash all
                    pending.cards.forEach(c => p.trash.push(c));
                }
            } else {
                // Pass - trash all cards
                pending.cards.forEach(c => p.trash.push(c));
            }
        }
        else if (pending.type === "MSG_DECLARE_TYPE") {
            if (p.mainDeck.length > 0) {
                const top = p.mainDeck[0];
                if (top.type === actionData.declaredType) {
                    this.drawCards(playerId, 4);
                }
            }
        }

        p.pendingAction = pending.next || null;
        return { success: true, state: this.getState() };
    }

    hasTag(name, tag) {
        const leader = leadersMap[name];
        return leader && (leader.team === tag || (leader.team && leader.team.includes(tag)));
    }

    getLeaderTagCount(playerId, tag) {
        return this.players[playerId].leaders.filter(l => this.hasTag(l.name, tag)).length;
    }

    discardRandom(playerId, count) {
        const p = this.players[playerId];
        for (let i = 0; i < count; i++) {
            if (p.hand.length > 0) {
                const idx = Math.floor(Math.random() * p.hand.length);
                p.trash.push(p.hand.splice(idx, 1)[0]);
            }
        }
    }

    dealDamageToLeader(playerId, damage, targetMode, specificIndex) {
        const p = this.players[playerId];
        let target;
        if (specificIndex !== undefined && p.leaders[specificIndex] && !p.leaders[specificIndex].isDown) {
            target = p.leaders[specificIndex];
        } else {
            target = p.leaders.find(l => !l.isDown);
        }

        if (target) {
            target.currentHp -= damage;
            if (target.currentHp <= 0) {
                target.currentHp = 0;
                target.isDown = true;

                // Victim Awakening (Survival/Phase 2)
                let awakened = false;
                if (!target.isAwakened) {
                    target.isAwakened = true;
                    target.currentHp = target.hp_after;
                    target.maxHp = target.hp_after;
                    target.atk = target.atk_after;
                    target.isDown = false; // Revive
                    awakened = true;
                    if (target.ability && target.ability.trigger === "awaken") {
                        this.processAbility(p.id, target.ability); // Process Owner's Ability
                    }
                }

                // Return 'downed: true' if they HIT 0 HP (triggered the kill condition for attacker)
                // Even if they revived, the "Downing" event happened for the purpose of Attacker effects.
                return { downed: true, target, awakened };
            }
        }
        return { downed: false };
    }

    dealAOE(playerId, damage, mode, excludeIndex) {
        const p = this.players[playerId];
        p.leaders.forEach((l, i) => {
            if (mode === "others" && i === excludeIndex) return;
            if (l.isDown) return;
            l.currentHp -= damage;
            if (l.currentHp <= 0) {
                l.currentHp = 0;
                l.isDown = true;
                if (!l.isAwakened) {
                    l.isAwakened = true;
                    l.currentHp = l.hp_after;
                    l.maxHp = l.hp_after;
                    l.atk = l.atk_after;
                    if (l.ability && l.ability.trigger === "awaken") {
                        this.processAbility(playerId, l.ability);
                    }
                }
            }
        });
    }

    healLeader(playerId, amount, mode, specificIndex) {
        const p = this.players[playerId];
        let target;
        if (specificIndex !== undefined && p.leaders[specificIndex] && !p.leaders[specificIndex].isDown) {
            target = p.leaders[specificIndex];
        } else {
            target = p.leaders.find(l => !l.isDown && l.currentHp < l.maxHp);
        }

        if (target) {
            target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
        }
    }

    recoverPP(playerId, amount) {
        const p = this.players[playerId];
        const tapped = p.ppCards.filter(pp => pp.isTapped);
        for (let i = 0; i < amount && i < tapped.length; i++) {
            tapped[i].isTapped = false;
        }
    }

    tapPP(player, cost) {
        let tapped = 0;
        for (let pp of player.ppCards) {
            if (tapped >= cost) break;
            if (!pp.isTapped) {
                pp.isTapped = true;
                tapped++;
            }
        }
    }

    endTurn(playerId) {
        if (playerId !== this.turnPlayerId) return;

        const p = this.players[playerId];

        // Reset Turn State
        p.turnBuffs = { attack: 0 };
        p.nextAttackBoost = 0;
        p.tacticsUsedThisTurn = 0;

        // Unused PP -> Draw
        const unusedPP = p.ppCards.filter(pp => !pp.isTapped).length;
        if (unusedPP > 0) {
            this.drawCards(playerId, unusedPP);
        }

        // Hand Limit - if over 7, require player to discard excess
        const excessCards = p.hand.length - 7;
        if (excessCards > 0) {
            this.setPendingAction(playerId, {
                type: "SELECT_DISCARD",
                count: excessCards,
                message: `手札が上限を超えています。${excessCards}枚選んで捨ててください`,
                isHandLimit: true
            });
            // Don't proceed with turn end until discard is resolved
            return { success: true, state: this.getState(), waitingForDiscard: true };
        }

        // Clear Field
        if (p.field.length > 0) {
            p.field.forEach(c => p.trash.push(c));
            p.field = [];
        }

        // Switch Turn
        this.turnPlayerId = this.playerIds.find(id => id !== playerId);

        // Start Phase of Next Player
        const nextP = this.players[this.turnPlayerId];
        // Untap PP
        nextP.ppCards.forEach(pp => pp.isTapped = false);
        // Draw 1
        this.drawCards(this.turnPlayerId, 1);

        this.turnCount++;

        return { success: true, state: this.getState() };
    }

    // Continue turn end after hand limit discard
    continueEndTurn(playerId) {
        const p = this.players[playerId];

        // Clear Field
        if (p.field.length > 0) {
            p.field.forEach(c => p.trash.push(c));
            p.field = [];
        }

        // Switch Turn
        this.turnPlayerId = this.playerIds.find(id => id !== playerId);

        // Start Phase of Next Player
        const nextP = this.players[this.turnPlayerId];
        // Untap PP
        nextP.ppCards.forEach(pp => pp.isTapped = false);
        // Draw 1
        this.drawCards(this.turnPlayerId, 1);

        this.turnCount++;

        return { success: true, state: this.getState() };
    }

    endGame(winnerId, reason) {
        this.gameWinner = winnerId;
    }


    getState() {
        return {
            players: this.players,
            currentRound: this.currentRound,
            maxPP: this.maxPP,
            turnPlayerId: this.turnPlayerId,
            winner: this.gameWinner,
            turnCount: this.turnCount,
            phase: this.phase
        };
    }

    getSecretState(viewerId) {
        const secretPlayers = {};
        for (const pid of this.playerIds) {
            const p = this.players[pid];
            if (pid === viewerId) {
                secretPlayers[pid] = p;
            } else {
                secretPlayers[pid] = {
                    ...p,
                    hand: p.hand.map(() => ({ type: "HIDDEN" })),
                    mainDeck: p.mainDeck.map(() => ({ type: "HIDDEN" })),
                    tacticsDeck: p.tacticsDeck.map(() => ({ type: "HIDDEN" })),
                    tacticsArea: Array.isArray(p.tacticsArea) ? p.tacticsArea.map(c =>
                        (c.type === "TICKET") ? c : { type: "HIDDEN", name: "Back" }
                    ) : [],
                };
            }
        }
        return {
            players: secretPlayers,
            currentRound: this.currentRound,
            maxPP: this.maxPP,
            turnPlayerId: this.turnPlayerId,
            winner: this.gameWinner,
            turnCount: this.turnCount,
            phase: this.phase
        };
    }
}
