<!-- src/lib/components/Hand.svelte -->
<script lang="ts">
  import { spring } from 'svelte/motion';
  import { fade, scale } from 'svelte/transition';
  import type { Player, Hand as HandType } from '$lib/types/gameTypes';

  export let fingers: number;
  export let player: Player;
  export let hand: HandType;
  export let isActive: boolean;
  export let isHighlighted: boolean = false;

  const animatedFingers = spring(fingers, { stiffness: 0.1, damping: 0.4 });

  $: animatedFingers.set(fingers);

  $: activeClass = isActive ? 'cursor-grab' : 'cursor-not-allowed opacity-70';
  $: highlightClass = isHighlighted ? 'ring-2 ring-red-500 animate-pulse' : '';

  function handleDragStart(event: DragEvent) {
    if (!isActive) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData('text/plain', JSON.stringify({ player, hand }));
  }
</script>

<div
  class="w-24 h-32 bg-gray-200 rounded-lg flex flex-col justify-end items-center overflow-hidden relative transition-all duration-200 
         {activeClass} 
         {highlightClass}"
  draggable={isActive}
  on:dragstart={handleDragStart}
  data-hand="{player}-{hand}"
>
  {#each Array(4) as _, i}
    <div
      class="w-4 bg-blue-500 absolute bottom-0 transition-all duration-300 ease-out"
      style="height: {$animatedFingers >= i + 1 ? ($animatedFingers - i) * 25 : 0}%; left: {i * 25}%;"
      in:scale={{duration: 300, start: 0.5}}
    />
  {/each}
  {#if fingers > 0}
    <span 
      class="absolute top-2 text-2xl font-bold text-gray-700" 
      in:fade={{ duration: 200 }}
    >
      {fingers}
    </span>
  {/if}
</div>

<style>
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .animate-pulse {
    animation: pulse 1s infinite;
  }
</style>