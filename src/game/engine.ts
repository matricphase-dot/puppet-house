import { AUDIENCE_LINES, DIALOGUE, OBJECTIVES, OPPONENTS } from "./data";
import {
  Archetype,
  CastingInput,
  Contestant,
  Game,
  GameMessage,
  GameMode,
  ObjectiveId,
  Producer,
  ScoreCard,
  Spectator,
  TwistId,
} from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const roomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X");
const COLORS = ["#ff6b57", "#82b4ff", "#c7a0f8", "#d7f477"];

function seeded(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 100000) / 100000;
}

function baseStats(): Contestant["stats"] {
  return { majorityVotes: 0, twistsSurvived: 0, betrayals: 0, leaks: 0, giants: 0, votesAgainst: 0 };
}

type CharacterInput = {
  id: string;
  name: string;
  archetype: Archetype;
  tagline: string;
  secret: string;
  objectiveId: ObjectiveId;
  color: string;
  avatar: number;
};

function makeContestant(input: CharacterInput, human: boolean, producerId?: string): Contestant {
  return {
    ...input,
    producerId,
    name: input.name.trim().slice(0, 18) || "Maya",
    tagline: input.tagline.trim().slice(0, 90),
    secret: input.secret.trim().slice(0, 180),
    popularity: 48 + Math.floor(seeded(input.id + input.name) * 9),
    trust: {},
    eliminated: false,
    isPlayer: human,
    immunity: false,
    stats: baseStats(),
  };
}

function createProducerGame(input: CastingInput, mode: GameMode): { game: Game; producer: Producer } {
  const producerId = `producer-${id()}`;
  const contestantId = `contestant-${id()}`;
  const player = makeContestant(
    {
      id: contestantId,
      name: input.name,
      archetype: input.archetype,
      tagline: input.tagline,
      secret: input.secret,
      objectiveId: input.objectiveId,
      color: COLORS[0],
      avatar: 0,
    },
    true,
    producerId,
  );
  const producer: Producer = {
    id: producerId,
    name: player.name,
    contestantId,
    isHost: true,
    joinedAt: Date.now(),
  };
  const game: Game = {
    id: id(),
    roomCode: roomCode(),
    mode,
    phase: "lobby",
    round: 1,
    turn: 0,
    turnsPerRound: 6,
    contestants: [player],
    messages: [],
    producers: { [producerId]: producer },
    hostId: producerId,
    playerId: contestantId,
    isHost: true,
    whispersLeft: 3,
    whisperCounts: { [producerId]: 3 },
    ballots: {},
    ballotsReady: false,
    ballotsSubmitted: 0,
    ballotsRequired: 1,
    twistsUsed: [],
    votes: {},
    scores: [],
    viewers: 1247,
    spectators: {},
    spectatorCount: 0,
    predictionTally: {},
    predictionTotal: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    aiMode: process.env.AI_API_KEY ? "live" : "director",
  };
  return { game, producer };
}

function initializeTrust(game: Game) {
  game.contestants.forEach((person) => {
    game.contestants.forEach((other) => {
      if (person.id !== other.id) {
        person.trust[other.id] = 38 + Math.floor(seeded(`${person.id}-${other.id}`) * 22);
      }
    });
  });
}

function addMessage(
  game: Game,
  input: Omit<GameMessage, "id" | "createdAt" | "round"> & { round?: number },
) {
  game.messages.push({ ...input, id: id(), createdAt: Date.now(), round: input.round ?? game.round });
  if (game.messages.length > 200) game.messages = game.messages.slice(-200);
  game.updatedAt = Date.now();
}

function beginLive(game: Game) {
  initializeTrust(game);
  game.phase = "live";
  game.round = 1;
  game.turn = 0;
  game.ballots = {};
  game.messages = [];
  addMessage(game, {
    senderId: "host",
    channel: "house",
    kind: "system",
    text: "The house is live. Four contestants. Three rounds. Absolutely no privacy.",
  });
  game.contestants.forEach((person) => {
    addMessage(game, {
      senderId: person.id,
      channel: "house",
      kind: "chat",
      text: `Hi house. I'm ${person.name}. ${person.tagline}`,
    });
    if (person.producerId) {
      addMessage(game, {
        senderId: "host",
        ownerId: person.producerId,
        channel: "confessional",
        kind: "whisper",
        text: `Your mission: ${OBJECTIVES.find((item) => item.id === person.objectiveId)?.description}`,
      });
    }
  });
  game.updatedAt = Date.now();
}

