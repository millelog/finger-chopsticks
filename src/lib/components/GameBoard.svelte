<!-- src/lib/components/GameBoard.svelte -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { gameStore } from '$lib/stores/gameStore';
	import Hand from '$lib/components/Hand.svelte';
	import type { GameState, Player, Hand as HandType, LastMove } from '$lib/types/gameTypes';
	import { fade, fly } from 'svelte/transition';
	import { getBotMove } from '$lib/game/botAI';

	let gameState: GameState;
	let isAnimating = false;
	let highlightedHand: string | null = null;
	let arrowPath: string = '';

	gameStore.subscribe((state) => {
		gameState = state;
		checkGameOver();
	});

	onMount(() => {
		gameStore.resetGame();
	});

	function delay(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
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

		if (gameState.currentTurn === 'bot' && gameState.status === 'ongoing') {
			await makeBotMove();
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
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
	async function animateMove(
		sourcePlayer: Player,
		sourceHand: HandType,
		targetPlayer: Player,
		targetHand: HandType
	): Promise<void> {
		if (sourcePlayer === 'bot') {
			highlightedHand = `${sourcePlayer}-${sourceHand}`;
			await delay(250);
			highlightedHand = `${targetPlayer}-${targetHand}`;
			await tick();
			updateArrowPath();
			await delay(1000);
			highlightedHand = null;
		} else {
			// For player moves, just update the arrow path without animation
			await tick();
			updateArrowPath();
		}
	}

	async function executeSplitMove(player: Player, sourceHand: HandType, targetHand: HandType) {
		isAnimating = true;
		gameStore.splitHand(player, sourceHand, targetHand);
		await animateMove(player, sourceHand, player, targetHand);
		isAnimating = false;
	}

	async function executeMove(
		sourcePlayer: Player,
		sourceHand: HandType,
		targetPlayer: Player,
		targetHand: HandType
	) {
		isAnimating = true;
		gameStore.playHand(sourcePlayer, sourceHand, targetPlayer, targetHand);
		await animateMove(sourcePlayer, sourceHand, targetPlayer, targetHand);
		isAnimating = false;
	}

	async function makeBotMove() {
		await delay(1000); // Delay before bot move
		const botMove = gameStore.getBotMove();

		if (botMove.type === 'regular') {
			await executeMove(
				botMove.sourcePlayer,
				botMove.sourceHand,
				botMove.targetPlayer,
				botMove.targetHand
			);
		} else {
			await executeSplitMove(botMove.player, botMove.sourceHand, botMove.targetHand);
		}
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

	function updateArrowPath() {
		if (!gameState.lastMove) {
			arrowPath = '';
			return;
		}

		let sourcePlayer: Player, sourceHand: HandType, targetPlayer: Player, targetHand: HandType;

		if (gameState.lastMove.type === 'regular') {
			sourcePlayer = gameState.lastMove.sourcePlayer;
			sourceHand = gameState.lastMove.sourceHand;
			targetPlayer = gameState.lastMove.targetPlayer;
			targetHand = gameState.lastMove.targetHand;
		} else {
			sourcePlayer = gameState.lastMove.player;
			sourceHand = gameState.lastMove.sourceHand;
			targetPlayer = gameState.lastMove.player;
			targetHand = gameState.lastMove.targetHand;
		}

		const source = document.querySelector(`[data-hand="${sourcePlayer}-${sourceHand}"]`);
		const target = document.querySelector(`[data-hand="${targetPlayer}-${targetHand}"]`);

		if (!source || !target) {
			arrowPath = '';
			return;
		}

		const sourceRect = source.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();

		const startX = sourceRect.left + sourceRect.width / 2;
		const startY = sourceRect.top + sourceRect.height / 2;
		const endX = targetRect.left + targetRect.width / 2;
		const endY = targetRect.top + targetRect.height / 2;

		arrowPath = `M${startX},${startY} L${endX},${endY}`;
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
			<path d={arrowPath} stroke="red" stroke-width="2" fill="none" marker-end="url(#arrowhead)" />
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
