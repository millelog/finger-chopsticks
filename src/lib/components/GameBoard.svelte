<!-- src/lib/components/GameBoard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/stores/gameStore';
	import Hand from '$lib/components/Hand.svelte';
	import type { GameState, Player, Hand as HandType, LastMove } from '$lib/types/gameTypes';
	import { fade, fly } from 'svelte/transition';
	import { getBotMove } from '$lib/game/botAI';

	let gameState: GameState;
	let isAnimating = false;
	let highlightedHand: string | null = null;

	gameStore.subscribe((state) => {
		gameState = state;
		checkGameOver();
	});

	onMount(() => {
		gameStore.resetGame();
	});

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	async function handleDrop(event: DragEvent, targetPlayer: Player, targetHand: HandType) {
		event.preventDefault();
		if (isAnimating || gameState.status !== 'ongoing' || gameState.currentTurn !== 'player') return;

		const data = event.dataTransfer?.getData('text');
		if (!data) return;

		const { player: sourcePlayer, hand: sourceHand } = JSON.parse(data);

		if (sourcePlayer === targetPlayer) {
			if (canSplitHand(sourcePlayer, sourceHand, targetHand)) {
				await executeSplitMove(sourcePlayer, sourceHand, targetHand);
			}
		} else {
			if (isValidMove(sourcePlayer, sourceHand, targetPlayer, targetHand)) {
				await executeMove(sourcePlayer, sourceHand, targetPlayer, targetHand);
			}
		}
	}

	function isValidMove(
		sourcePlayer: Player,
		sourceHand: HandType,
		targetPlayer: Player,
		targetHand: HandType
	): boolean {
		return gameState[sourcePlayer][sourceHand] > 0 && gameState[targetPlayer][targetHand] > 0;
	}

	function canSplitHand(player: Player, sourceHand: HandType, targetHand: HandType): boolean {
		const totalFingers = gameState[player][sourceHand] + gameState[player][targetHand];
		return totalFingers % 2 === 0 && gameState[player][targetHand] === 0;
	}

	async function executeSplitMove(player: Player, sourceHand: HandType, targetHand: HandType) {
		isAnimating = true;
		await animateMove(() => gameStore.splitHand(player, sourceHand, targetHand));
		isAnimating = false;
		if (gameState.currentTurn === 'bot' && gameState.status === 'ongoing') {
			await makeBotMove();
		}
	}

	async function executeMove(
		sourcePlayer: Player,
		sourceHand: HandType,
		targetPlayer: Player,
		targetHand: HandType
	) {
		isAnimating = true;
		await animateMove(() => gameStore.playHand(sourcePlayer, sourceHand, targetPlayer, targetHand));
		isAnimating = false;
		if (gameState.currentTurn === 'bot' && gameState.status === 'ongoing') {
			await makeBotMove();
		}
	}

	async function animateMove(moveFunction: () => void): Promise<void> {
		moveFunction();
		await new Promise((resolve) => setTimeout(resolve, 500)); // Delay for animation
	}

	async function makeBotMove() {
		await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay before bot move
		const botMove = getBotMove(gameState);
		highlightedHand = `bot-${botMove.sourceHand}`;
		await new Promise((resolve) => setTimeout(resolve, 500)); // Highlight source hand
		highlightedHand =
			botMove.type === 'split' ? `bot-${botMove.targetHand}` : `player-${botMove.targetHand}`;
		await animateMove(() => {
			if (botMove.type === 'regular') {
				gameStore.playHand('bot', botMove.sourceHand, 'player', botMove.targetHand);
			} else {
				gameStore.splitHand('bot', botMove.sourceHand, botMove.targetHand);
			}
		});
		highlightedHand = null;
	}

	function checkGameOver() {
		if (gameState.status !== 'ongoing') return;

		const playerLost = gameState.player.left === 0 && gameState.player.right === 0;
		const botLost = gameState.bot.left === 0 && gameState.bot.right === 0;

		if (playerLost) {
			gameStore.setGameStatus('lost');
		} else if (botLost) {
			gameStore.setGameStatus('won');
		}
	}

	function getArrowPath(lastMove: LastMove | null): string {
		if (!lastMove) return '';

		const source =
			lastMove.type === 'split'
				? document.querySelector(`[data-hand="${lastMove.player}-${lastMove.sourceHand}"]`)
				: document.querySelector(`[data-hand="${lastMove.sourcePlayer}-${lastMove.sourceHand}"]`);
		const target =
			lastMove.type === 'split'
				? document.querySelector(`[data-hand="${lastMove.player}-${lastMove.targetHand}"]`)
				: document.querySelector(`[data-hand="${lastMove.targetPlayer}-${lastMove.targetHand}"]`);

		if (!source || !target) return '';

		const sourceRect = source.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();

		const startX = sourceRect.left + sourceRect.width / 2;
		const startY = sourceRect.top + sourceRect.height / 2;
		const endX = targetRect.left + targetRect.width / 2;
		const endY = targetRect.top + targetRect.height / 2;

		return `M${startX},${startY} L${endX},${endY}`;
	}

	function isHandActive(player: Player, hand: HandType): boolean {
		return (
			gameState.status === 'ongoing' &&
			gameState.currentTurn === 'player' &&
			player === 'player' &&
			gameState[player][hand] > 0
		);
	}