export function createGame(input: CastingInput): Game {
  const { game } = createProducerGame(input, "solo");
  game.contestants.push(...OPPONENTS.map((person) => makeContestant({ ...person, id: `ai-${person.id}` }, false)));
  beginLive(game);
  return game;
}

export function createParty(input: CastingInput): { game: Game; producer: Producer } {
  return createProducerGame(input, "party");
}

function castingFrom(person: Contestant): CastingInput {
  return { name: person.name, archetype: person.archetype, tagline: person.tagline, secret: person.secret, objectiveId: person.objectiveId as ObjectiveId };
}

export function createRematch(previous: Game): Game {
  const humans = previous.contestants.filter((person) => person.producerId);
  if (!humans.length || previous.mode !== "party") throw new Error("Only party seasons can be rematched.");
  const first = humans[0];
  const { game, producer } = createProducerGame(castingFrom(first), "party");
  const oldGeneratedId = producer.id;
  producer.id = first.producerId!;
  producer.isHost = producer.id === previous.hostId;
  game.contestants[0].producerId = producer.id;
  game.hostId = previous.hostId;
  game.producers = { [producer.id]: producer };
  game.whisperCounts = { [producer.id]: 3 };
  delete game.whisperCounts[oldGeneratedId];

  humans.slice(1).forEach((person) => {
    const oldId = person.producerId!;
    const joined = joinParty(game, castingFrom(person));
    if (!joined) return;
    const generatedId = joined.id;
    joined.id = oldId;
    joined.isHost = oldId === previous.hostId;
    const contestant = game.contestants.find((item) => item.id === joined.contestantId)!;
    contestant.producerId = oldId;
    delete game.producers[generatedId];
    delete game.whisperCounts[generatedId];
    game.producers[oldId] = joined;
    game.whisperCounts[oldId] = 3;
  });
  previous.nextGameId = game.id;
  previous.nextRoomCode = game.roomCode;
  return game;
}

export function joinParty(game: Game, input: CastingInput): Producer | undefined {
  if (game.mode !== "party" || game.phase !== "lobby" || game.contestants.length >= 4) return undefined;
  const producerId = `producer-${id()}`;
  const slot = game.contestants.length;
  const contestantId = `contestant-${id()}`;
  const person = makeContestant(
    {
      id: contestantId,
      name: input.name,
      archetype: input.archetype,
      tagline: input.tagline,
      secret: input.secret,
      objectiveId: input.objectiveId,
      color: COLORS[slot],
      avatar: slot,
    },
    true,
    producerId,
  );
  game.contestants.push(person);
  const producer: Producer = { id: producerId, name: person.name, contestantId, isHost: false, joinedAt: Date.now() };
  game.producers[producerId] = producer;
  game.whisperCounts[producerId] = 3;
  game.updatedAt = Date.now();
  return producer;
}

export function startParty(game: Game): Game {
  if (game.mode !== "party" || game.phase !== "lobby") return game;
  let slot = game.contestants.length;
  for (const person of OPPONENTS) {
    if (game.contestants.length >= 4) break;
    game.contestants.push(makeContestant({ ...person, id: `ai-${person.id}-${slot}` }, false));
    slot += 1;
  }
  beginLive(game);
  return game;
}

export function getPlayer(game: Game, producerId = game.hostId) {
  const producer = game.producers?.[producerId];
  return game.contestants.find((person) => person.id === producer?.contestantId)
    || game.contestants.find((person) => person.producerId === producerId)
    || game.contestants.find((person) => person.id === game.playerId)
    || game.contestants[0];
}

export function aliveContestants(game: Game) {
  return game.contestants.filter((person) => !person.eliminated);
}

export function objectiveProgress(person: Contestant, game: Game): number {
  switch (person.objectiveId) {
    case "fan-favorite": return clamp(person.popularity / 65, 0, 1);
    case "secret-keeper": return person.stats.leaks === 0 ? clamp(game.round / 3, 0, 1) : 0;
    case "majority-puppet": return clamp(person.stats.majorityVotes / 2, 0, 1);
    case "chaos-survivor": return clamp(person.stats.twistsSurvived / 2, 0, 1);
    case "bridge-builder": return clamp(Object.values(person.trust).filter((value) => value >= 55).length / 2, 0, 1);
    case "betrayer": return clamp(person.stats.betrayals, 0, 1);
    case "giant-slayer": return clamp(person.stats.giants, 0, 1);
    case "ghost": return person.stats.votesAgainst === 0 ? clamp(game.round / 3, 0, 1) : 0;
    default: return 0;
  }
}

