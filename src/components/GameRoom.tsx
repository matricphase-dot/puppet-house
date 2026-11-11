"use client";

import {
  Check, CircleHelp, Copy, Eye, Heart, LockKeyhole, MessageSquareText, Pause, Play, Radio, RotateCcw,
  Send, Shield, Sparkles, UsersRound, Video, Vote, Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { OBJECTIVES, TWISTS } from "@/game/data";
import { objectiveProgress } from "@/game/engine";
import { Channel, Game, GameMessage, TwistId } from "@/game/types";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

const twistIcons = { "memory-leak": Radio, "double-agent": UsersRound, immunity: Shield, confessional: Video, revote: RotateCcw };
const channelLabels: { id: Channel; label: string }[] = [
  { id: "house", label: "The house" },
  { id: "alliance", label: "Private DMs" },
  { id: "confessional", label: "Producer cam" },
  { id: "audience", label: "Audience" },
];

export function FeedMessage({ message, game }: { message: GameMessage; game: Game }) {
  if (["system", "twist", "vote"].includes(message.kind)) {
    return <div className={`system-message system-${message.kind}`}><span>{message.kind === "twist" ? <Zap size={15} /> : message.kind === "vote" ? <Vote size={15} /> : <Radio size={15} />}</span><p>{message.text}</p></div>;
  }
  if (message.channel === "audience") return <div className="audience-message"><span>@{message.senderName || `liveviewer${message.id.slice(-2)}`}</span>{message.text}</div>;
  const person = game.contestants.find((item) => item.id === message.senderId);
  if (message.kind === "whisper" && message.senderId === "producer") return <div className="producer-message"><MessageSquareText size={16} /><p>{message.text}</p></div>;
  if (message.kind === "whisper" && message.senderId === "host") return <div className="mission-message"><LockKeyhole size={16} /><p>{message.text}</p></div>;
  return (
    <div className={`feed-message ${person?.isPlayer ? "own-contestant" : ""}`}>
      <Avatar name={person?.name || "Host"} color={person?.color || "#777"} avatar={person?.avatar || 0} size={35} />
      <div><div className="message-author"><strong style={{ color: person?.color }}>{person?.name || "HOST"}</strong>{person?.isPlayer && <span>YOUR PUPPET</span>}<time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div><p>{message.text}</p></div>
    </div>
  );
}

export function GameRoom({ game, busy, autoPlay, nexconn, onAutoPlay, onAction, onNewSeason }: {
  game: Game;
  busy: boolean;
  autoPlay: boolean;
  nexconn: boolean;
  onAutoPlay: (value: boolean) => void;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onNewSeason: () => void;
}) {
  const [channel, setChannel] = useState<Channel>("house");
  const [whisperText, setWhisperText] = useState("");
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const feedEnd = useRef<HTMLDivElement>(null);
  const player = game.contestants.find((person) => person.isPlayer)!;
  const objective = OBJECTIVES.find((item) => item.id === player.objectiveId)!;
  const progress = objectiveProgress(player, game);
  const alive = game.contestants.filter((person) => !person.eliminated);
  const messages = useMemo(() => game.messages.filter((message) => message.channel === channel), [game.messages, channel]);
  const closest = Object.entries(player.trust).sort((a, b) => b[1] - a[1])[0];
  const closestPerson = game.contestants.find((person) => person.id === closest?.[0]);
  const predictionLeader = Object.entries(game.predictionTally).sort((a, b) => b[1] - a[1])[0];
  const predictionPerson = game.contestants.find((person) => person.id === predictionLeader?.[0]);

  useEffect(() => { feedEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, channel]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/spectate/${game.roomCode}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard can be unavailable in embedded previews */ }
  };

  const sendWhisper = (event: FormEvent) => {
    event.preventDefault();
    if (!whisperText.trim() || game.whispersLeft <= 0 || busy) return;
    onAction("whisper", { text: whisperText });
    setWhisperText("");
  };

  return (
    <main className="game-page">
      <header className="game-header">
        <Logo compact />
        <div className="season-status"><span className="live-pill"><i /> LIVE</span><div><strong>{game.round === 3 ? "THE FINALE" : `ROUND ${game.round} OF 3`}</strong><small>{game.phase === "vote" ? "VOTING OPEN" : `${game.turn}/${game.turnsPerRound} MOMENTS`}</small></div></div>
        <button className="room-invite" onClick={copyInvite} title="Copy spectator invite">{copied ? <Check size={14} /> : <Copy size={14} />}<span>{copied ? "INVITE COPIED" : `ROOM ${game.roomCode}`}</span></button>
        <div className="header-actions"><span className={`transport-status ${nexconn ? "connected" : ""}`} title={nexconn ? "Nexconn Chat connected" : "Local Director transport"}><i />{nexconn ? "NEXCONN LIVE" : "DIRECTOR MODE"}</span><span className="viewer-count" title={`${game.spectatorCount} joined spectators`}><Eye size={15} />{(game.viewers + game.spectatorCount).toLocaleString()}</span><button className="icon-button" onClick={() => setShowGuide(true)} title="How to play"><CircleHelp size={18} /></button>{game.isHost && <button className="icon-button" onClick={() => onAutoPlay(!autoPlay)} title={autoPlay ? "Pause season" : "Resume season"}>{autoPlay ? <Pause size={18} /> : <Play size={18} />}</button>}</div>
      </header>

      <div className="round-progress" aria-label="Round progress">{Array.from({ length: game.turnsPerRound }).map((_, index) => <i key={index} className={index < game.turn ? "done" : index === game.turn && game.phase === "live" ? "current" : ""} />)}</div>

      <div className="game-layout">
        <aside className="contestant-panel">
          <div className="panel-heading"><span>CONTESTANTS</span><small>{alive.length} IN THE HOUSE</small></div>
          <div className="contestant-list">{game.contestants.map((person) => (
            <article key={person.id} className={`contestant-card ${person.isPlayer ? "is-player" : ""} ${person.eliminated ? "is-eliminated" : ""}`}>
              <div className="contestant-avatar"><Avatar name={person.name} color={person.color} avatar={person.avatar} size={49} />{person.immunity && <span className="immunity-badge"><Shield size={11} /></span>}</div>
              <div className="contestant-info"><div><strong>{person.name}</strong>{person.isPlayer && <span>YOU</span>}</div><small>{person.eliminated ? "ELIMINATED" : person.archetype}</small>{!person.eliminated && <div className="popularity-bar"><i style={{ width: `${person.popularity}%`, background: person.color }} /></div>}</div>
              {!person.eliminated && <span className="popularity-number"><Heart size={11} />{person.popularity}</span>}
            </article>
          ))}</div>
          <div className="relationship-card"><span>CLOSEST BOND</span>{closestPerson ? <div><Avatar name={closestPerson.name} color={closestPerson.color} avatar={closestPerson.avatar} size={32} /><p><strong>{player.name} + {closestPerson.name}</strong><i><b style={{ width: `${closest?.[1] || 0}%` }} /></i></p><em>{closest?.[1] || 0}%</em></div> : <p>No bonds yet.</p>}</div>
          <button className="text-button new-season-link" onClick={onNewSeason}><RotateCcw size={14} /> New season</button>
        </aside>

        <section className="feed-panel">
          <div className="channel-tabs">{channelLabels.map((item) => <button key={item.id} className={channel === item.id ? "active" : ""} onClick={() => setChannel(item.id)}>{item.label}{item.id === "audience" && <span className="audience-dot" />}</button>)}</div>
          <div className="feed-title"><div><span className="live-dot" />{channel === "house" ? "PUBLIC HOUSE CHANNEL" : channel === "alliance" ? "YOUR CONTESTANT'S DMS + EXPOSED RECEIPTS" : channel === "confessional" ? "ONLY YOU CAN SEE THIS" : "LIVE AUDIENCE REACTIONS"}</div><LockKeyhole size={13} /></div>
          <div className="message-feed">{messages.length ? messages.map((message) => <FeedMessage key={message.id} message={message} game={game} />) : <div className="empty-feed"><MessageSquareText size={28} /><p>Nothing here yet.</p><small>A little privacy. For now.</small></div>}<div ref={feedEnd} /></div>
          {busy && game.phase === "live" && <div className="typing-indicator"><span><i /><i /><i /></span>Someone is choosing their next move…</div>}
          <div className="autonomous-input"><Sparkles size={17} /><span>Contestants speak for themselves. That is the whole problem.</span>{game.isHost && !autoPlay && game.phase === "live" && <button disabled={busy} onClick={() => onAction("tick")}>Next moment <Play size={14} /></button>}</div>
        </section>

        <aside className="producer-panel">
          <div className="producer-heading"><div><span>PRODUCER CONSOLE</span><small>PRIVATE · {player.name.toUpperCase()}</small></div><MessageSquareText size={20} /></div>
          <section className="mission-card"><div className="mission-top"><span><LockKeyhole size={14} /> SECRET MISSION</span><strong>{Math.round(progress * 100)}%</strong></div><h3>{objective.name}</h3><p>{objective.description}</p><div className="mission-progress"><i style={{ width: `${progress * 100}%` }} /></div></section>
          <section className="whisper-section"><div className="section-label"><span>PRODUCER WHISPERS</span><div className="whisper-pips">{[0, 1, 2].map((index) => <i key={index} className={index < game.whispersLeft ? "available" : ""} />)}</div></div><p>One short instruction. Your puppet interprets it in its own way.</p><form onSubmit={sendWhisper}><textarea value={whisperText} maxLength={180} onChange={(event) => setWhisperText(event.target.value)} placeholder={game.whispersLeft ? "e.g. Get close to Riya, then turn the house against Arjun." : "All three whispers used. You are on your own."} disabled={!game.whispersLeft || game.phase !== "live" || player.eliminated} /><div><small>{whisperText.length}/180</small><button disabled={!whisperText.trim() || !game.whispersLeft || busy || game.phase !== "live" || player.eliminated} aria-label="Send whisper"><Send size={16} /></button></div></form></section>
          <section className="twist-section"><div className="section-label"><span>AUDIENCE TWISTS</span><Zap size={14} /></div><p>One use each. Maximum chaos. No refunds.</p><div className="twist-grid">{TWISTS.filter((twist) => twist.id !== "revote").map((twist) => {
            const Icon = twistIcons[twist.id];
            const used = game.twistsUsed.includes(twist.id);
            return <button key={twist.id} className={used ? "used" : ""} disabled={used || game.phase !== "live" || busy} onClick={() => onAction("twist", { twist: twist.id as TwistId })}><Icon size={17} /><span><strong>{twist.name}</strong><small>{used ? "Already unleashed" : twist.description}</small></span></button>;
          })}</div></section>
          <div className="producer-warning"><Eye size={14} /><span>The audience can see the house.<br />Only you can see this console.</span></div>
        </aside>
      </div>

      {showGuide && <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="How to play"><section className="guide-card"><button className="guide-close" onClick={() => setShowGuide(false)} aria-label="Close guide">×</button><div className="eyebrow"><Sparkles size={14} /> YOUR 30-SECOND HOUSE BRIEFING</div><h2>Coach the chaos.<br /><em>Do not script it.</em></h2><div className="guide-steps"><article><span>01</span><div><strong>Watch your puppet think</strong><p>Contestants speak autonomously, build trust and send private DMs. Only their own producer sees those DMs.</p></div></article><article><span>02</span><div><strong>Spend three whispers wisely</strong><p>You get exactly three for the whole season. Your contestant interprets each instruction in its next public moment.</p></div></article><article><span>03</span><div><strong>Vote, survive, complete the mission</strong><p>Submit a private ballot each vote. Use audience twists, track your secret objective and reach the finale.</p></div></article></div><button className="button button-primary" onClick={() => setShowGuide(false)}>I know the risks <Play size={16} /></button></section></div>}
      {game.phase === "vote" && <div className="vote-overlay"><section className="vote-card"><div className="vote-intro"><span><Vote size={22} /></span><div><small>{game.round === 3 ? "THE FINAL BALLOT" : `ROUND ${game.round} · ELIMINATION`}</small><h2>{game.round === 3 ? "Who gets the crown?" : "Who does your puppet vote out?"}</h2><p>{game.round === 3 ? "Your choice adds 15 points. Popularity and secret missions decide the rest." : "Rival contestants have already made their choices. Yours closes the vote."}</p></div></div><div className="vote-options">{alive.filter((person) => person.id !== player.id).map((person) => {
        const protectedPerson = game.round < 3 && person.immunity;
        return <button key={person.id} disabled={protectedPerson || player.eliminated} className={game.playerVote === person.id ? "selected" : ""} onClick={() => onAction("vote", { targetId: person.id })}><Avatar name={person.name} color={person.color} avatar={person.avatar} size={66} /><strong>{person.name}</strong><span>{protectedPerson ? "IMMUNE" : `${person.popularity}% LOVED`}</span>{game.playerVote === person.id && <i>YOUR VOTE</i>}</button>;
      })}</div><div className="ballot-status">{player.eliminated ? "Your puppet is out. You are watching this vote." : game.mode === "party" ? `${game.ballotsSubmitted}/${game.ballotsRequired} eligible producer ballots submitted` : "Your ballot is private until the reveal."}</div>{game.predictionTotal > 0 && predictionPerson && <div className="producer-pulse"><Eye size={13} /><span>HOUSE PULSE · {game.predictionTotal} audience prediction{game.predictionTotal === 1 ? "" : "s"} · {predictionPerson.name} leads with {Math.round((predictionLeader?.[1] || 0) / game.predictionTotal * 100)}%</span></div>}<div className="vote-actions">{game.playerVote && game.round < 3 && !game.twistsUsed.includes("revote") && <button className="text-button" onClick={() => onAction("twist", { twist: "revote" })}><RotateCcw size={15} /> Audience revote</button>}{game.isHost ? <button className="button button-primary" disabled={!game.ballotsReady || busy} onClick={() => onAction("reveal")}>{game.ballotsReady ? game.round === 3 ? "Crown the winner" : "Reveal the votes" : "Waiting for ballots"}<Vote size={17} /></button> : <span className="waiting-ballots">The host will reveal the votes.</span>}</div></section></div>}
    </main>
  );
}