</script>

<div class="flex flex-col items-center justify-center h-screen bg-gray-100">
	<div class="mb-8 text-2xl font-bold text-gray-800">
		{#if gameState.status === 'ongoing'}
			{gameState.currentTurn === 'player' ? 'Your Turn' : "Bot's Turn"}
		{:else}
			Game Over: You {gameState.status === 'won' ? 'Won!' : 'Lost!'}
		{/if}
	</div>

	<div class="relative">
		<div class="flex justify-center mb-16">
			<div on:dragover={handleDragOver} on:drop={(e) => handleDrop(e, 'bot', 'left')}>
				<Hand
					fingers={gameState.bot.left}
					player="bot"
					hand="left"
					isActive={false}
					isHighlighted={highlightedHand === 'bot-left'}
				/>
			</div>
			<div class="w-16"></div>
			<div on:dragover={handleDragOver} on:drop={(e) => handleDrop(e, 'bot', 'right')}>
				<Hand
					fingers={gameState.bot.right}
					player="bot"
					hand="right"
					isActive={false}
					isHighlighted={highlightedHand === 'bot-right'}
				/>
			</div>
		</div>

		<div class="flex justify-center">
			<div on:dragover={handleDragOver} on:drop={(e) => handleDrop(e, 'player', 'left')}>
				<Hand
					fingers={gameState.player.left}
					player="player"
					hand="left"
					isActive={isHandActive('player', 'left')}
					isHighlighted={highlightedHand === 'player-left'}
				/>
			</div>
			<div class="w-16"></div>
			<div on:dragover={handleDragOver} on:drop={(e) => handleDrop(e, 'player', 'right')}>
				<Hand
					fingers={gameState.player.right}
					player="player"
					hand="right"
					isActive={isHandActive('player', 'right')}
					isHighlighted={highlightedHand === 'player-right'}
				/>
			</div>
		</div>

		<svg class="absolute top-0 left-0 w-full h-full pointer-events-none" style="z-index: 10;">
			<path
				d={getArrowPath(gameState.lastMove)}
				stroke="red"
				stroke-width="2"
				fill="none"
				marker-end="url(#arrowhead)"
			/>
			<defs>
				<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
					<polygon points="0 0, 10 3.5, 0 7" fill="red" />
				</marker>
			</defs>
		</svg>
	</div>

	{#if gameState.status !== 'ongoing'}
		<button
			class="mt-8 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
			on:click={() => gameStore.resetGame()}
			in:fly={{ y: 20, duration: 300 }}
		>
			Play Again
		</button>
	{/if}
</div>