export function calculateScores(game: Game): ScoreCard[] {
  return game.contestants.map((person) => {
    const progress = objectiveProgress(person, game);
    const popularity = Math.round(person.popularity * 0.45);
    const objective = Math.round(progress * 35);
    const survival = person.eliminated ? 0 : 10;
    const strategy = Math.min(10, person.stats.majorityVotes * 4 + person.stats.twistsSurvived * 2 + person.stats.betrayals * 3);
    return { contestantId: person.id, popularity, objective, survival, strategy, objectiveProgress: progress, total: popularity + objective + survival + strategy };
  }).sort((a, b) => b.total - a.total);
}

function fallbackLine(game: Game, speaker: Contestant, target: Contestant) {
  if (speaker.producerId && speaker.lastWhisper) {
    const whisper = speaker.lastWhisper;
    speaker.lastWhisper = undefined;
    return `I have been thinking about my next move. ${whisper} That is my priority now, ${target.name}.`;
  }
  const lines = DIALOGUE[speaker.archetype];
  const index = Math.floor(seeded(`${game.id}-${game.round}-${game.turn}-${speaker.id}`) * lines.length);
  return lines[index].replaceAll("{target}", target.name);
}

export function tick(game: Game, generatedLine?: string): Game {
  if (game.phase !== "live") return game;
  const alive = aliveContestants(game);
  const speaker = alive[(game.turn + game.round - 1) % alive.length];
  const target = alive[(game.turn + game.round) % alive.length];
  const line = generatedLine?.trim() || fallbackLine(game, speaker, target);
  addMessage(game, { senderId: speaker.id, channel: "house", kind: "chat", text: line.slice(0, 360) });

  if (game.turn === 1 || game.turn === 3) {
    const privateLines = [
      `Private to ${target.name}: “Between us, I do not think either of us is the real target tonight.”`,
      `Private to ${target.name}: “I will back you this round, but I need to know I am not your backup plan.”`,
      `Private to ${target.name}: “This stays here. I think the loudest person in the house is playing all of us.”`,
      `Private to ${target.name}: “Give me one reason not to flip this vote. A real reason.”`,
    ];
    const privateIndex = Math.floor(seeded(`${game.id}-dm-${game.round}-${game.turn}`) * privateLines.length);
    addMessage(game, { senderId: speaker.id, recipientId: target.id, channel: "alliance", kind: "chat", text: privateLines[privateIndex] });
  }

  const mood = seeded(`${game.id}-mood-${game.round}-${game.turn}`);
  const trustDelta = mood > 0.42 ? 4 : -3;
  speaker.trust[target.id] = clamp((speaker.trust[target.id] || 45) + trustDelta);
  target.trust[speaker.id] = clamp((target.trust[speaker.id] || 45) + (trustDelta > 0 ? 2 : -1));
  speaker.popularity = clamp(speaker.popularity + (mood > 0.35 ? 2 : -2));
  game.viewers += 7 + Math.floor(mood * 31);

  if (game.turn === 2 || game.turn === 4) {
    const audienceIndex = Math.floor(seeded(`${game.id}-audience-${game.round}-${game.turn}`) * AUDIENCE_LINES.length);
    addMessage(game, { senderId: "audience", channel: "audience", kind: "audience", text: AUDIENCE_LINES[audienceIndex] });
  }

  game.turn += 1;
  if (game.turn >= game.turnsPerRound) {
    game.phase = "vote";
    game.ballots = {};
    addMessage(game, {
      senderId: "host",
      channel: "house",
      kind: "vote",
      text: game.round === 3
        ? "FINALE: Every producer chooses who deserves the crown. Each ballot adds 15 points."
        : `ROUND ${game.round} VOTE: Every producer with a living puppet must vote. The house is waiting.`,
    });
  }
  return game;
}

