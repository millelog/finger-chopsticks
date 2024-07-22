// File: src/lib/game/gameRules.ts

import type {
	HandState,
	Player,
	Hand,
	GameState
} from '$lib/types/gameTypes';

export function addFingers(source: number, target: number): number {
	return (source + target) % 5;
}

export function isHandEliminated(fingers: number): boolean {
	return fingers === 0;
}

export function canSplitHand(hand: HandState): boolean {
	const total = hand.left + hand.right;
	return total % 2 === 0 && (hand.left === 0 || hand.right === 0);
}

export function splitHand(hand: HandState): HandState {
	if (!canSplitHand(hand)) {
		throw new Error('Cannot split this hand');
	}
	const total = hand.left + hand.right;
	const half = total / 2;
	return { left: half, right: half };
}

export function applyMove(
	state: GameState,
	sourcePlayer: Player,
	sourceHand: Hand,
	targetPlayer: Player,
	targetHand: Hand
): GameState {
	const newState = JSON.parse(JSON.stringify(state)) as GameState; // Deep copy
	const sourceValue = newState[sourcePlayer][sourceHand];
	const targetValue = newState[targetPlayer][targetHand];

	newState[targetPlayer][targetHand] = addFingers(sourceValue, targetValue);

	if (isHandEliminated(newState[targetPlayer][targetHand])) {
		newState[targetPlayer][targetHand] = 0;
	}

	newState.currentTurn = newState.currentTurn === 'player' ? 'bot' : 'player';
	newState.lastMove = {
		type: 'regular',
		sourcePlayer,
		sourceHand,
		targetPlayer,
		targetHand
	};

	return newState;
}

export function applySplit(
	state: GameState,
	player: Player,
	sourceHand: Hand,
	targetHand: Hand
): GameState {
	const newState = JSON.parse(JSON.stringify(state)) as GameState; // Deep copy

	if (!canSplitHand(newState[player])) {
		throw new Error('Cannot split this hand');
	}

	newState[player] = splitHand(newState[player]);
	newState.currentTurn = newState.currentTurn === 'player' ? 'bot' : 'player';
	newState.lastMove = { type: 'split', player, sourceHand, targetHand };

	return newState;
}
export function checkGameOver(state: GameState): GameState {
	const newState = { ...state };
	if (newState.player.left === 0 && newState.player.right === 0) {
		newState.status = 'lost';
	} else if (newState.bot.left === 0 && newState.bot.right === 0) {
		newState.status = 'won';
	}
	return newState;
}
