"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

export type Peer = {
  userId: string;
  username: string | null;
  image: string | null;
  seat: number;
};

export type LiveAttempt = {
  kind: string;
  verdict: string;
  passedCount: number | null;
  totalCount: number | null;
  attemptNumber: number;
};

type Options = {
  roomCode: string;
  userId: string;
  username: string | null;
  image: string | null;
  seat: number;
};

type LiveCodeMap = Record<string, { code: string; language: string }>;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export function useRoomSocket(opts: Options) {
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [liveCode, setLiveCode] = useState<LiveCodeMap>({});
  const [liveAttempts, setLiveAttempts] = useState<Record<string, LiveAttempt>>({});
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", {
        roomCode: opts.roomCode,
        userId: opts.userId,
        username: opts.username,
        image: opts.image,
        seat: opts.seat,
      });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("presence", (list: Peer[]) => setPeers(list));

    socket.on("code", (msg: { userId: string; code: string; language: string }) => {
      setLiveCode((prev) => ({
        ...prev,
        [msg.userId]: { code: msg.code, language: msg.language },
      }));
    });

    socket.on("attempt", (msg: { userId: string } & LiveAttempt) => {
      const { userId, ...rest } = msg;
      setLiveAttempts((prev) => ({ ...prev, [userId]: rest }));
    });

    socket.on("won", (msg: { username: string | null }) => setWinner(msg.username));

    socket.on("newRound", () => window.location.reload());

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [opts.roomCode, opts.userId, opts.username, opts.image, opts.seat]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publishCode = useCallback((code: string, language: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socketRef.current?.emit("code", { code, language });
    }, 200);
  }, []);

  const publishAttempt = useCallback((attempt: LiveAttempt) => {
    socketRef.current?.emit("attempt", attempt);
  }, []);

  const publishWin = useCallback(() => {
    socketRef.current?.emit("won", {});
  }, []);

  return {
    connected,
    peers,
    liveCode,
    liveAttempts,
    winner,
    publishCode,
    publishAttempt,
    publishWin,
  };
}