export function whisper(game: Game, text: string, producerId = game.hostId): Game {
  const clean = text.trim().slice(0, 180);
  const player = getPlayer(game, producerId);
  const remaining = game.whisperCounts[producerId] ?? 0;
  if (game.phase !== "live" || remaining <= 0 || !clean || !player?.producerId || player.eliminated) return game;
  game.whisperCounts[producerId] = remaining - 1;
  player.lastWhisper = clean;
  addMessage(game, { senderId: "producer", ownerId: producerId, channel: "confessional", kind: "whisper", text: `You → ${player.name}: ${clean}` });
  addMessage(game, { senderId: player.id, ownerId: producerId, channel: "confessional", kind: "chat", text: "Understood. I will work it into the conversation naturally. Probably." });
  return game;
}

export function triggerTwist(game: Game, twist: TwistId, producerId?: string): Game {
  if (game.twistsUsed.includes(twist)) return game;
  if (twist === "revote") {
    if (game.phase !== "vote") return game;
    game.twistsUsed.push(twist);
    if (producerId) {
      const player = getPlayer(game, producerId);
      if (player) delete game.ballots[player.id];
    } else {
      game.ballots = {};
    }
    addMessage(game, { senderId: "host", channel: "house", kind: "twist", text: producerId ? "AUDIENCE TWIST: REVOTE. Your ballot has been cleared. Choose again." : "AUDIENCE TWIST: REVOTE. All producer ballots have been cleared." });
    return game;
  }
  if (game.phase !== "live") return game;
  const alive = aliveContestants(game);
  const targetIndex = Math.floor(seeded(`${game.id}-${twist}-${game.round}`) * alive.length);
  const player = producerId ? getPlayer(game, producerId) : alive[targetIndex];
  game.twistsUsed.push(twist);
  alive.forEach((person) => { person.stats.twistsSurvived += 1; });

  if (twist === "memory-leak") {
    const candidates = alive.filter((person) => person.stats.leaks === 0);
    const victim = candidates[Math.floor(seeded(`${game.id}-leak-${game.round}`) * candidates.length)] || player;
    victim.stats.leaks += 1;
    victim.popularity = clamp(victim.popularity - 5);
    addMessage(game, { senderId: "host", channel: "house", kind: "twist", text: `MEMORY LEAK → ${victim.name}'s secret: “${victim.secret}”` });
  }
  if (twist === "double-agent") {
    let pair = [alive[0], alive[1]];
    let strongest = -1;
    alive.forEach((person, index) => {
      alive.slice(index + 1).forEach((other) => {
        if ((person.trust[other.id] || 0) > strongest) {
          strongest = person.trust[other.id] || 0;
          pair = [person, other];
        }
      });
    });
    pair[0].trust[pair[1].id] = clamp((pair[0].trust[pair[1].id] || 50) - 18);
    pair[1].trust[pair[0].id] = clamp((pair[1].trust[pair[0].id] || 50) - 18);
    addMessage(game, { senderId: "host", channel: "alliance", kind: "twist", text: `DOUBLE AGENT → Receipts expose a private alliance between ${pair[0].name} and ${pair[1].name}. Trust just collapsed.` });
  }
  if (twist === "immunity") {
    player.immunity = true;
    addMessage(game, { senderId: "host", channel: "house", kind: "twist", text: `IMMUNITY → ${player.name} cannot be eliminated in the next vote.` });
  }
  if (twist === "confessional") {
    player.popularity = clamp(player.popularity + 9);
    addMessage(game, { senderId: player.id, channel: "house", kind: "twist", text: `CONFESSIONAL → ${player.name}: “I know people think I have a plan. Mostly, I am trying not to become the villain by accident.” Popularity +9.` });
  }
  addMessage(game, { senderId: "audience", channel: "audience", kind: "audience", text: "WE DID THAT 😭 best audience ever" });
  return game;
}

export function castVote(game: Game, targetId: string, producerId = game.hostId): Game {
  if (game.phase !== "vote") return game;
  const player = getPlayer(game, producerId);
  const target = game.contestants.find((person) => person.id === targetId && !person.eliminated);
  if (!player || player.eliminated || !target || target.id === player.id) return game;
  if (game.round < 3 && target.immunity) return game;
  game.ballots[player.id] = targetId;
  addMessage(game, { senderId: "producer", ownerId: producerId, channel: "confessional", kind: "vote", text: `Your ballot is locked for ${target.name}. ${game.mode === "party" ? "Waiting for the other producers." : "Reveal when ready."}` });
  return game;
}

function humanBallotState(game: Game) {
  const requiredVoters = aliveContestants(game).filter((person) => person.producerId);
  const submitted = requiredVoters.filter((person) => game.ballots[person.id]).length;
  return { required: requiredVoters.length, submitted, ready: requiredVoters.length === submitted };
}

