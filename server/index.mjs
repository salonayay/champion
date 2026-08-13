// CHAMPION realtime server -- run with: npm run dev:socket
//
// This is a SEPARATE process from Next.js, and it has to be. A normal web
// request is ask-receive-disconnect. Watching someone type needs a connection
// that stays open for the whole match -- a WebSocket. Serverless platforms
// can't hold one open, so this runs on its own.
//
// It holds no database. Everything here is ephemeral: if it restarts, players
// reconnect and carry on. The database stays the source of truth.

import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.SOCKET_PORT || 4000;
const ORIGIN = process.env.SOCKET_ORIGIN || "http://localhost:3000";

const SECRET = process.env.SOCKET_SECRET || "dev-secret";

// A tiny HTTP endpoint so the Next.js server can push events into a room.
//
// Server actions have no socket connection -- they run per-request and die. So
// when the host picks a problem, the action POSTs here and we broadcast it to
// everyone. The shared secret stops anyone on the internet doing the same.
const httpServer = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/broadcast") {
    if (req.headers["x-champion-secret"] !== SECRET) {
      res.writeHead(401);
      return res.end("unauthorised");
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { roomCode, event, payload } = JSON.parse(body || "{}");
        if (roomCode && event) {
          if (event === "newRound") {
            codeState.delete(roomCode);
            attemptState.delete(roomCode);
          }
          io.to(roomCode).emit(event, payload ?? {});
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end("bad json");
      }
    });
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end("CHAMPION realtime server\n");
});

const io = new Server(httpServer, {
  cors: { origin: ORIGIN, methods: ["GET", "POST"] },
});

const rooms = new Map();        // roomCode -> Map(socketId -> player)
const codeState = new Map();    // roomCode -> Map(userId -> {code, language})
const attemptState = new Map(); // roomCode -> Map(userId -> attempt)

function playersIn(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];
  const byUser = new Map();
  for (const player of room.values()) byUser.set(player.userId, player);
  return [...byUser.values()];
}

function broadcastPresence(roomCode) {
  io.to(roomCode).emit("presence", playersIn(roomCode));
}

io.on("connection", (socket) => {
  let joinedRoom = null;
  let me = null;

  socket.on("join", (payload) => {
    const { roomCode, userId, username, image, seat } = payload ?? {};
    if (!roomCode || !userId) return;

    joinedRoom = roomCode;
    me = { userId, username: username ?? null, image: image ?? null, seat };

    socket.join(roomCode);
    if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
    rooms.get(roomCode).set(socket.id, me);

    // Catch the newcomer up on what everyone has typed so far.
    const codes = codeState.get(roomCode);
    if (codes) {
      for (const [uid, entry] of codes.entries()) {
        if (uid !== userId) socket.emit("code", { userId: uid, ...entry });
      }
    }

    const attempts = attemptState.get(roomCode);
    if (attempts) {
      for (const [uid, entry] of attempts.entries()) {
        socket.emit("attempt", { userId: uid, ...entry });
      }
    }

    broadcastPresence(roomCode);
    console.log(`[join] ${username ?? userId} -> ${roomCode}`);
  });

  socket.on("code", (payload) => {
    if (!joinedRoom || !me) return;
    const { code, language } = payload ?? {};
    if (typeof code !== "string") return;

    const trimmed = code.slice(0, 100000);

    if (!codeState.has(joinedRoom)) codeState.set(joinedRoom, new Map());
    codeState.get(joinedRoom).set(me.userId, { code: trimmed, language });

    // socket.to(room) sends to everyone EXCEPT this socket -- you don't want
    // your own keystrokes echoed back at you.
    socket.to(joinedRoom).emit("code", {
      userId: me.userId,
      code: trimmed,
      language,
    });
  });

  socket.on("attempt", (payload) => {
    if (!joinedRoom || !me) return;
    const entry = {
      kind: payload?.kind ?? "RUN",
      verdict: payload?.verdict ?? "PENDING",
      passedCount: payload?.passedCount ?? 0,
      totalCount: payload?.totalCount ?? 0,
      attemptNumber: payload?.attemptNumber ?? 1,
    };
    if (!attemptState.has(joinedRoom)) attemptState.set(joinedRoom, new Map());
    attemptState.get(joinedRoom).set(me.userId, entry);
    io.to(joinedRoom).emit("attempt", { userId: me.userId, ...entry });
  });

  socket.on("won", () => {
    if (!joinedRoom || !me) return;
    io.to(joinedRoom).emit("won", {
      userId: me.userId,
      username: me.username,
      at: Date.now(),
    });
  });

  socket.on("newRound", () => {
    if (!joinedRoom) return;
    codeState.delete(joinedRoom);
    attemptState.delete(joinedRoom);
    io.to(joinedRoom).emit("newRound");
  });

  socket.on("disconnect", () => {
    if (!joinedRoom) return;
    const room = rooms.get(joinedRoom);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(joinedRoom);
        codeState.delete(joinedRoom);
        attemptState.delete(joinedRoom);
      }
    }
    broadcastPresence(joinedRoom);
    console.log(`[leave] ${me?.username ?? socket.id} <- ${joinedRoom}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`CHAMPION realtime server on http://localhost:${PORT}`);
  console.log(`Accepting connections from ${ORIGIN}`);
});
