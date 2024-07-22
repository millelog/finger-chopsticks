// File: src/lib/types/gameTypes.ts

export type Hand = 'left' | 'right';
export type Player = 'player' | 'bot';
export type GameStatus = 'ongoing' | 'won' | 'lost';

export interface HandState {
  left: number;
  right: number;
}

export interface GameState {
  player: HandState;
  bot: HandState;
  currentTurn: Player;
  status: GameStatus;
  lastMove: LastMove | null;
}

export interface RegularMove {
  type: 'regular';
  sourcePlayer: Player;
  sourceHand: Hand;
  targetPlayer: Player;
  targetHand: Hand;
}

export interface SplitMove {
  type: 'split';
  player: Player;
  sourceHand: Hand;
  targetHand: Hand;
}

export type LastMove = RegularMove | SplitMove;

export interface GameStore {
  subscribe: (callback: (state: GameState) => void) => () => void;
  playHand: (sourcePlayer: Player, sourceHand: Hand, targetPlayer: Player, targetHand: Hand) => void;
  splitHand: (player: Player, sourceHand: Hand, targetHand: Hand) => void;
  resetGame: () => void;
  setGameStatus: (status: GameStatus) => void;
}