// File: src/lib/game/botAI.ts

import type { GameState, Hand, RegularMove, SplitMove } from '$lib/types/gameTypes';
import { canSplitHand } from './gameRules';

function getValidMoves(state: GameState): (RegularMove | SplitMove)[] {
    const validMoves: (RegularMove | SplitMove)[] = [];
    const botHands: Hand[] = ['left', 'right'];
    const playerHands: Hand[] = ['left', 'right'];

    // Regular moves
    for (const sourceHand of botHands) {
        if (state.bot[sourceHand] > 0) {
            for (const targetHand of playerHands) {
                if (state.player[targetHand] > 0) {
                    validMoves.push({
                        type: 'regular',
                        sourcePlayer: 'bot',
                        sourceHand,
                        targetPlayer: 'player',
                        targetHand
                    });
                }
            }
        }
    }

    // Split move
    if (canSplitHand(state.bot)) {
        validMoves.push({
            type: 'split',
            player: 'bot',
            sourceHand: state.bot.left > 0 ? 'left' : 'right',
            targetHand: state.bot.left > 0 ? 'right' : 'left'
        });
    }

    return validMoves;
}

function evaluateMove(state: GameState, move: RegularMove | SplitMove): number {
    let score = 0;

    if (move.type === 'regular') {
        const targetValue = state.player[move.targetHand];
        const sourceValue = state.bot[move.sourceHand];
        const newValue = (targetValue + sourceValue) % 5;

        // Prefer moves that eliminate opponent's hand
        if (newValue === 0) {
            score += 10;
        }

        // Prefer moves that create even sums (harder to split)
        if ((state.player.left + state.player.right + newValue - targetValue) % 2 !== 0) {
            score += 5;
        }

        // Avoid moves that make our hands too vulnerable
        if (sourceValue === 1) {
            score -= 3;
        }
    } else {
        // Split moves are generally good as they give more options
        score += 7;

        // But avoid splitting if opponent has a strong hand
        if (state.player.left === 4 || state.player.right === 4) {
            score -= 5;
        }
    }

    return score;
}

export function getBotMove(state: GameState): RegularMove | SplitMove {
    const validMoves = getValidMoves(state);
    
    if (validMoves.length === 0) {
        throw new Error("No valid moves available");
    }

    // Evaluate all moves
    const scoredMoves = validMoves.map(move => ({
        move,
        score: evaluateMove(state, move) + Math.random() * 3 // Add some randomness
    }));

    // Sort moves by score (descending)
    scoredMoves.sort((a, b) => b.score - a.score);

    // 70% chance to choose the best move, 30% chance to choose randomly from top 3
    if (Math.random() < 0.7 || scoredMoves.length < 3) {
        return scoredMoves[0].move;
    } else {
        const randomIndex = Math.floor(Math.random() * 3);
        return scoredMoves[randomIndex].move;
    }
}