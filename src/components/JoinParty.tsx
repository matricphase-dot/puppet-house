"use client";

import { ArrowLeft, ArrowRight, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Logo } from "./Logo";

export function JoinParty({ initialCode = "", onBack, onContinue }: { initialCode?: string; onBack: () => void; onContinue: (code: string) => void }) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (code.length === 6) onContinue(code);
  };
  return <main className="join-party"><nav><button className="icon-button" onClick={onBack}><ArrowLeft size={19} /></button><Logo compact /></nav><section><div className="join-party-icon"><UsersRound size={34} /></div><div className="eyebrow">A SEAT IN THE HOUSE IS WAITING</div><h1>Join the party.</h1><p>Enter the host’s six-character code. You will create your own contestant next.</p><form onSubmit={submit}><label>PARTY CODE</label><input autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="E.G. X7K2P9" maxLength={6} /><button className="button button-primary" disabled={code.length !== 6}>Create your contestant <ArrowRight size={18} /></button></form><small>Party codes are public. Your private producer identity is created when you join.</small></section></main>;
}
