import { Archetype, ObjectiveDefinition, ObjectiveId, TwistDefinition } from "./types";

export const OBJECTIVES: ObjectiveDefinition[] = [
  { id: "fan-favorite", name: "Fan favourite", short: "Be adored", description: "Finish the season with at least 65% audience popularity.", icon: "Heart" },
  { id: "secret-keeper", name: "Clean hands", short: "Hide the truth", description: "Reach the finale without your secret being leaked.", icon: "LockKeyhole" },
  { id: "majority-puppet", name: "Vote architect", short: "Control the room", description: "Vote with the eliminating majority in two rounds.", icon: "Vote" },
  { id: "chaos-survivor", name: "Chaos proof", short: "Survive the storm", description: "Stay alive through at least two audience twists.", icon: "Zap" },
  { id: "bridge-builder", name: "The bridge", short: "Build two bonds", description: "Finish with strong trust from two other contestants.", icon: "Handshake" },
  { id: "betrayer", name: "Velvet knife", short: "Betray a friend", description: "Vote out someone who strongly trusts you.", icon: "Scissors" },
  { id: "giant-slayer", name: "Giant slayer", short: "Topple the favourite", description: "Help eliminate the most popular contestant in a round.", icon: "Crown" },
  { id: "ghost", name: "The ghost", short: "Become invisible", description: "Reach the finale without receiving a vote.", icon: "Ghost" },
];

export const PLAYER_OBJECTIVES: ObjectiveId[] = ["fan-favorite", "secret-keeper", "majority-puppet", "chaos-survivor"];

export const TWISTS: TwistDefinition[] = [
  { id: "memory-leak", name: "Memory leak", description: "A hidden secret goes public.", icon: "Radio" },
  { id: "double-agent", name: "Double agent", description: "Expose the strongest alliance.", icon: "UsersRound" },
  { id: "immunity", name: "Immunity", description: "Protect your puppet this vote.", icon: "Shield" },
  { id: "confessional", name: "Confessional", description: "A honest moment boosts popularity.", icon: "Video" },
  { id: "revote", name: "Revote", description: "Clear your ballot before the reveal.", icon: "RotateCcw" },
];

export const OPPONENTS = [
  {
    id: "riya",
    name: "Riya",
    archetype: "charmer" as Archetype,
    tagline: "Certified sunshine. Questionable motives.",
    secret: "I auditioned as a joke. Now I would do anything to win.",
    objectiveId: "fan-favorite" as ObjectiveId,
    color: "#f4c95d",
    avatar: 1,
  },
  {
    id: "arjun",
    name: "Arjun",
    archetype: "strategist" as Archetype,
    tagline: "Three moves ahead. Allegedly.",
    secret: "I have been keeping notes on everyone since the casting call.",
    objectiveId: "giant-slayer" as ObjectiveId,
    color: "#82b4ff",
    avatar: 2,
  },
  {
    id: "zoya",
    name: "Zoya",
    archetype: "chaos" as Archetype,
    tagline: "Here for a good time, not a calm time.",
    secret: "I came here to make my ex jealous. It is not working.",
    objectiveId: "chaos-survivor" as ObjectiveId,
    color: "#c7a0f8",
    avatar: 3,
  },
];

export const NAMES = ["Maya", "Aisha", "Dev", "Naina", "Rehan", "Ira"];
export const TAGLINES = [
  "Just here to make friends. And enemies.",
  "A little delulu. A lot determined.",
  "Main character energy. Supporting character patience.",
  "Sweet enough to trust. Smart enough not to.",
];

export const DIALOGUE: Record<Archetype, string[]> = {
  charmer: [
    "I literally walked in wanting world peace, but {target} is testing my diplomacy.",
    "Can we normalize saying what we mean before the vote? Asking for a friend.",
    "I adore everyone here. That is not an alliance, {target}, relax.",
    "The way this room goes quiet when someone mentions loyalty… fascinating.",
    "I brought snacks and emotional availability. What did you bring, {target}?",
    "No notes on the outfit. Several notes on the strategy.",
  ],
  strategist: [
    "Interesting. {target} answered that question without actually answering it.",
    "Let us separate what we know from what we want to believe.",
    "Everyone has revealed a priority. Most of you just did not notice it.",
    "I am not forming an alliance. I am mapping incentives. There is a difference.",
    "If I were the target, I would want exactly this much chaos. Think about that.",
    "That sounded rehearsed, {target}. Good rehearsal, though.",
  ],
  chaos: [
    "I vote we stop being normal immediately. Who is with me?",
    "I have a theory. I will not be sharing it because I enjoy the tension.",
    "{target}, blink twice if your alliance is already collapsing.",
    "I came for a little drama and somehow I am the calmest person here.",
    "Can the next argument include a plot twist? This one is getting predictable.",
    "I trust {target}. Today. For the next eleven minutes.",
  ],
  innocent: [
    "I genuinely do not understand the strategy, but I am listening.",
    "That hurt a little, {target}. I would rather just say it than pretend.",
    "I want to believe you. Please give me one good reason.",
    "Everyone keeps talking about the game. I am thinking about the people.",
    "I might be naive, but at least my story has not changed twice.",
    "Can we pause the plotting for one honest conversation?",
  ],
};

export const AUDIENCE_LINES = [
  "this house has ZERO chill 😭",
  "the silence said more than the message",
  "I would trust absolutely nobody here",
  "PRODUCER CAM WHEN???",
  "that whisper changed everything",
  "front row seats to the downfall 🍿",
  "the alliance math is not mathing",
];
