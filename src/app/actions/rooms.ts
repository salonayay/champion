"use server";

// "use server" at the top means EVERY function in this file runs on the server,
// never in the browser. That matters: these functions touch the database and
// trust the logged-in session. If this code ran in the browser, anyone could
// call it with made-up arguments.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/roomCode";

// The shape every action returns when something goes wrong. Returning an error
// object is better than throwing, because the form can display the message.
export type ActionResult = { error: string } | undefined;

// ---------------------------------------------------------------------------
// Create a room
// ---------------------------------------------------------------------------

export async function createRoom(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You need to sign in first." };
  }

  const userId = session.user.id;
  let code = "";

  // Try up to 5 times to find an unused code. A collision is extremely
  // unlikely, but the database would reject a duplicate, so we handle it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRoomCode();
    const taken = await prisma.room.findUnique({ where: { code: candidate } });
    if (!taken) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return { error: "Couldn't generate a room code. Try again." };
  }

  // A transaction: both writes succeed, or neither does.
  //
  // Without this, the room could be created and then the host's membership
  // could fail — leaving a room nobody is in, including its own creator.
  // $transaction makes the pair atomic.
 await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({ data: { code, hostId: userId } });
    await tx.roomMember.create({
      data: { roomId: room.id, userId, seat: 0 },
    });
  });

  // redirect() throws internally to stop execution, so nothing after it runs.
  // That's why it sits outside the try/catch pattern you might expect.
  redirect(`/room/${code}`);
}

// ---------------------------------------------------------------------------
// Join an existing room
// ---------------------------------------------------------------------------

export async function joinRoom(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You need to sign in first." };
  }

  const userId = session.user.id;

  // Never trust form input. Uppercase it so "k7q2xm" works, trim whitespace
  // from sloppy pasting, and check the length before hitting the database.
  const raw = formData.get("code");
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";

  if (code.length !== 6) {
    return { error: "Room codes are 6 characters." };
  }

  const result = await addMemberToRoom(code, userId);
  if (result) return result; // an error came back

  redirect(`/room/${code}`);
}

// Shared by the join form and the Join button on the room page itself.
export async function addMemberToRoom(
  code: string,
  userId: string,
): Promise<ActionResult> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { members: true },
  });

  if (!room) {
    return { error: "No room with that code." };
  }

  if (room.status === "CLOSED") {
    return { error: "That room has closed." };
  }

  // Already in? Not an error — just let them back in. This happens constantly
  // when someone refreshes or reopens the link.
  if (room.members.some((m) => m.userId === userId)) {
    return undefined;
  }

  if (room.members.length >= room.maxSeats) {
    return { error: "That room is full." };
  }

  // Find the lowest unoccupied seat. If someone left seat 1, the next person
  // fills that gap rather than being pushed to seat 3.
  const taken = new Set(room.members.map((m) => m.seat));
  const seat = Array.from({ length: room.maxSeats }, (_, i) => i).find(
    (s) => !taken.has(s),
  );

  if (seat === undefined) {
    return { error: "That room is full." };
  }

  try {
    await prisma.roomMember.create({
      data: { roomId: room.id, userId, seat },
    });
  } catch (e) {
    // P2002 is Prisma's code for "unique constraint violated".
    //
    // This is the race condition made real. Two people click Join at the same
    // moment, both read the members list before either write lands, and both
    // pick the same free seat. The database rejects the second one — which is
    // exactly what @@unique([roomId, seat]) is for.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Someone just took that seat. Try again." };
    }
    throw e;
  }

  // Tells Next.js the room page's data changed, so it re-renders instead of
  // serving a cached version.
  revalidatePath(`/room/${code}`);
  return undefined;
}

// ---------------------------------------------------------------------------
// Leave a room
// ---------------------------------------------------------------------------

export async function leaveRoom(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const code = String(formData.get("code") ?? "");

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) return { error: "No room with that code." };

  // deleteMany rather than delete, because delete throws if no row matches.
  // If they somehow already left, we don't want an error page.
  await prisma.roomMember.deleteMany({
    where: { roomId: room.id, userId: session.user.id },
  });

  // If the host left and nobody remains, close the room rather than leaving an
  // empty one lying around forever.
  const remaining = await prisma.roomMember.count({
    where: { roomId: room.id },
  });

  if (remaining === 0) {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: "CLOSED" },
    });
  }

  redirect("/");
}
