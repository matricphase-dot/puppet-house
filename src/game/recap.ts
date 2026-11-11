import { Game } from "./types";

export type Storyline = { label: string; title: string; text: string };

export function seasonStorylines(game: Game): Storyline[] {
  const stories: Storyline[] = [];
  const betrayal = [...game.contestants].sort((a, b) => b.stats.betrayals - a.stats.betrayals)[0];
  if (betrayal?.stats.betrayals) stories.push({ label: "MASTER MANIPULATOR", title: betrayal.name, text: `${betrayal.stats.betrayals} trusted alliance${betrayal.stats.betrayals === 1 ? "" : "s"} turned into a vote. Loyalty was a strategy, not a promise.` });

  const exposed = [...game.contestants].sort((a, b) => b.stats.leaks - a.stats.leaks)[0];
  if (exposed?.stats.leaks) stories.push({ label: "MOST EXPOSED", title: exposed.name, text: `${exposed.stats.leaks} public secret leak${exposed.stats.leaks === 1 ? "" : "s"}. The audience knew exactly where to pull.` });

  let closest: { a: string; b: string; trust: number } | undefined;
  game.contestants.forEach((person) => game.contestants.forEach((other) => {
    if (person.id < other.id) {
      const trust = Math.round(((person.trust[other.id] || 0) + (other.trust[person.id] || 0)) / 2);
      if (!closest || trust > closest.trust) closest = { a: person.name, b: other.name, trust };
    }
  }));
  if (closest) stories.push({ label: "CLOSEST BOND", title: `${closest.a} + ${closest.b}`, text: `${closest.trust}% trust when the season ended. In this house, that practically counts as a romance.` });

  const target = [...game.contestants].sort((a, b) => b.stats.votesAgainst - a.stats.votesAgainst)[0];
  if (target?.stats.votesAgainst) stories.push({ label: "HOUSE TARGET", title: target.name, text: `${target.stats.votesAgainst} votes faced across the season. Being on everyone's mind is not always a compliment.` });

  const strategist = [...game.contestants].sort((a, b) => b.stats.majorityVotes - a.stats.majorityVotes)[0];
  if (strategist?.stats.majorityVotes) stories.push({ label: "VOTE WHISPERER", title: strategist.name, text: `${strategist.stats.majorityVotes} vote${strategist.stats.majorityVotes === 1 ? "" : "s"} landed with the majority. The strings were subtle. The impact was not.` });
  return stories.slice(0, 4);
}
