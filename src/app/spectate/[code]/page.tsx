"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, Eye, Heart, Radio, RotateCcw, Send, Shield, Sparkles, Trophy, UsersRound, Video, Zap } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FeedMessage } from "@/components/GameRoom";
import { Logo } from "@/components/Logo";
import { TWISTS } from "@/game/data";
import { Channel, Game, Spectator, TwistId } from "@/game/types";

const twistIcons = { "memory-leak": Radio, "double-agent": UsersRound, immunity: Shield, confessional: Video, revote: RotateCcw };
const tabs: { id: Channel; label: string }[] = [
  { id: "house", label: "Live feed" },
  { id: "alliance", label: "Leaked DMs" },
  { id: "audience", label: "Audience chat" },
];

function SpectatorRoom() {
  const params = useParams<{ code: string }>();
  const code = String(params.code || "").toUpperCase();
  const [game, setGame] = useState<Game | null>(null);
  const [spectator, setSpectator] = useState<Spectator | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("house");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const feedEnd = useRef<HTMLDivElement>(null);

  const join = useCallback(async (displayName: string, spectatorId?: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spectatorJoin", code, name: displayName, spectatorId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setGame(data.game);
      setSpectator(data.spectator);
      localStorage.setItem(`puppet-spectator-${code}`, JSON.stringify({ id: data.spectator.id, name: data.spectator.name }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not join this room.");
    } finally {
      setBusy(false);
    }
  }, [code]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(`puppet-spectator-${code}`);
      if (saved) {
        try {
          const identity = JSON.parse(saved);
          join(identity.name, identity.id);
        } catch { join("Anonymous"); }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code, join]);

  useEffect(() => {
    if (!spectator) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/game?code=${encodeURIComponent(code)}&spectator=1&spectatorId=${encodeURIComponent(spectator.id)}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setGame(data.game);
        if (data.spectator) setSpectator(data.spectator);
      }
    }, 1400);
    return () => window.clearInterval(timer);
  }, [code, spectator]);

  useEffect(() => { feedEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [game?.messages.length, channel]);

  const action = async (actionName: "spectatorTwist" | "spectatorChat" | "spectatorPredict", payload: Record<string, unknown> = {}) => {
    if (!spectator || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, code, spectatorId: spectator.id, ...payload }),
      });
      const data = await response.json();
      if (response.ok) {
        setGame(data.game);
        setSpectator(data.spectator);
      }
    } finally { setBusy(false); }
  };

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    if (!chat.trim()) return;
    action("spectatorChat", { text: chat });
    setChat("");
  };

  if (!game || !spectator) {
    return <main className="spectator-join"><nav><Logo /><span><i /> LIVE REALITY, REAL INTERFERENCE</span></nav><section><div className="spectator-join-copy"><div className="eyebrow"><Sparkles size={14} /> YOU ARE NOT JUST WATCHING THE SHOW</div><h1>The audience<br /><em>has teeth.</em></h1><p>Enter the live house, react with everyone else, and unleash one audience twist per round.</p><div className="join-room-code">ROOM <strong>{code}</strong></div></div><form onSubmit={(event) => { event.preventDefault(); join(name); }} className="spectator-join-form"><span>JOIN THE LIVE AUDIENCE</span><h2>Choose a display name</h2><p>No account. No producer secrets. Maximum interference.</p><input autoFocus value={name} maxLength={18} onChange={(event) => setName(event.target.value)} placeholder="e.g. DramaWatcher" />{error && <div className="join-error">{error}</div>}<button className="button button-primary" disabled={!name.trim() || busy}>{busy ? "Finding the house…" : "Enter the audience"}<Eye size={17} /></button><small>You can leave whenever. The drama will continue without you.</small></form></section></main>;
  }

  const messages = game.messages.filter((message) => message.channel === channel);
  const votedThisRound = spectator.lastTwistRound === game.round;
  const visibleTwists = TWISTS.filter((twist) => game.phase === "vote" ? twist.id === "revote" : twist.id !== "revote");

  return <main className="spectator-page"><header className="spectator-header"><Logo compact /><div className="spectator-room"><span className="live-pill"><i /> LIVE</span><span>ROOM {code}</span></div><div><span><Eye size={14} />{game.spectatorCount} watching</span><strong>@{spectator.name}</strong></div></header><div className="spectator-layout"><aside className="spectator-cast"><div className="panel-heading"><span>IN THE HOUSE</span><small>{game.phase === "results" ? "SEASON OVER" : `ROUND ${game.round}`}</small></div>{game.contestants.map((person) => <article key={person.id} className={person.eliminated ? "eliminated" : ""}><Avatar name={person.name} color={person.color} avatar={person.avatar} size={45} /><div><strong>{person.name}</strong><small>{person.eliminated ? "Eliminated" : person.archetype}</small><i><b style={{ width: `${person.popularity}%`, background: person.color }} /></i></div><span><Heart size={10} />{person.popularity}</span></article>)}</aside><section className="spectator-feed"><div className="channel-tabs">{tabs.map((tab) => <button key={tab.id} className={channel === tab.id ? "active" : ""} onClick={() => setChannel(tab.id)}>{tab.label}</button>)}</div><div className="feed-title"><div><span className="live-dot" />{channel === "house" ? "PUBLIC HOUSE CHANNEL" : channel === "alliance" ? "PRIVATE MESSAGES THE HOUSE DID NOT WANT YOU TO SEE" : "TALK TO THE ROOM"}</div></div><div className="message-feed">{messages.map((message) => <FeedMessage key={message.id} message={message} game={game} />)}<div ref={feedEnd} /></div><form className="spectator-chat-input" onSubmit={sendChat}><span>@{spectator.name}</span><input value={chat} maxLength={140} onChange={(event) => setChat(event.target.value)} placeholder="React to the chaos…" /><button disabled={!chat.trim() || busy}><Send size={16} /></button></form></section><aside className="spectator-controls"><div className="producer-heading"><div><span>AUDIENCE CONTROL</span><small>ONE TWIST PER ROUND</small></div><Zap size={19} /></div><div className="audience-power"><span>{votedThisRound ? "POWER USED" : "POWER AVAILABLE"}</span><i className={votedThisRound ? "used" : ""} /></div><p>{game.phase === "results" ? "The season has ended. The receipts remain." : votedThisRound ? "You already interfered this round. Enjoy the consequences." : "Choose carefully. Your twist goes live immediately."}</p><div className="spectator-twists">{visibleTwists.map((twist) => {
    const Icon = twistIcons[twist.id];
    const used = game.twistsUsed.includes(twist.id);
    return <button key={twist.id} disabled={used || votedThisRound || busy || game.phase === "results"} className={used ? "used" : ""} onClick={() => action("spectatorTwist", { twist: twist.id as TwistId })}><Icon size={19} /><span><strong>{twist.name}</strong><small>{used ? "Already unleashed" : twist.description}</small></span></button>;
  })}</div>{game.phase === "vote" && <div className="house-pulse"><div className="pulse-heading"><span><Activity size={15} /> HOUSE PULSE</span><strong><Trophy size={12} /> {spectator.fanPoints} PTS</strong></div><h3>{game.round === 3 ? "Predict the winner" : "Predict who leaves"}</h3><p>One call per round. 100 points if you are right, 25 for playing.</p><div className="pulse-options">{game.contestants.filter((person) => !person.eliminated).map((person) => {
  const count = game.predictionTally[person.id] || 0;
  const percentage = game.predictionTotal ? Math.round(count / game.predictionTotal * 100) : 0;
  const selected = spectator.predictions?.[String(game.round)] === person.id;
  return <button key={person.id} disabled={Boolean(spectator.predictions?.[String(game.round)]) || busy} className={selected ? "selected" : ""} onClick={() => action("spectatorPredict", { targetId: person.id })}><Avatar name={person.name} color={person.color} avatar={person.avatar} size={28} /><span><strong>{person.name}</strong><i><b style={{ width: `${percentage}%`, background: person.color }} /></i></span><em>{selected ? "YOUR CALL" : game.predictionTotal ? `${percentage}%` : "—"}</em></button>;
})}</div><small>{game.predictionTotal ? `${game.predictionTotal} prediction${game.predictionTotal === 1 ? "" : "s"} locked` : "Be the first oracle. Your choice stays anonymous."}</small></div>}{game.phase === "vote" && <div className="spectator-vote-notice"><Radio size={15} />Producers are voting. A revote can clear the ballots.</div>}{game.phase === "results" && <><div className="spectator-winner"><span>WINNER</span><strong>{game.contestants.find((person) => person.id === game.winnerId)?.name}</strong></div><div className="oracle-result"><Trophy size={16} /><span><strong>{spectator.fanPoints} Oracle points</strong><small>Your audience prediction score</small></span></div>{game.nextRoomCode && <a className="button button-primary next-season-link" href={`/spectate/${game.nextRoomCode}`}>Join the rematch <RotateCcw size={15} /></a>}</>}<div className="audience-rules"><span>AUDIENCE RULES</span><p>Be chaotic, not cruel. No hate speech, personal information, or spoilers from the producer.</p></div></aside></div></main>;
}

export default function SpectatePage() {
  return <Suspense fallback={<main className="spectator-join"><nav><Logo /></nav><section><div className="spectator-join-copy"><div className="eyebrow">FINDING THE LIVE HOUSE…</div></div></section></main>}><SpectatorRoom /></Suspense>;
}
