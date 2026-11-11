"use client";

import { ArrowLeft, ArrowRight, Check, Dices, Heart, LockKeyhole, Vote, Zap } from "lucide-react";
import { useState } from "react";
import { NAMES, OBJECTIVES, OPPONENTS, PLAYER_OBJECTIVES, TAGLINES } from "@/game/data";
import { Archetype, CastingInput, ObjectiveId } from "@/game/types";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

const archetypes: { id: Archetype; name: string; description: string }[] = [
  { id: "charmer", name: "The charmer", description: "Loved by everyone. Trusted by no one." },
  { id: "strategist", name: "The strategist", description: "Reads the room. Then rearranges it." },
  { id: "chaos", name: "The wildcard", description: "Unpredictable, unbothered, unforgettable." },
  { id: "innocent", name: "The innocent", description: "Honest face. Dangerous potential." },
];
const icons = { "fan-favorite": Heart, "secret-keeper": LockKeyhole, "majority-puppet": Vote, "chaos-survivor": Zap };

export function Casting({ onBack, onStart, busy, flow = "solo" }: { onBack: () => void; onStart: (input: CastingInput) => void; busy: boolean; flow?: "solo" | "createParty" | "joinParty" }) {
  const [form, setForm] = useState<CastingInput>({
    name: "Maya",
    archetype: "strategist",
    tagline: TAGLINES[1],
    secret: "I have been pretending to know everyone, but I have never met any of them before.",
    objectiveId: "secret-keeper",
  });
  const update = <K extends keyof CastingInput>(key: K, value: CastingInput[K]) => setForm((old) => ({ ...old, [key]: value }));
  const randomize = () => setForm((old) => ({
    ...old,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    archetype: archetypes[Math.floor(Math.random() * archetypes.length)].id,
    tagline: TAGLINES[Math.floor(Math.random() * TAGLINES.length)],
  }));
  const selectedObjective = OBJECTIVES.find((item) => item.id === form.objectiveId)!;

  return (
    <main className="casting-page">
      <nav className="casting-nav"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button><Logo compact /><span className="casting-step">CASTING CALL · 01/01</span></nav>
      <div className="casting-layout">
        <section className="casting-form-section">
          <div className="eyebrow">YOUR CONTESTANT. YOUR PROBLEM.</div>
          <h1>Create a<br /><em>beautiful liar.</em></h1>
          <p className="section-intro">Give them enough personality to cause trouble. They will handle the rest.</p>
          <div className="form-grid">
            <label className="field"><span>CONTESTANT NAME</span><div className="input-with-action"><input value={form.name} maxLength={18} onChange={(e) => update("name", e.target.value)} /><button onClick={randomize} aria-label="Randomize character"><Dices size={18} /></button></div></label>
            <label className="field"><span>PUBLIC PERSONA</span><input value={form.tagline} maxLength={90} onChange={(e) => update("tagline", e.target.value)} /></label>
          </div>
          <fieldset className="field-set"><legend>PERSONALITY</legend><div className="archetype-grid">{archetypes.map((item) => <button key={item.id} className={`archetype-option ${form.archetype === item.id ? "selected" : ""}`} onClick={() => update("archetype", item.id)}><span>{item.name}</span><small>{item.description}</small>{form.archetype === item.id && <Check size={16} />}</button>)}</div></fieldset>
          <label className="field secret-field"><span>THE SECRET THEY MUST PROTECT</span><textarea value={form.secret} maxLength={180} onChange={(e) => update("secret", e.target.value)} rows={2} /><small>Only you and your contestant know this. Unless the audience leaks it.</small></label>
          <fieldset className="field-set"><legend>CHOOSE YOUR SECRET MISSION</legend><div className="objective-grid">{PLAYER_OBJECTIVES.map((id: ObjectiveId) => {
            const item = OBJECTIVES.find((objective) => objective.id === id)!;
            const Icon = icons[id as keyof typeof icons];
            return <button key={id} className={`objective-option ${form.objectiveId === id ? "selected" : ""}`} onClick={() => update("objectiveId", id)}><Icon size={19} /><div><strong>{item.name}</strong><span>{item.description}</span></div><i>{form.objectiveId === id && <Check size={13} />}</i></button>;
          })}</div></fieldset>
        </section>

        <aside className="casting-preview">
          <div className="preview-card-label">SEASON 01 · YOUR CAST</div>
          <div className="player-casting-card">
            <div className="casting-avatar-wrap"><Avatar name={form.name || "You"} color="#ff6b57" avatar={0} size={154} /><span className="your-puppet-label">YOUR PUPPET</span></div>
            <h2>{form.name || "Unnamed"}</h2><p>{form.tagline || "No public persona. Very mysterious."}</p>
            <div className="casting-personality">{archetypes.find((item) => item.id === form.archetype)?.name}</div>
            <div className="mini-mission"><LockKeyhole size={16} /><div><small>SECRET MISSION</small><strong>{selectedObjective.name}</strong></div></div>
          </div>
          <div className="rival-preview"><span>AGAINST</span>{OPPONENTS.map((person) => <div key={person.id}><Avatar name={person.name} color={person.color} avatar={person.avatar} size={42} /><p><strong>{person.name}</strong><small>{person.archetype}</small></p><LockKeyhole size={14} /></div>)}</div>
          <button className="button button-primary start-season" disabled={!form.name.trim() || !form.secret.trim() || busy} onClick={() => onStart(form)}>{busy ? "Opening the house…" : flow === "createParty" ? "Create party room" : flow === "joinParty" ? "Join the party" : "Start the season"}<ArrowRight size={19} /></button>
          <p className="start-caption">3 rounds · 3 whispers · 1 very bad decision at a time</p>
        </aside>
      </div>
    </main>
  );
}
