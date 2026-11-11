"use client";

import { Check, Crown, Download, RotateCcw, Share2, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { OBJECTIVES } from "@/game/data";
import { seasonStorylines } from "@/game/recap";
import { Game } from "@/game/types";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

function wrap(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2) {
  const words = text.split(" ");
  let line = "";
  let row = 0;
  for (const word of words) {
    const test = `${line}${word} `;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line.trim(), x, y + row * lineHeight);
      line = `${word} `;
      row += 1;
      if (row >= maxLines - 1) break;
    } else line = test;
  }
  context.fillText(line.trim(), x, y + row * lineHeight);
}

export function Results({ game, onRestart, onRematch, busy = false }: { game: Game; onRestart: () => void; onRematch: () => void; busy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const winner = game.contestants.find((person) => person.id === game.winnerId) || game.contestants[0];
  const player = game.contestants.find((person) => person.isPlayer)!;
  const playerScore = game.scores.find((score) => score.contestantId === player.id);
  const playerWon = winner.id === player.id;
  const playerEliminated = player.eliminated;
  const recap = game.messages.filter((message) => ["twist", "vote"].includes(message.kind)).slice(-8);
  const storylines = seasonStorylines(game);
  const winningScore = game.scores.find((score) => score.contestantId === winner.id)?.total || 0;

  const share = async () => {
    const text = `Puppet House: ${winner.name} won with ${winningScore} points. My puppet ${player.name} scored ${playerScore?.total || 0}. ${storylines[0] ? `${storylines[0].label}: ${storylines[0].title}.` : ""} Pull the strings. Lose control.`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  };

  const downloadCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#111014";
    context.fillRect(0, 0, 1200, 630);
    context.fillStyle = winner.color;
    context.fillRect(0, 0, 14, 630);
    context.fillStyle = "#ff6b57";
    context.font = "900 27px Arial";
    context.fillText("PUPPET HOUSE", 55, 65);
    context.fillStyle = "#8e8394";
    context.font = "14px Arial";
    context.fillText("SEASON FINALE  /  OFFICIAL RESULTS", 55, 94);
    context.fillStyle = "#f4eff6";
    context.font = "900 64px Arial";
    context.fillText(`${winner.name} takes the crown.`, 55, 185);
    context.fillStyle = "#d7f477";
    context.font = "italic 27px Georgia";
    context.fillText("The strings are cut. The crown is real.", 57, 229);
    context.fillStyle = winner.color;
    context.beginPath();
    context.arc(1030, 158, 77, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#111014";
    context.font = "900 65px Arial";
    context.textAlign = "center";
    context.fillText(winner.name.slice(0, 2).toUpperCase(), 1030, 180);
    context.textAlign = "left";
    context.fillStyle = "#f4eff6";
    context.font = "900 48px Arial";
    context.fillText(String(winningScore), 985, 292);
    context.fillStyle = "#8e8394";
    context.font = "12px Arial";
    context.fillText("WINNING SCORE", 978, 316);

    game.scores.slice(0, 4).forEach((score, index) => {
      const person = game.contestants.find((item) => item.id === score.contestantId)!;
      const y = 302 + index * 48;
      context.fillStyle = index % 2 ? "#18151c" : "#1d1921";
      context.fillRect(55, y - 27, 500, 39);
      context.fillStyle = person.color;
      context.font = "900 16px Arial";
      context.fillText(`0${index + 1}`, 70, y);
      context.fillStyle = "#f4eff6";
      context.fillText(person.name, 120, y);
      context.textAlign = "right";
      context.fillText(String(score.total), 530, y);
      context.textAlign = "left";
    });
    context.fillStyle = "#8e8394";
    context.font = "900 12px Arial";
    context.fillText("SEASON STORYLINES", 640, 373);
    storylines.slice(0, 2).forEach((story, index) => {
      const y = 410 + index * 86;
      context.fillStyle = "#c7a0f8";
      context.font = "900 12px Arial";
      context.fillText(story.label, 640, y);
      context.fillStyle = "#f4eff6";
      context.font = "900 21px Arial";
      context.fillText(story.title, 640, y + 27);
      context.fillStyle = "#9a909f";
      context.font = "13px Arial";
      wrap(context, story.text, 640, y + 49, 500, 17, 2);
    });
    context.fillStyle = "#6e6474";
    context.font = "12px Arial";
    context.fillText(`MY PUPPET: ${player.name.toUpperCase()}  ·  ${playerScore?.total || 0} POINTS  ·  ROOM ${game.roomCode}`, 55, 585);
    context.fillStyle = "#ff6b57";
    context.fillText("AI CONTESTANTS. HUMAN PUPPETEERS. HIDDEN AGENDAS.", 640, 585);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `puppet-house-${winner.name.toLowerCase().replace(/[^a-z0-9]/g, "")}-finale.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return <main className="results-page">
    <nav className="results-nav"><Logo compact /><span>SEASON 01 · FINAL TRANSMISSION</span></nav>
    <div className="confetti" aria-hidden="true">{Array.from({ length: 26 }).map((_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</div>
    <section className="winner-section">
      <div className="eyebrow"><Sparkles size={14} /> THE STRINGS ARE CUT. THE CROWN IS REAL.</div>
      <div className="winner-avatar"><span className="winner-ring" /><Avatar name={winner.name} color={winner.color} avatar={winner.avatar} size={172} /><div className="crown-badge"><Crown size={30} /></div><span className="winner-label">WINNER</span></div>
      <h1>{playerWon ? "You pulled it off." : playerEliminated ? "The house cut your strings." : `${winner.name} takes the crown.`}</h1>
      <p>{playerWon ? `${player.name} survived the chaos, won the room and completed your secret agenda. Mostly.` : playerEliminated ? `${player.name} was eliminated. The drama, however, was excellent.` : `${player.name} scored ${playerScore?.total || 0} points. ${winner.name} simply played a better game.`}</p>
      <div className="winner-score"><Trophy size={18} /><strong>{winningScore}</strong><span>WINNING SCORE</span></div>
    </section>

    {storylines.length > 0 && <section className="storyline-section"><div className="results-card-heading"><span>SEASON STORYLINES</span><small>The people and decisions that defined this house</small></div><div className="storyline-grid">{storylines.map((story) => <article key={story.label}><span>{story.label}</span><h3>{story.title}</h3><p>{story.text}</p></article>)}</div></section>}

    <section className="results-content">
      <div className="scoreboard-card"><div className="results-card-heading"><span>FINAL SCOREBOARD</span><small>Popularity + mission + survival + strategy</small></div>{game.scores.map((score, index) => {
        const person = game.contestants.find((item) => item.id === score.contestantId)!;
        const objective = OBJECTIVES.find((item) => item.id === person.objectiveId);
        return <article key={person.id} className={`score-row ${person.isPlayer ? "player-score" : ""}`}><span className="rank">0{index + 1}</span><Avatar name={person.name} color={person.color} avatar={person.avatar} size={48} /><div className="score-person"><strong>{person.name}{person.isPlayer && <span>YOUR PUPPET</span>}</strong><small>{objective?.name} · {Math.round(score.objectiveProgress * 100)}% complete</small></div><div className="score-parts"><span>♥ {score.popularity}</span><span>◆ {score.objective}</span><span>★ {score.strategy}</span></div><strong className="total-score">{score.total}</strong></article>;
      })}</div>
      <div className="recap-card"><div className="results-card-heading"><span>SEASON RECEIPTS</span><small>The moments that mattered</small></div><div className="recap-list">{recap.length ? recap.map((message) => <div key={message.id}><span>R{message.round}</span><p>{message.text}</p></div>) : <p>No twists. Suspiciously wholesome.</p>}</div></div>
    </section>
    <div className="results-actions">{game.mode === "party" ? <button className="button button-primary button-large" disabled={!game.isHost || busy} onClick={onRematch}><RotateCcw size={18} />{game.isHost ? busy ? "Reopening the house…" : "Run it back — same party" : "Waiting for host rematch"}</button> : <button className="button button-primary button-large" onClick={onRestart}><RotateCcw size={18} /> Play another season</button>}<button className="button button-secondary" onClick={downloadCard}><Download size={17} /> Download finale card</button><button className="button button-secondary" onClick={share}>{copied ? <Check size={17} /> : <Share2 size={17} />}{copied ? "Recap copied" : "Share the chaos"}</button>{game.mode === "party" && <button className="text-button" onClick={onRestart}>Recast with a new party</button>}</div>
    <footer className="results-footer">EVERY CONTESTANT WAS AUTONOMOUS. EVERY BAD DECISION WAS THEIRS.</footer>
  </main>;
}
