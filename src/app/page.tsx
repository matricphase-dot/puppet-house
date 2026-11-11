"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Casting } from "@/components/Casting";
import { GameRoom } from "@/components/GameRoom";
import { JoinParty } from "@/components/JoinParty";
import { Landing } from "@/components/Landing";
import { PartyLobby } from "@/components/PartyLobby";
import { Results } from "@/components/Results";
import { CastingInput, Game, GameMessage } from "@/game/types";
import { connectNexconn, publishHouseMessage, publishWhisper } from "@/lib/nexconn-client";

type Screen = "landing" | "casting" | "join" | "game";
type Flow = "solo" | "createParty" | "joinParty";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [flow, setFlow] = useState<Flow>("solo");
  const [partyCode, setPartyCode] = useState("");
  const [producerId, setProducerId] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [nexconn, setNexconn] = useState(false);
  const busyRef = useRef(false);
  const gameRef = useRef<Game | null>(null);
  const publishedMessages = useRef<Set<string>>(new Set());
  const publishedGameId = useRef("");

  const authorFor = useCallback((current: Game, message: GameMessage) => {
    return current.contestants.find((person) => person.id === message.senderId)?.name || "HOST";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const code = new URLSearchParams(window.location.search).get("party")?.toUpperCase();
      if (code?.length === 6) {
        setPartyCode(code);
        setFlow("joinParty");
        setScreen("casting");
        return;
      }
      const savedId = localStorage.getItem("puppet-house-game");
      const savedProducer = localStorage.getItem("puppet-house-producer") || "";
      if (!savedId || !savedProducer) return;
      fetch(`/api/game?id=${encodeURIComponent(savedId)}&producerId=${encodeURIComponent(savedProducer)}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("No saved season");
          const data = await response.json();
          setProducerId(savedProducer);
          setGame(data.game);
          setScreen("game");
        })
        .catch(() => {
          localStorage.removeItem("puppet-house-game");
          localStorage.removeItem("puppet-house-producer");
        });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const startSeason = async (input: CastingInput) => {
    setStarting(true);
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: flow === "solo" ? "create" : flow, input, code: partyCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProducerId(data.producerId);
      setGame(data.game);
      setScreen("game");
      localStorage.setItem("puppet-house-game", data.game.id);
      localStorage.setItem("puppet-house-producer", data.producerId);
      window.history.replaceState({}, "", "/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not start the season.");
    } finally {
      setStarting(false);
    }
  };

  const action = useCallback(async (name: string, payload: Record<string, unknown> = {}) => {
    if (!game || !producerId || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, gameId: game.id, producerId, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const next = data.game as Game;
      setGame(next);
      if (name === "rematch") {
        localStorage.setItem("puppet-house-game", next.id);
        setAutoPlay(true);
      }
      if (name === "whisper") void publishWhisper(String(payload.text || "")).catch(() => undefined);
    } catch (error) {
      console.error(error);
      setAutoPlay(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [game, producerId]);

  useEffect(() => { gameRef.current = game; }, [game]);

  const syncGame = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !producerId || busyRef.current) return;
    try {
      const response = await fetch(`/api/game?id=${encodeURIComponent(current.id)}&producerId=${encodeURIComponent(producerId)}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const latest = gameRef.current;
      if (data.game.nextGameId && data.game.nextGameId !== current.id) {
        const nextResponse = await fetch(`/api/game?id=${encodeURIComponent(data.game.nextGameId)}&producerId=${encodeURIComponent(producerId)}`, { cache: "no-store" });
        if (nextResponse.ok) {
          const nextData = await nextResponse.json();
          localStorage.setItem("puppet-house-game", nextData.game.id);
          setAutoPlay(true);
          setGame(nextData.game);
          return;
        }
      }
      if (latest && data.game.updatedAt > latest.updatedAt && !busyRef.current) setGame(data.game);
    } catch { /* polling retries automatically */ }
  }, [producerId]);

  useEffect(() => {
    if (!game || game.phase === "lobby") return;
    connectNexconn(game.id, producerId, game.isHost, () => { void syncGame(); }).then(setNexconn);
  }, [game, producerId, syncGame]);

  useEffect(() => {
    if (!game || !nexconn || !game.isHost) return;
    if (publishedGameId.current !== game.id) {
      publishedGameId.current = game.id;
      publishedMessages.current = new Set();
    }
    game.messages.filter((message) => message.channel === "house" && !publishedMessages.current.has(message.id)).forEach((message) => {
      publishedMessages.current.add(message.id);
      void publishHouseMessage(authorFor(game, message), message.text).catch(() => undefined);
    });
  }, [game, nexconn, authorFor]);

  useEffect(() => {
    if (screen !== "game" || !game || !producerId) return;
    const timer = window.setInterval(() => { void syncGame(); }, game.phase === "results" ? 2000 : nexconn ? 5000 : 1500);
    return () => window.clearInterval(timer);
  }, [screen, game, producerId, syncGame, nexconn]);

  useEffect(() => {
    if (screen !== "game" || !game || !game.isHost || game.phase !== "live" || !autoPlay) return;
    const timer = window.setTimeout(() => action("tick"), 2600);
    return () => window.clearTimeout(timer);
  }, [screen, game, autoPlay, action]);

  const newSeason = () => {
    localStorage.removeItem("puppet-house-game");
    localStorage.removeItem("puppet-house-producer");
    setGame(null);
    setProducerId("");
    setFlow("solo");
    setAutoPlay(true);
    setScreen("casting");
  };

  if (screen === "landing") return <Landing
    onStart={() => { setFlow("solo"); setScreen("casting"); }}
    onParty={() => { setFlow("createParty"); setScreen("casting"); }}
    onJoin={() => setScreen("join")}
  />;
  if (screen === "join") return <JoinParty onBack={() => setScreen("landing")} onContinue={(code) => { setPartyCode(code); setFlow("joinParty"); setScreen("casting"); }} />;
  if (screen === "casting" || !game) return <Casting flow={flow} onBack={() => setScreen("landing")} onStart={startSeason} busy={starting} />;
  if (game.phase === "lobby") return <PartyLobby game={game} busy={busy} onStart={() => action("startParty")} onNewSeason={newSeason} />;
  if (game.phase === "results") return <Results game={game} busy={busy} onRestart={newSeason} onRematch={() => action("rematch")} />;
  return <GameRoom game={game} busy={busy} autoPlay={autoPlay} nexconn={nexconn} onAutoPlay={setAutoPlay} onAction={action} onNewSeason={newSeason} />;
}