export function revealVotes(game: Game): Game {
  const ballotState = humanBallotState(game);
  if (game.phase !== "vote" || !ballotState.ready) return game;
  const alive = aliveContestants(game);
  const votes: Record<string, string> = { ...game.ballots };

  if (game.round === 3) {
    game.scores = calculateScores(game);
    Object.values(game.ballots).forEach((targetId) => {
      const ballotTarget = game.scores.find((score) => score.contestantId === targetId);
      if (ballotTarget) ballotTarget.total += 15;
    });
    game.scores.sort((a, b) => b.total - a.total);
    game.winnerId = game.scores[0].contestantId;
    settlePredictions(game, game.winnerId);
    const winner = game.contestants.find((person) => person.id === game.winnerId)!;
    addMessage(game, { senderId: "host", channel: "house", kind: "vote", text: `${winner.name.toUpperCase()} WINS PUPPET HOUSE. The strings are cut. The crown is real.` });
    game.phase = "results";
    game.votes = votes;
    return game;
  }

  alive.filter((person) => !person.producerId).forEach((voter) => {
    const options = alive.filter((target) => target.id !== voter.id && !target.immunity);
    options.sort((a, b) => {
      const trustA = voter.trust[a.id] || 45;
      const trustB = voter.trust[b.id] || 45;
      return (trustA - a.popularity * 0.18) - (trustB - b.popularity * 0.18);
    });
    if (options[0]) votes[voter.id] = options[0].id;
  });

  const tally: Record<string, number> = {};
  Object.values(votes).forEach((target) => { tally[target] = (tally[target] || 0) + 1; });
  Object.entries(tally).forEach(([targetId, count]) => {
    const target = game.contestants.find((person) => person.id === targetId);
    if (target) target.stats.votesAgainst += count;
  });
  const eliminated = alive.filter((person) => !person.immunity).sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0) || a.popularity - b.popularity)[0];
  if (!eliminated) return game;

  const popularityLeader = [...alive].sort((a, b) => b.popularity - a.popularity)[0];
  Object.entries(votes).forEach(([voterId, targetId]) => {
    const voter = game.contestants.find((person) => person.id === voterId)!;
    if (targetId === eliminated.id) {
      voter.stats.majorityVotes += 1;
      if ((voter.trust[targetId] || 0) >= 55) voter.stats.betrayals += 1;
      if (eliminated.id === popularityLeader.id) voter.stats.giants += 1;
    }
  });
  eliminated.eliminated = true;
  settlePredictions(game, eliminated.id);
  game.contestants.forEach((person) => { person.immunity = false; });
  game.votes = votes;
  addMessage(game, {
    senderId: "host",
    channel: "house",
    kind: "vote",
    text: `THE HOUSE HAS SPOKEN → ${eliminated.name} is leaving with ${tally[eliminated.id] || 0} vote${(tally[eliminated.id] || 0) === 1 ? "" : "s"}. ${Object.entries(votes).map(([voter, target]) => `${game.contestants.find((p) => p.id === voter)?.name} → ${game.contestants.find((p) => p.id === target)?.name}`).join(" · ")}`,
  });

  if (game.mode === "solo" && getPlayer(game).eliminated) {
    game.scores = calculateScores(game);
    game.winnerId = game.scores.find((score) => score.contestantId !== getPlayer(game).id)?.contestantId;
    game.phase = "results";
    return game;
  }

  const remaining = aliveContestants(game);
  if (remaining.length <= 2) {
    game.round = 3;
    addMessage(game, { senderId: "host", channel: "house", kind: "system", text: "THE FINALE IS LIVE. Two contestants remain. Every message now matters." });
  } else {
    game.round += 1;
    addMessage(game, { senderId: "host", channel: "house", kind: "system", text: `ROUND ${game.round} IS LIVE. The house is smaller. The secrets feel bigger.` });
  }
  game.turn = 0;
  game.phase = "live";
  game.ballots = {};
  game.votes = {};
  return game;
}

export function joinSpectator(game: Game, name: string, spectatorId?: string): Spectator {
  const spectator: Spectator = { id: spectatorId || `viewer-${id()}`, name: name.trim().slice(0, 18) || "Anonymous", joinedAt: Date.now(), predictions: {}, fanPoints: 0 };
  const previous = spectatorId ? game.spectators[spectatorId] : undefined;
  game.spectators[spectator.id] = { ...previous, ...spectator };
  game.spectatorCount = Object.keys(game.spectators).length;
  game.updatedAt = Date.now();
  return game.spectators[spectator.id];
}

