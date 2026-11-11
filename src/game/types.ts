export type Archetype = "charmer" | "strategist" | "chaos" | "innocent";
export type GamePhase = "lobby" | "live" | "vote" | "results";
export type GameMode = "solo" | "party";
export type Channel = "house" | "alliance" | "confessional" | "audience";
export type TwistId = "memory-leak" | "double-agent" | "immunity" | "confessional" | "revote";
export type ObjectiveId =
  | "fan-favorite"
  | "secret-keeper"
  | "majority-puppet"
  | "chaos-survivor"
  | "bridge-builder"
  | "betrayer"
  | "giant-slayer"
  | "ghost";

export interface Contestant {
  id: string;
  producerId?: string;
  name: string;
  archetype: Archetype;
  tagline: string;
  secret: string;
  objectiveId: ObjectiveId | "hidden";
  color: string;
  avatar: number;
  popularity: number;
  trust: Record<string, number>;
  eliminated: boolean;
  /** In a public view this means "your puppet"; in the authoritative state it means human-authored. */
  isPlayer: boolean;
  immunity: boolean;
  lastWhisper?: string;
  stats: {
    majorityVotes: number;
    twistsSurvived: number;
    betrayals: number;
    leaks: number;
    giants: number;
    votesAgainst: number;
  };
}

export interface GameMessage {
  id: string;
  senderId: string;
  senderName?: string;
  ownerId?: string;
  recipientId?: string;
  text: string;
  channel: Channel;
  kind: "chat" | "system" | "whisper" | "twist" | "vote" | "audience";
  createdAt: number;
  round: number;
}

export interface ScoreCard {
  contestantId: string;
  total: number;
  popularity: number;
  objective: number;
  survival: number;
  strategy: number;
  objectiveProgress: number;
}

export interface Spectator {
  id: string;
  name: string;
  joinedAt: number;
  lastTwistRound?: number;
}

export interface Producer {
  id: string;
  name: string;
  contestantId: string;
  isHost: boolean;
  joinedAt: number;
}

export interface Game {
  id: string;
  roomCode: string;
  mode: GameMode;
  phase: GamePhase;
  round: number;
  turn: number;
  turnsPerRound: number;
  contestants: Contestant[];
  messages: GameMessage[];
  producers: Record<string, Producer>;
  hostId: string;
  /** Viewer-derived fields retained for the UI. */
  playerId: string;
  isHost: boolean;
  whispersLeft: number;
  playerVote?: string;
  whisperCounts: Record<string, number>;
  ballots: Record<string, string>;
  ballotsReady: boolean;
  ballotsSubmitted: number;
  ballotsRequired: number;
  twistsUsed: TwistId[];
  votes: Record<string, string>;
  winnerId?: string;
  scores: ScoreCard[];
  viewers: number;
  spectators: Record<string, Spectator>;
  spectatorCount: number;
  createdAt: number;
  updatedAt: number;
  aiMode: "live" | "director";
}

export interface CastingInput {
  name: string;
  archetype: Archetype;
  tagline: string;
  secret: string;
  objectiveId: ObjectiveId;
}

export interface ObjectiveDefinition {
  id: ObjectiveId;
  name: string;
  short: string;
  description: string;
  icon: string;
}

export interface TwistDefinition {
  id: TwistId;
  name: string;
  description: string;
  icon: string;
}
