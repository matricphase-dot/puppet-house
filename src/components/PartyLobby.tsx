"use client";

import { ArrowRight, Check, Copy, Eye, LockKeyhole, Radio, RotateCcw, Sparkles, UsersRound } from "lucide-react";
import { useState } from "react";
import { Game } from "@/game/types";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

export function PartyLobby({ game, busy, onStart, onNewSeason }: { game: Game; busy: boolean; onStart: () => void; onNewSeason: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?party=${game.roomCode}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* embedded preview clipboard */ }
  };
  const slots = Array.from({ length: 4 }, (_, index) => game.contestants[index]);

  return <main className="party-lobby"><nav><Logo /><span><UsersRound size={15} /> PARTY ROOM</span></nav><div className="party-lobby-layout"><section className="party-lobby-main"><div className="eyebrow"><Sparkles size={14} /> YOUR FRIENDS. THEIR PUPPETS. NO SAFE ALLIANCES.</div><h1>Assemble the<br /><em>chaos crew.</em></h1><p>Up to four producers. One autonomous contestant each. Empty seats are filled by the house.</p><div className="party-code-card"><div><span>PARTY CODE</span><strong>{game.roomCode}</strong><small>Friends can join before the host starts.</small></div><button onClick={copy}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Copied" : "Copy invite"}</button></div><div className="party-slots">{slots.map((person, index) => <article key={person?.id || `empty-${index}`} className={`party-slot ${person ? "filled" : ""} ${person?.isPlayer ? "yours" : ""}`}>{person ? <><div className="slot-number">0{index + 1}</div><Avatar name={person.name} color={person.color} avatar={person.avatar} size={74} /><div className="slot-person"><strong>{person.name}</strong><span>{person.archetype}</span><small>{person.isPlayer ? "YOUR PUPPET" : "HUMAN PRODUCER"}</small></div><LockKeyhole size={16} /></> : <><div className="slot-number">0{index + 1}</div><div className="empty-avatar"><UsersRound size={26} /></div><div className="slot-person"><strong>Open seat</strong><span>Join with the party code</span><small>AI FILLS ON START</small></div></>}</article>)}</div><div className="party-start-area">{game.isHost ? <><button className="button button-primary button-large" disabled={busy} onClick={onStart}>{busy ? "Opening the house…" : "Start the party season"}<ArrowRight size={19} /></button><p>{4 - game.contestants.length} empty seat{4 - game.contestants.length === 1 ? "" : "s"} will be filled by AI contestants.</p></> : <><div className="waiting-host"><i /><span>YOU ARE IN. WAITING FOR THE HOST TO START.</span></div><p>Your private mission is locked. Keep this tab open.</p></>}</div></section><aside className="party-rules"><div><Eye size={21} /><span><strong>Your game. Your secrets.</strong><small>Every producer gets a private console, three whispers and one ballot per vote.</small></span></div><div><Radio size={21} /><span><strong>The audience is separate.</strong><small>Share the spectator link only after the season starts if you want extra interference.</small></span></div><div><LockKeyhole size={21} /><span><strong>Do not share your producer link.</strong><small>Your saved identity authorizes your private actions on this device.</small></span></div><button className="text-button" onClick={onNewSeason}><RotateCcw size={14} /> Leave this party</button></aside></div></main>;
}
