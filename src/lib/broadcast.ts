// Lets server actions push an event into a room's live connections.
//
// Fire-and-forget on purpose: if the realtime server is down, the database
// write has already succeeded and players can still refresh. A broken socket
// should never break the actual action.

const SOCKET_HTTP =
  process.env.SOCKET_HTTP_URL ?? "http://localhost:4000";
const SECRET = process.env.SOCKET_SECRET ?? "dev-secret";

export async function broadcast(
  roomCode: string,
  event: string,
  payload?: unknown,
) {
  try {
    await fetch(`${SOCKET_HTTP}/broadcast`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-champion-secret": SECRET,
      },
      body: JSON.stringify({ roomCode, event, payload }),
      cache: "no-store",
    });
  } catch {
    // Realtime is a nice-to-have. Never let it throw.
  }
}
