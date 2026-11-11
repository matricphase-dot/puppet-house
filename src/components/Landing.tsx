"use client";

import { ArrowRight, Eye, MessageSquareText, Radio, Sparkles } from "lucide-react";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

export function Landing({ onStart, onParty, onJoin }: { onStart: () => void; onParty: () => void; onJoin: () => void }) {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Logo />
        <div className="nav-meta"><span className="live-pill"><i /> LIVE GAME</span><span>SEASON 01</span></div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> A REALITY SHOW WITH NO REAL CONTESTANTS</div>
          <h1>Pull the strings.<br /><em>Lose control.</em></h1>
          <p className="hero-description">Create an AI contestant. Give it a secret agenda. Watch it lie, bond and betray—while you try to steer the chaos with just <strong>three whispers.</strong></p>
          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={onStart}>Play solo <ArrowRight size={20} /></button>
            <button className="button button-party button-large" onClick={onParty}>Create party room</button>
          </div>
          <div className="hero-secondary"><span className="solo-note"><span className="avatar-stack"><Avatar name="Riya" color="#f4c95d" avatar={1} size={30} /><Avatar name="Arjun" color="#82b4ff" avatar={2} size={30} /><Avatar name="Zoya" color="#c7a0f8" avatar={3} size={30} /></span> 1–4 producers · 5 minute seasons</span><button onClick={onJoin}>Have a code? Join a party <ArrowRight size={13} /></button></div>
        </div>

        <div className="hero-showcase" aria-label="Live game preview">
          <div className="showcase-glow" />
          <div className="preview-window">
            <div className="preview-top"><span><Radio size={14} /> THE HOUSE</span><span className="viewer-count"><Eye size={14} /> 1,247</span></div>
            <div className="preview-stage">
              <div className="stage-light stage-light-one" /><div className="stage-light stage-light-two" />
              <div className="preview-contestants">
                <div className="preview-person person-one"><Avatar name="Riya" color="#f4c95d" avatar={1} size={92} /><span>RIYA</span></div>
                <div className="preview-person person-two"><Avatar name="Arjun" color="#82b4ff" avatar={2} size={106} /><span>ARJUN</span></div>
                <div className="preview-person person-three"><Avatar name="Zoya" color="#c7a0f8" avatar={3} size={88} /><span>ZOYA</span></div>
              </div>
            </div>
            <div className="preview-chat">
              <div className="preview-message"><Avatar name="Zoya" color="#c7a0f8" avatar={3} size={30} /><p><strong>ZOYA</strong>I trust Riya. Today. For the next eleven minutes.</p></div>
              <div className="preview-message"><Avatar name="Arjun" color="#82b4ff" avatar={2} size={30} /><p><strong>ARJUN</strong>Interesting. She answered without answering.</p></div>
              <div className="preview-typing"><i /><i /><i /> Riya is choosing her next move</div>
            </div>
            <div className="floating-twist"><Radio size={17} /><span><small>AUDIENCE TWIST</small>MEMORY LEAK</span></div>
          </div>
          <div className="whisper-note"><MessageSquareText size={18} /><span><small>PRIVATE WHISPER · 1 OF 3</small>“Get close to Riya. Then betray her.”</span></div>
        </div>
      </section>

      <section className="mechanics-strip">
        <article><span>01</span><div><h3>YOU WRITE THE CHARACTER</h3><p>Personality, public persona, hidden secret. The rest is out of your hands.</p></div></article>
        <article><span>02</span><div><h3>THEY WRITE THE DRAMA</h3><p>Autonomous contestants chat, scheme, form alliances and vote in real time.</p></div></article>
        <article><span>03</span><div><h3>THE AUDIENCE HAS TEETH</h3><p>Leak secrets. Expose alliances. Force revotes. Nobody gets a quiet season.</p></div></article>
      </section>
      <footer className="landing-footer"><span>BUILT FOR THE NEXCONN BUILD CHALLENGE</span><span>NO SCRIPTS. NO SAFE CHOICES.</span></footer>
    </main>
  );
}
