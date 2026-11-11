"use client";

type NexconnSession = {
  gameId: string;
  producerId: string;
  onSync: () => void;
  houseSend: (text: string) => Promise<unknown>;
  directSend: (text: string) => Promise<unknown>;
};

let session: NexconnSession | null = null;
let connecting: Promise<NexconnSession | null> | null = null;
let initialized = false;

export async function connectNexconn(gameId: string, producerId: string, isHost: boolean, onSync: () => void): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_NEXCONN_APP_KEY || !producerId) return false;
  if (session?.gameId === gameId && session.producerId === producerId) {
    session.onSync = onSync;
    return true;
  }
  if (connecting) return Boolean(await connecting);

  connecting = (async () => {
    try {
      const response = await fetch("/api/nexconn/token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producerId, gameId }),
      });
      if (!response.ok) return null;
      const auth = await response.json();
      const sdk = await import("@nexconn/chat");
      if (session) await sdk.NCEngine.disconnect();
      if (!initialized) {
        sdk.NCEngine.initialize({ appKey: process.env.NEXT_PUBLIC_NEXCONN_APP_KEY! });
        initialized = true;
      }
      const connection = await sdk.NCEngine.connect({ token: auth.token });
      if (!connection.isOk) throw new Error(connection.msg || "Nexconn connection failed");

      const groupId = `house-${gameId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
      const house = new sdk.GroupChannel(groupId);
      if (isHost) {
        const created = await sdk.GroupChannel.createGroup({ groupId, groupName: `Puppet House ${gameId}` });
        if (!created.isOk) {
          const joined = await house.join();
          if (!joined.isOk) throw new Error(joined.msg || "Could not join house channel");
        }
      } else {
        const joined = await house.join();
        if (!joined.isOk) throw new Error(joined.msg || "Could not join house channel");
      }
      const direct = new sdk.DirectChannel(auth.agentId);
      const current: NexconnSession = {
        gameId, producerId, onSync,
        houseSend: (text: string) => house.sendMessage(new sdk.SendTextMessageParams({ text })),
        directSend: (text: string) => direct.sendMessage(new sdk.SendTextMessageParams({ text })),
      };
      sdk.NCEngine.removeMessageHandler("puppet-house-live");
      sdk.NCEngine.addMessageHandler("puppet-house-live", new sdk.MessageHandler({
        onMessageReceived: ({ messages }) => {
          if (messages.some((message) => message.channelIdentifier.channelId === groupId)) {
            window.dispatchEvent(new CustomEvent("puppet-house:nexconn-received", { detail: { count: messages.length } }));
            current.onSync();
          }
        },
      }));
      session = current;
      return session;
    } catch (error) {
      console.warn("Nexconn unavailable; continuing with authoritative polling.", error);
      return null;
    } finally { connecting = null; }
  })();
  return Boolean(await connecting);
}

export async function publishHouseMessage(author: string, text: string) {
  if (!session) return;
  const result = await session.houseSend(`${author}: ${text}`.slice(0, 500));
  if (result && typeof result === "object" && "isOk" in result && !result.isOk) throw new Error("Nexconn house message failed");
  window.dispatchEvent(new CustomEvent("puppet-house:nexconn-delivery", { detail: { type: "house" } }));
}

export async function publishWhisper(text: string) {
  if (!session) return;
  const result = await session.directSend(text.slice(0, 180));
  if (result && typeof result === "object" && "isOk" in result && !result.isOk) throw new Error("Nexconn whisper failed");
  window.dispatchEvent(new CustomEvent("puppet-house:nexconn-delivery", { detail: { type: "whisper" } }));
}
