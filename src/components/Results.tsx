"use client";

import { Check, Crown, RotateCcw, Share2, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { OBJECTIVES } from "@/game/data";
import { Game } from "@/game/types";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

export function Results({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const [copied, setCopied] = useState(false);
  const winner = game.contestants.find((person) => person.id === game.winnerId) || game.contestants[0];
  const player = game.contestants.find((person) => person.isPlayer)!;
  const playerScore = game.scores.find((score) => score.contestantId === player.id);
  const playerWon = winner.id === player.id;
  const playerEliminated = player.eliminated;
  const recap = game.messages.filter((message) => ["twist", "vote"].includes(message.kind)).slice(-8);

  const share = async () => {
    const text = `Puppet House Season 01: ${winner.name} won with ${game.scores.find((score) => score.contestantId === winner.id)?.total} points. My puppet ${player.name} scored ${playerScore?.total || 0}. Pull the strings. Lose control.`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  };

  return (
    <main className="results-page">
      <nav className="results-nav"><Logo compact /><span>SEASON 01 · FINAL TRANSMISSION</span></nav>
      <div className="confetti" aria-hidden="true">{Array.from({ length: 26 }).map((_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</div>
      <section className="winner-section">
        <div className="eyebrow"><Sparkles size={14} /> THE STRINGS ARE CUT. THE CROWN IS REAL.</div>
        <div className="winner-avatar"><span className="winner-ring" /><Avatar name={winner.name} color={winner.color} avatar={winner.avatar} size={172} /><div className="crown-badge"><Crown size={30} /></div><span className="winner-label">WINNER</span></div>
        <h1>{playerWon ? "You pulled it off." : playerEliminated ? "The house cut your strings." : `${winner.name} takes the crown.`}</h1>
        <p>{playerWon ? `${player.name} survived the chaos, won the room and completed your secret agenda. Mostly.` : playerEliminated ? `${player.name} was eliminated in round ${playerScore ? Math.min(3, game.round) : 1}. The drama, however, was excellent.` : `${player.name} scored ${playerScore?.total || 0} points. ${winner.name} simply played a better game.`}</p>
        <div className="winner-score"><Trophy size={18} /><strong>{game.scores.find((score) => score.contestantId === winner.id)?.total}</strong><span>WINNING SCORE</span></div>
      </section>

      <section className="results-content">
        <div className="scoreboard-card"><div className="results-card-heading"><span>FINAL SCOREBOARD</span><small>Popularity + mission + survival + strategy</small></div>{game.scores.map((score, index) => {
          const person = game.contestants.find((item) => item.id === score.contestantId)!;
          const objective = OBJECTIVES.find((item) => item.id === person.objectiveId);
          return <article key={person.id} className={`score-row ${person.isPlayer ? "player-score" : ""}`}><span className="rank">0{index + 1}</span><Avatar name={person.name} color={person.color} avatar={person.avatar} size={48} /><div className="score-person"><strong>{person.name}{person.isPlayer && <span>YOUR PUPPET</span>}</strong><small>{objective?.name} · {Math.round(score.objectiveProgress * 100)}% complete</small></div><div className="score-parts"><span>♥ {score.popularity}</span><span>◆ {score.objective}</span><span>★ {score.strategy}</span></div><strong className="total-score">{score.total}</strong></article>;
        })}</div>
        <div className="recap-card"><div className="results-card-heading"><span>SEASON RECEIPTS</span><small>The moments that mattered</small></div><div className="recap-list">{recap.length ? recap.map((message) => <div key={message.id}><span>R{message.round}</span><p>{message.text}</p></div>) : <p>No twists. Suspiciously wholesome.</p>}</div></div>
      </section>
      <div className="results-actions"><button className="button button-primary button-large" onClick={onRestart}><RotateCcw size={18} /> Play another season</button><button className="button button-secondary" onClick={share}>{copied ? <Check size={17} /> : <Share2 size={17} />}{copied ? "Recap copied" : "Share the chaos"}</button></div>
      <footer className="results-footer">EVERY CONTESTANT WAS AUTONOMOUS. EVERY BAD DECISION WAS THEIRS.</footer>
    </main>
  );
}
