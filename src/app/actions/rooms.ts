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

export async function createRoom(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You need to sign in first." };
  }

  const userId = session.user.id;

  // Clamp everything the form sends. Never trust a number from a browser --
  // anyone can edit the HTML and post whatever they like.
  const totalRounds = Math.min(10, Math.max(1, Number(formData.get("totalRounds")) || 3));
  const maxSeats = Math.min(5, Math.max(2, Number(formData.get("maxSeats")) || 5));

  // `as const` keeps these as literal types rather than widening to `string`,
  // which is what Prisma needs for an enum column.
  const rawDifficulty = String(formData.get("difficulty") ?? "");
  const difficulty =
    rawDifficulty === "EASY"
      ? ("EASY" as const)
      : rawDifficulty === "MEDIUM"
        ? ("MEDIUM" as const)
        : rawDifficulty === "HARD"
          ? ("HARD" as const)
          : null;

  // The form sends date, hour (1-12), minute and AM/PM separately, because a
  // native datetime picker shows 24-hour time on most systems.
  const rawDate = String(formData.get("startDate") ?? "").trim();
  const rawHour = Number(formData.get("startHour"));
  const rawMinute = Number(formData.get("startMinute"));
  const meridiem = String(formData.get("startMeridiem") ?? "AM");

  let scheduledFor: Date | null = null;

  if (rawDate && rawHour >= 1 && rawHour <= 12) {
    // 12-hour to 24-hour. The quirk is 12 itself: 12 AM is hour 0, 12 PM is
    // hour 12. The modulo handles both -- 12 % 12 is 0, then PM adds 12.
    const hour24 = (rawHour % 12) + (meridiem === "PM" ? 12 : 0);
    const minute = rawMinute >= 0 && rawMinute <= 59 ? rawMinute : 0;

    const [y, m, d] = rawDate.split("-").map(Number);
    const parsed = new Date(y, m - 1, d, hour24, minute, 0, 0);

    if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      scheduledFor = parsed;
    }
  }

  let code = "";
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

  await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({
      data: { code, hostId: userId, totalRounds, maxSeats, difficulty, scheduledFor },
    });
    await tx.roomMember.create({
      data: { roomId: room.id, userId, seat: 0 },
    });
  });

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
