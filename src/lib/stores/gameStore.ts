// File: src/lib/stores/gameStore.ts

import { writable } from 'svelte/store';
import type { GameState, GameStore, Player, Hand, GameStatus } from '$lib/types/gameTypes';
import { applyMove, applySplit, checkGameOver } from '$lib/game/gameRules';
import { getBotMove } from '$lib/game/botAI';

function createGameStore(): GameStore {
    const initialState: GameState = {
        player: { left: 1, right: 1 },
        bot: { left: 1, right: 1 },
        currentTurn: 'player',
        status: 'ongoing',
        lastMove: null
    };

    const { subscribe, set, update } = writable<GameState>(initialState);

    function executeBotMove(state: GameState): GameState {
        const botMove = getBotMove(state);
        let newState: GameState;

        if (botMove.type === 'regular') {
            newState = applyMove(
                state,
                botMove.sourcePlayer,
                botMove.sourceHand,
                botMove.targetPlayer,
                botMove.targetHand
            );
        } else {
            newState = applySplit(state, botMove.player, botMove.sourceHand, botMove.targetHand);
        }

        return checkGameOver(newState);
    }

    return {
        subscribe,
        playHand: (sourcePlayer: Player, sourceHand: Hand, targetPlayer: Player, targetHand: Hand) => update(state => {
            if (state.status !== 'ongoing' || state.currentTurn !== 'player') return state;
            
            let newState = applyMove(state, sourcePlayer, sourceHand, targetPlayer, targetHand);
            newState = checkGameOver(newState);
            
            if (newState.status === 'ongoing' && newState.currentTurn === 'bot') {
                newState = executeBotMove(newState);
            }
            
            return newState;
        }),
        splitHand: (player: Player, sourceHand: Hand, targetHand: Hand) => update(state => {
            if (state.status !== 'ongoing' || state.currentTurn !== player) return state;
            
            try {
                let newState = applySplit(state, player, sourceHand, targetHand);
                newState = checkGameOver(newState);
                
                if (newState.status === 'ongoing' && newState.currentTurn === 'bot') {
                    newState = executeBotMove(newState);
                }
                
                return newState;
            } catch (error) {
                console.error(error);
                return state;
            }
        }),
        resetGame: () => set(initialState),
        setGameStatus: (status: GameStatus) => update(state => {
            state.status = status;
            return state;
        })
    };
}

export const gameStore = createGameStore();