export function spectatorPredict(game: Game, spectatorId: string, targetId: string): Game {
  const spectator = game.spectators[spectatorId];
  const target = game.contestants.find((person) => person.id === targetId && !person.eliminated);
  if (!spectator || !target || game.phase !== "vote" || spectator.predictions[String(game.round)]) return game;
  spectator.predictions[String(game.round)] = target.id;
  addMessage(game, { senderId: "audience", channel: "audience", kind: "audience", text: `🔮 ${spectator.name} locked a House Pulse prediction for round ${game.round}.` });
  return game;
}

function settlePredictions(game: Game, correctId: string) {
  const predictions = Object.values(game.spectators).filter((spectator) => spectator.predictions[String(game.round)]);
  if (!predictions.length) return;
  let correct = 0;
  predictions.forEach((spectator) => {
    const hit = spectator.predictions[String(game.round)] === correctId;
    spectator.fanPoints += hit ? 100 : 25;
    if (hit) correct += 1;
  });
  const correctName = game.contestants.find((person) => person.id === correctId)?.name || "the result";
  addMessage(game, { senderId: "host", channel: "house", kind: "system", text: `HOUSE PULSE → ${correct}/${predictions.length} audience oracles predicted ${correctName}. Correct calls earn 100 Oracle points; every prediction earns 25.` });
}

export function spectatorChat(game: Game, spectatorId: string, text: string): Game {
  const spectator = game.spectators[spectatorId];
  const clean = text.trim().slice(0, 140);
  if (!spectator || !clean) return game;
  addMessage(game, { senderId: spectator.id, senderName: spectator.name, channel: "audience", kind: "audience", text: clean });
  return game;
}

export function publicGame(game: Game, spectatorView = false, requestedProducerId?: string): Game {
  const copy: Game = JSON.parse(JSON.stringify(game));
  const producerId = spectatorView ? undefined : requestedProducerId || copy.hostId;
  const own = producerId ? copy.contestants.find((person) => person.producerId === producerId) : undefined;
  copy.spectatorCount = Object.keys(copy.spectators || {}).length;
  copy.predictionTally = {};
  Object.values(copy.spectators || {}).forEach((spectator) => {
    const target = spectator.predictions?.[String(copy.round)];
    if (target && copy.phase === "vote") copy.predictionTally[target] = (copy.predictionTally[target] || 0) + 1;
  });
  copy.predictionTotal = Object.values(copy.predictionTally).reduce((sum, count) => sum + count, 0);
  copy.spectators = {};
  copy.playerId = own?.id || "";
  copy.isHost = !spectatorView && producerId === copy.hostId;
  copy.contestants.forEach((person) => { person.isPlayer = person.id === own?.id; });

  if (copy.phase !== "results") {
    copy.contestants.forEach((person) => {
      if (person.id !== own?.id) {
        person.secret = "Hidden until the season ends.";
        person.objectiveId = "hidden";
      }
      if (person.id !== own?.id) delete person.lastWhisper;
      delete person.producerId;
    });
  } else {
    copy.contestants.forEach((person) => { delete person.producerId; });
  }

  copy.messages = copy.messages.filter((message) => {
    if (message.channel === "confessional") return !spectatorView && message.ownerId === producerId;
    if (message.channel === "alliance") return message.kind === "twist" || (!spectatorView && (message.senderId === own?.id || message.recipientId === own?.id));
    return true;
  });
  copy.messages.forEach((message) => { delete message.ownerId; delete message.recipientId; });
  copy.whispersLeft = own && producerId ? copy.whisperCounts[producerId] ?? 0 : 0;
  copy.playerVote = own ? copy.ballots[own.id] : undefined;
  const requiredVoters = aliveContestants(copy).filter((person) => game.contestants.find((full) => full.id === person.id)?.producerId);
  copy.ballotsRequired = requiredVoters.length;
  copy.ballotsSubmitted = requiredVoters.filter((person) => copy.ballots[person.id]).length;
  copy.ballotsReady = copy.ballotsRequired === copy.ballotsSubmitted;
  copy.whisperCounts = {};
  copy.ballots = {};
  copy.producers = {};
  copy.hostId = "";
  return copy;
}
